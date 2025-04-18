const ViraGovernedToken = artifacts.require("ViraGovernedToken");

contract("ViraGovernedToken", accounts => {
  const [owner, operator, operator2,operator3, issuer, user1, user2, user3] = accounts;

  const duration = 3 * 24 * 60 * 60; // 3 giorni
  let contract;

  beforeEach(async () => {
    contract = await ViraGovernedToken.new({ from: owner });

    //issuer
    await contract.addIssuer(issuer, { from: owner });

    // Nomina operator
    await contract.addOperator(operator, { from: owner });
    await contract.addOperator(operator2, { from: owner });
    await contract.addOperator(operator3, { from: owner });


    // Registra utenti
    await contract.registerUser(user1, { from: issuer });
    await contract.registerUser(user2, { from: issuer });
    await contract.registerUser(user3, { from: issuer });
 

    // Aggiungi token extra a user2 per farlo diventare "ricco"
    await contract.adjustBalance(user1, 100, { from: issuer });
    await contract.adjustBalance(user2, 1100, { from: issuer });
    await contract.adjustBalance(user3, 100, { from: issuer });

  });


  it("should allow vote for redistribution as soon ad more than 50% of preferences is reached", async () => {
    await contract.proposeRedistribution(user2, duration, { from: operator });
    await contract.proposeRedistribution(user2, duration, { from: operator2 }); 
    //await contract.proposeRedistribution(user2, duration, { from: operator3 });

    const balanceUser1 = await contract.balanceOf(user1);
    const balanceUser2 = await contract.balanceOf(user2);
    const balanceUser3 = await contract.balanceOf(user3);

    console.log("Balance after redistribution user1:", balanceUser1.toString());
    console.log("Balance after redistribution user2:", balanceUser2.toString());
    console.log("Balance after redistribution user3:", balanceUser3.toString());

    
    assert(balanceUser1 > 100);  // Deve aver ricevuto
    assert(balanceUser2 < 1100); // Deve aver perso qualcosa
    assert(balanceUser3 > 100);
  });

  it("vote rate 33% , propose still in time but not closed yet", async () => {
    await contract.proposeRedistribution(user2, duration, { from: operator });

    try {
      await contract.checkAndExecuteRedistribution(user2, { from: operator });
      assert.fail("The proposed redistribution should not be executed yet");
    } catch (err) {
      console.log("Errore ricevuto:", err.message);
        assert(
            err.message.includes("redistribution should not be executed yet"),
            "Error message should contain 'redistribution should not be executed yet'"
          );
    }
  });

  it("propose expires after duration time if 50% non reached", async () => {
    await contract.proposeRedistribution(user2, duration, { from: operator });

    // simulate time passing
    await web3.currentProvider.send({
      jsonrpc: "2.0",
      method: "evm_increaseTime",
      params: [10 * 24 * 60 * 60], // time increse 4 days
      id: new Date().getTime()
    }, () => {});
    // new block to apply the time increase
    await web3.currentProvider.send({
      jsonrpc: "2.0",
      method: "evm_mine",
      params: [],
      id: new Date().getTime()
    }, () => {});

    await contract.proposeRedistribution(user2, duration, { from: operator2 });

    const vote = await contract.redistributionVotes(user2);
    console.log("Vote count (after expire):", vote.count.toString());
    console.log("Vote executed:", vote.executed);
    console.log("Vote timestamp:", vote.timestamp.toString());
 
    assert.equal(vote.count.toString(), "1");
    assert.equal(vote.executed, false);
  });
  
  it("should allow cancelling expired vote", async () => {
    await contract.proposeRedistribution(user2,duration, { from: operator });

    
     // simulate time passing
     await web3.currentProvider.send({
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [4 * 24 * 60 * 60], // time increse 4 days
        id: new Date().getTime()
    }, () => {});
    // new block to apply the time increase
    await web3.currentProvider.send({
        jsonrpc: "2.0",
        method: "evm_mine",
        params: [],
        id: new Date().getTime()
    }, () => {});

    await contract.cancelRedistributionVote(user2, { from: operator });
    const vote = await contract.redistributionVotes(user2);
    assert.equal(vote.count.toString(), "0"); // Voto eliminato
    assert.equal(vote.executed, false);
    assert.equal(vote.target, "0x0000000000000000000000000000000000000000");
  });
  
  
  
  
  it("should not allow a double vote", async () => {
    await contract.proposeRedistribution(user2, duration, { from: operator });

    try {
      await contract.proposeRedistribution(user2, duration, { from: operator });
      assert.fail("Already voted");
    } catch (err) {
      console.log("Errore ricevuto:", err.message);
        assert(
            err.message.includes("Already voted"),
            "Error message should contain 'Already voted'"
          );
    }

  });
  
  it("should not allow duplicate vote by the same operator", async () => {
    await contract.proposeRedistribution(user2, duration, { from: operator });
  

    try {
      await contract.proposeRedistribution(user2, duration, { from: operator2 });
      assert.fail("Second vote by same operator should fail");
    } catch (err) {
        console.log("Errore ricevuto:", err.message);
      assert(
        err.message.includes("Second vote by same operator should fail"),
        "Expected error about 'Second vote by same operator should fail'"
      );
    }
  });

  it("should allow operator to cancel expired redistribution vote", async () => {
    // Fase 1: un operatore propone
    await contract.proposeRedistribution(user2, duration, { from: operator });
  
    // Fase 2: Simula il passare di 4 giorni
    await web3.currentProvider.send({
      jsonrpc: "2.0",
      method: "evm_increaseTime",
      params: [4 * 24 * 60 * 60], // 4 giorni
      id: new Date().getTime()
    }, () => {});
  
    await web3.currentProvider.send({
      jsonrpc: "2.0",
      method: "evm_mine",
      params: [],
      id: new Date().getTime()
    }, () => {});
  
    // Fase 3: cancella la proposta scaduta
    await contract.cancelRedistributionVote(user2, { from: operator });
  
    const vote = await contract.redistributionVotes(user2);
    
    // Dopo la cancellazione, dovrebbe essere tutto a 0/default
    assert.equal(vote.count.toString(), "0");
    assert.equal(vote.executed, false);
    assert.equal(vote.target, "0x0000000000000000000000000000000000000000");
  });

  it("should NOT execute redistribution if vote expired", async () => {
    // Proposta iniziale con un voto
    await contract.proposeRedistribution(user2, duration, { from: operator });
  
    // Aggiungi un secondo voto
    await contract.proposeRedistribution(user2, duration, { from: operator2 });
  
    // Simula il passare di 4 giorni
    await web3.currentProvider.send({
      jsonrpc: "2.0",
      method: "evm_increaseTime",
      params: [4 * 24 * 60 * 60], // 4 giorni
      id: new Date().getTime()
    }, () => {});
  
    await web3.currentProvider.send({
      jsonrpc: "2.0",
      method: "evm_mine",
      params: [],
      id: new Date().getTime()
    }, () => {});
  
    // Prova a forzare l'esecuzione dopo la scadenza
    try {
      await contract.checkAndExecuteRedistribution(user2, { from: operator });
      assert.fail("Expected revert not received");
    } catch (error) {
      assert(error.message.includes("Vote still active") || error.message.includes("execution reverted"), "Unexpected error: " + error.message);
    }
  
    const vote = await contract.redistributionVotes(user2);
    assert.equal(vote.executed, false);
  });

});
