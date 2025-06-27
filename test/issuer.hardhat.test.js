const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { utils } = require("ethers");

describe("ViraGovernedToken issuer", function () {
  let contract;
  let owner, issuer, issuer1, user2, user1;

  beforeEach(async function () {
    // Get signers
    [owner, issuer, issuer1, user2, user1] = await ethers.getSigners();

    // Deploy the contract using OpenZeppelin upgrades
    const ViraGovernedToken = await ethers.getContractFactory("ViraGovernedToken");
    contract = await upgrades.deployProxy(ViraGovernedToken, [], {
      initializer: 'initialize'
    });
    // Wait until deployment completes
    await contract.waitForDeployment();


    // Add issuer
    await contract.connect(owner).addIssuer(issuer.address);
  });

  it("should register users", async function () {
    const balance1 = await contract.balanceOf(user1.address);
    expect(balance1.toString()).to.equal("0");
  });

  it("should add issuer successfully by owner", async function () {
    // Act
    await contract.connect(owner).addIssuer(issuer1.address);
    
    // Assert
    const isAuthorized = await contract.authorizedIssuers(issuer1.address);
    expect(isAuthorized).to.equal(true, "Issuer should be authorized");
  });

  it("should modify users' balance", async function () {
    await contract.connect(issuer).adjustBalance(user1.address, 1000);
    const balance1 = await contract.balanceOf(user1.address);
    expect(balance1.toString()).to.equal("1000");
  });

  it("should allow multiple balance adjustments by authorized issuer", async function () {
    // Act
    await contract.connect(issuer).adjustBalance(user1.address, 1000);
    await contract.connect(issuer).adjustBalance(user2.address, 2000);
    
    // Assert
    const balance1 = await contract.balanceOf(user1.address);
    const balance2 = await contract.balanceOf(user2.address);
    expect(balance1.toString()).to.equal("1000", "User1 balance should be 1000");
    expect(balance2.toString()).to.equal("2000", "User2 balance should be 2000");
  });
});