const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");



describe("ViraGovernedToken - Relayer Revenue System", function () {
    let ViraGovernedToken;
    let token;
    let owner;
    let relayer1, relayerWallet;
    let user1, user2;

    beforeEach(async function () {
        [owner, relayer1, relayerWallet, user1, user2] = await ethers.getSigners();
        
        // Deploy contract
        ViraGovernedToken = await ethers.getContractFactory("ViraGovernedToken");
        token = await upgrades.deployProxy(ViraGovernedToken, [], {
            initializer: "initialize",
        });
        await token.waitForDeployment();

        // Setup initial configuration
        await token.setRelayerWallet(relayerWallet.address);
        
        // Mint initial tokens to user1
        await token.connect(owner).addIssuer(owner.address);
        await token.connect(owner).adjustBalance(user1.address, 1000000);
    });

    describe("Transfer with Fee Distribution", function () {
        it("Should split transfer between recipient and relayer", async function () {
            const transferAmount = 1000;
            const expectedFee = 10; // 1% of 1000 with default coefficient
            
            await token.connect(user1).transfer(user2.address, transferAmount);
            
            const user2Balance = await token.balanceOf(user2.address);
            const relayerBalance = await token.balanceOf(relayerWallet.address);
            
            expect(user2Balance).to.equal(transferAmount - expectedFee);
            expect(relayerBalance).to.equal(expectedFee);
        });

        it("Should adjust fee coefficient with high transaction volume", async function () {
            // Test volume parameters
            const testAmount = 100;
            const baselineCoefficient = await token.feeCoefficient();
            
            // Do 101 transactions to trigger coefficient increase
            for (let i = 0; i < 101; i++) {
                await token.connect(user1).transfer(user2.address, testAmount);
            }
            
            const newCoefficient = await token.feeCoefficient();
            expect(newCoefficient).to.be.gt(baselineCoefficient);
        });

        it("Should reset transaction count daily", async function () {
            // Do some transactions
            await token.connect(user1).transfer(user2.address, 100);
            
            // Fast-forward 25 hours
            await time.increase(time.duration.hours(25));
            
            // New day should reset transaction count
            const tx = await token.connect(user1).transfer(user2.address, 100);
            const receipt = await tx.wait();
            
            const transactionCount = await token.transactionCount();
            expect(transactionCount).to.equal(1);
        });

        it("Should allow owner to update fee coefficient", async function () {
            const newCoefficient = ethers.parseEther("1.5"); // 1.5x multiplier
            
            await token.connect(owner).setFeeCoefficient(newCoefficient);
            
            const updatedCoefficient = await token.feeCoefficient();
            expect(updatedCoefficient).to.equal(newCoefficient);
        });
    });
});

// Original tests maintained below...