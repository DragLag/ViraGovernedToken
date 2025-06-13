const { expect } = require("chai");
const { ethers, upgrades, network } = require("hardhat");

describe("ViraGovernedToken redistribution", function () {
  let contract;
  let owner, operator, operator2, operator3, issuer, user1, user2, user3;
  const duration = 3 * 24 * 60 * 60; // 3 days in seconds

  beforeEach(async function () {
    // Get signers
    [owner, operator, operator2, operator3, issuer, user1, user2, user3] = await ethers.getSigners();

    // Deploy via proxy (upgradable)
    const ViraGovernedToken = await ethers.getContractFactory("ViraGovernedToken");
    contract = await upgrades.deployProxy(ViraGovernedToken, [], {
      initializer: "initialize"
    });
    await contract.waitForDeployment();

    // Setup
    await contract.connect(owner).addIssuer(issuer.address);
    await contract.connect(owner).addOperator(operator.address);
    await contract.connect(owner).addOperator(operator2.address);
    await contract.connect(owner).addOperator(operator3.address);

    // Register users and set balances
    await contract.connect(issuer).registerUser(user1.address);
    await contract.connect(issuer).registerUser(user2.address);
    await contract.connect(issuer).registerUser(user3.address);

    await contract.connect(issuer).adjustBalance(user1.address, 100);
    await contract.connect(issuer).adjustBalance(user2.address, 1100);
    await contract.connect(issuer).adjustBalance(user3.address, 100);
  });

  it("should allow redistribution when >50% of operators voted", async function () {
    await contract.connect(operator).proposeRedistribution(user2.address, duration);
    await contract.connect(operator2).proposeRedistribution(user2.address, duration);

    const balanceUser1 = await contract.balanceOf(user1.address);
    const balanceUser2 = await contract.balanceOf(user2.address);
    const balanceUser3 = await contract.balanceOf(user3.address);

    /*
    console.log("User1:", balanceUser1.toString());
    console.log("User2:", balanceUser2.toString());
    console.log("User3:", balanceUser3.toString());
    */

    expect(balanceUser1).to.be.gt(100, "User1 should have gained tokens");
    expect(balanceUser2).to.be.lt(1100, "User2 should have lost tokens");
    expect(balanceUser3).to.be.gt(100, "User3 should have gained tokens");
  });

  it("vote rate 33%: not executed yet", async function () {
    await contract.connect(operator).proposeRedistribution(user2.address, duration);

    await expect(
      contract.connect(operator).checkAndExecuteRedistribution(user2.address)
    ).to.be.revertedWith("Not enough votes to execute redistribution");
  });

  it("vote should expire after duration if quorum not reached", async function () {
    await contract.connect(operator).proposeRedistribution(user2.address, duration);

    await increaseTime(4 * 24 * 60 * 60); // 4 days
    await contract.connect(operator2).proposeRedistribution(user2.address, duration);

    const vote = await contract.redistributionVotes(user2.address);
    expect(vote.count.toString()).to.equal("1");
    expect(vote.executed).to.equal(false);
  });

  it("should allow cancelling expired vote", async function () {
    await contract.connect(operator).proposeRedistribution(user2.address, duration);
    await increaseTime(4 * 24 * 60 * 60); // 4 days

    await contract.connect(operator).cancelRedistributionVote(user2.address);
    const vote = await contract.redistributionVotes(user2.address);
    expect(vote.count.toString()).to.equal("0");
    expect(vote.target).to.equal("0x0000000000000000000000000000000000000000");
  });

  it("should not allow double vote from same operator", async function () {
    await contract.connect(operator).proposeRedistribution(user2.address, duration);

    await expect(
      contract.connect(operator).proposeRedistribution(user2.address, duration)
    ).to.be.revertedWith("Already voted");
  });

  it("should NOT execute redistribution if vote expired", async function () {
    await contract.connect(operator).proposeRedistribution(user2.address, duration);

    await increaseTime(4 * 24 * 60 * 60);

    await expect(
      contract.connect(operator).checkAndExecuteRedistribution(user2.address)
    ).to.be.revertedWith("Vote has expired");

    const vote = await contract.redistributionVotes(user2.address);
    expect(vote.executed).to.equal(false, "Vote should not be marked as executed");
  });

  // Utility function to simulate time travel in Hardhat
  async function increaseTime(seconds) {
    await network.provider.send("evm_increaseTime", [seconds]);
    await network.provider.send("evm_mine");
  }
});