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


  it("should allow vote for redistribution and execute it (unanimity)", async () => {
    await contract.proposeRedistribution(user2, duration, { from: operator });
    await contract.proposeRedistribution(user2, duration, { from: operator2 }); 
    await contract.proposeRedistribution(user2, duration, { from: operator3 });

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

  it("should allow vote for redistribution and execute it (66%)", async () => {
    await contract.proposeRedistribution(user2, duration, { from: operator });
    await contract.proposeRedistribution(user2, duration, { from: operator2 }); 
    
    
    await contract.checkAndExecuteRedistribution(user2, { from: operator });
   
    const balanceUser1 = await contract.balanceOf(user1);
    const balanceUser2 = await contract.balanceOf(user2);
    const balanceUser3 = await contract.balanceOf(user3);

    console.log("typeof balanceUser1:", typeof balanceUser1);
    console.log("toString:", balanceUser1.toString());
    const vote = await contract.redistributionVotes(user2);
    console.log("Vote count:", vote.count.toString());
    console.log("Vote executed:", vote.executed); 
   

    console.log("Balance after redistribution user1:", balanceUser1.toString());
    console.log("Balance after redistribution user2:", balanceUser2.toString());
    console.log("Balance after redistribution user3:", balanceUser3.toString());

    

    assert(parseInt(balanceUser1.toString()) > 100);  // Deve aver ricevuto
    assert(parseInt(balanceUser2.toString()) < 1100); // Deve aver perso qualcosa
    assert(parseInt(balanceUser3.toString()) > 100);
  });

  /*
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
  });
  
  
  it("should expire vote after 3 days", async () => {
    //await contract.registerUser(user2, { from: operator });
    await contract.adjustBalance(user2, 1000, { from: operator });
  
    await contract.proposeRedistribution(user2, duration, { from: operator });
  
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
  
    // Ora il voto dovrebbe essere scaduto
    await contract.cancelRedistributionVote(user2, { from: operator });
  });
    
  it("should not allow a double redistribution", async () => {
    await contract.proposeRedistribution(user2, duration, { from: operator });

    try {
      await contract.proposeRedistribution(user2, duration, { from: operator });
      assert.fail("Second propose should fail");
    } catch (err) {
        assert(
            err.message.includes("Redistribution already executed"),
            "Error message should contain 'Redistribution already executed'"
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
        err.message.includes("already voted"),
        "Expected error about already voted"
      );
    }
  });
*/
});
