const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const ViraGovernedToken = artifacts.require("ViraGovernedToken");

contract("ViraGovernedToken", accounts => {
  const [owner, operator, operator2, operator3, issuer, user1, user2, user3] = accounts;
  const duration = 3 * 24 * 60 * 60; // 3 giorni
  let contract;

  beforeEach(async () => {
    // Deploy via proxy (upgradable)
    contract = await deployProxy(ViraGovernedToken, [], {
      initializer: "initialize",
      from: owner
    });

    // Setup
    await contract.addIssuer(issuer, { from: owner });
    await contract.addOperator(operator, { from: owner });
    await contract.addOperator(operator2, { from: owner });
    await contract.addOperator(operator3, { from: owner });

    // Register users and set balances
    await contract.registerUser(user1, { from: issuer });
    await contract.registerUser(user2, { from: issuer });
    await contract.registerUser(user3, { from: issuer });

    await contract.adjustBalance(user1, 100, { from: issuer });
    await contract.adjustBalance(user2, 1100, { from: issuer });
    await contract.adjustBalance(user3, 100, { from: issuer });
  });

  it("should allow redistribution when >50% of operators voted", async () => {
    await contract.proposeRedistribution(user2, duration, { from: operator });
    await contract.proposeRedistribution(user2, duration, { from: operator2 });
  
    //await contract.checkAndExecuteRedistribution(user2, { from: operator });
  
    const balanceUser1 = await contract.balanceOf(user1);
    const balanceUser2 = await contract.balanceOf(user2);
    const balanceUser3 = await contract.balanceOf(user3);
  
    console.log("User1:", balanceUser1.toString());
    console.log("User2:", balanceUser2.toString());
    console.log("User3:", balanceUser3.toString());
  
    assert(balanceUser1 > 100, "User1 should have gained tokens");
    assert(balanceUser2 < 1100, "User2 should have lost tokens");
    assert(balanceUser3 > 100, "User3 should have gained tokens");
  });

  it("vote rate 33%: not executed yet", async () => {
    await contract.proposeRedistribution(user2, duration, { from: operator });

    try {
      await contract.checkAndExecuteRedistribution(user2, { from: operator });
      assert.fail("Should not execute with 1/3 votes");
    } catch (err) {
      console.log("Caught error:", err.message);
      assert(
        err.message.includes("Not enough votes to execute redistribution"),
        "Expected revert with 'Not enough votes', got: " + err.message
      );
    }
  });

  it("vote should expire after duration if quorum not reached", async () => {
    await contract.proposeRedistribution(user2, duration, { from: operator });

    await increaseTime(4 * 24 * 60 * 60); // 4 days
    await contract.proposeRedistribution(user2, duration, { from: operator2 });

    const vote = await contract.redistributionVotes(user2);
    assert.equal(vote.count.toString(), "1");
    assert.equal(vote.executed, false);
  });

  it("should allow cancelling expired vote", async () => {
    await contract.proposeRedistribution(user2, duration, { from: operator });
    await increaseTime(4 * 24 * 60 * 60); // 4 days

    await contract.cancelRedistributionVote(user2, { from: operator });
    const vote = await contract.redistributionVotes(user2);
    assert.equal(vote.count.toString(), "0");
    assert.equal(vote.target, "0x0000000000000000000000000000000000000000");
  });

  it("should not allow double vote from same operator", async () => {
    await contract.proposeRedistribution(user2, duration, { from: operator });

    try {
      await contract.proposeRedistribution(user2, duration, { from: operator });
      assert.fail("Should fail on double vote");
    } catch (err) {
      assert(err.message.includes("Already voted"));
    }
  });

  it("should NOT execute redistribution if vote expired", async () => {
    await contract.proposeRedistribution(user2, duration, { from: operator });
  
    // Simula il passaggio di 4 giorni
    await increaseTime(4 * 24 * 60 * 60); // 4 days
  
    try {
      await contract.checkAndExecuteRedistribution(user2, { from: operator });
      assert.fail("Should not execute expired vote");
    } catch (err) {
      console.log("Caught error:", err.message);
      assert(
        err.message.includes("Vote has expired") || err.message.includes("execution reverted"),
        "Expected revert due to expired vote, got: " + err.message
      );
    }
  
    const vote = await contract.redistributionVotes(user2);
    assert.equal(vote.executed, false, "Vote should not be marked as executed");
  });
});

// Utility to simulate time travel
function increaseTime(seconds) {
  return new Promise((resolve, reject) => {
    web3.currentProvider.send(
      {
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [seconds],
        id: new Date().getTime()
      },
      (err1) => {
        if (err1) return reject(err1);
        web3.currentProvider.send(
          {
            jsonrpc: "2.0",
            method: "evm_mine",
            id: new Date().getTime()
          },
          (err2, res) => {
            return err2 ? reject(err2) : resolve(res);
          }
        );
      }
    );
  });
}
