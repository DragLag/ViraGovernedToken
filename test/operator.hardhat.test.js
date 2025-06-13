const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("ViraGovernedToken operator", function () {
  let contract;
  let owner, operator, user1;

  beforeEach(async function () {
    // Get signers
    [owner, operator, user1] = await ethers.getSigners();

    // Deploy the contract using OpenZeppelin upgrades
    const ViraGovernedToken = await ethers.getContractFactory("ViraGovernedToken");
    contract = await upgrades.deployProxy(ViraGovernedToken, [], {
      initializer: 'initialize'
    });
    await contract.waitForDeployment();

    // Add operator
    await contract.connect(owner).addOperator(operator.address);
  });

  it("should register users but without tokens", async function () {
    const balance1 = await contract.balanceOf(user1.address);
    expect(balance1.toString()).to.equal("0");
  });

  it("should block and unblock a user", async function () {
    await contract.connect(operator).blockUser(user1.address);
    let isBlocked = await contract.isBlocked(user1.address);
    expect(isBlocked).to.equal(true);
    
    await contract.connect(operator).unblockUser(user1.address);
    isBlocked = await contract.isBlocked(user1.address);
    expect(isBlocked).to.equal(false);
  });
});