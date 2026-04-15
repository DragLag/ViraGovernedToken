const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");


describe("Relayer Service Integration - Revenue System", function () {
    let token;
    let owner, relayer, operator, issuer, user, relayerWallet;
    let initialFeeCoefficient;

    beforeEach(async function () {
        [owner, relayer, operator, issuer, user, relayerWallet] = await ethers.getSigners();
        
        const ViraGovernedToken = await ethers.getContractFactory("ViraGovernedToken");
        token = await upgrades.deployProxy(ViraGovernedToken, [], {
            initializer: "initialize",
        });
        await token.waitForDeployment();

        await token.addRelayer(relayer.address);
        await token.addOperator(operator.address);
        await token.addIssuer(issuer.address);
        await token.connect(owner).setRelayerWallet(relayerWallet.address);
        
        initialFeeCoefficient = await token.feeCoefficient();
        
        // Mint tokens for testing
        await token.connect(issuer).adjustBalance(user.address, 1000000);
    });

    describe("Revenue Collection in Relayer Workflow", function () {
        it("Should collect fee when processing relayer transaction", async function () {
            const transferAmount = 1000;
            const expectedFee = 10; // 1% of 1000 with default coefficient
            
            // Initial balances
            const userBalanceBefore = await token.balanceOf(user.address);
            const relayerBalanceBefore = await token.balanceOf(relayerWallet.address);
            
            // Create transfer function call
            const functionCall = token.interface.encodeFunctionData("transferMeta", [
                operator.address, 
                user.address, 
                transferAmount
            ]);
            
            // Get nonce and sign
            const nonce = await token.getNonce(operator.address);
            const domain = {
                name: "ViraGovernedToken",
                version: "1",
                chainId: (await ethers.provider.getNetwork()).chainId,
                verifyingContract: await token.getAddress()
            };

            const types = {
                MetaTransaction: [
                    { name: 'nonce', type: 'uint256' },
                    { name: 'from', type: 'address' },
                    { name: 'functionCall', type: 'bytes' }
                ]
            };

            const values = {
                nonce: nonce,
                from: operator.address,
                functionCall: functionCall
            };

            const signature = await operator.signTypedData(domain, types, values);
            const { r, s, v } = ethers.Signature.from(signature);

            // Execute via relayer
            await token.connect(relayer).executeMetaTransaction(
                operator.address,
                functionCall,
                r,
                s, 
                v
            );
            
            // Check balances after transaction
            const userBalanceAfter = await token.balanceOf(user.address);
            const relayerBalanceAfter = await token.balanceOf(relayerWallet.address);
            
            expect(userBalanceAfter).to.equal(userBalanceBefore - transferAmount + expectedFee);
            expect(relayerBalanceAfter).to.equal(relayerBalanceBefore + expectedFee);
        });

        it("Should adjust coefficient with relayer-processed transactions", async function () {
            // Process 101 transactions to trigger coefficient increase
            for (let i = 0; i < 101; i++) {
                const functionCall = token.interface.encodeFunctionData("transferMeta", [
                    operator.address, 
                    user.address, 
                    100
                ]);
                
                const nonce = await token.getNonce(operator.address);
                const domain = {
                    name: "ViraGovernedToken",
                    version: "1",
                    chainId: (await ethers.provider.getNetwork()).chainId,
                    verifyingContract: await token.getAddress()
                };
                
                const types = {
                    MetaTransaction: [
                        { name: 'nonce', type: 'uint256' },
                        { name: 'from', type: 'address' },
                        { name: 'functionCall', type: 'bytes' }
                    ]
                };

                const values = {
                    nonce: nonce,
                    from: operator.address,
                    functionCall: functionCall
                };

                const signature = await operator.signTypedData(domain, types, values);
                const { r, s, v } = ethers.Signature.from(signature);

                await token.connect(relayer).executeMetaTransaction(
                    operator.address,
                    functionCall,
                    r,
                    s, 
                    v
                );
            }
            
            const newCoefficient = await token.feeCoefficient();
            expect(newCoefficient).to.be.gt(initialFeeCoefficient);
        });

        it("Should track relayer transactions in daily count", async function () {
            // Process transactions through relayer
            const initialCount = await token.transactionCount();
            
            for (let i = 0; i < 5; i++) {
                const functionCall = token.interface.encodeFunctionData("transferMeta", [
                    operator.address, 
                    user.address, 
                    100
                ]);
                
                const nonce = await token.getNonce(operator.address);
                const domain = {
                    name: "ViraGovernedToken",
                    version: "1",
                    chainId: (await ethers.provider.getNetwork()).chainId,
                    verifyingContract: await token.getAddress()
                };
                
                const types = {
                    MetaTransaction: [
                        { name: 'nonce', type: 'uint256' },
                        { name: 'from', type: 'address' },
                        { name: 'functionCall', type: 'bytes' }
                    ]
                };

                const values = {
                    nonce: nonce,
                    from: operator.address,
                    functionCall: functionCall
                };

                const signature = await operator.signTypedData(domain, types, values);
                const { r, s, v } = ethers.Signature.from(signature);

                await token.connect(relayer).executeMetaTransaction(
                    operator.address,
                    functionCall,
                    r,
                    s, 
                    v
                );
            }
            
            const newCount = await token.transactionCount();
            expect(newCount - initialCount).to.equal(5);
        });
    });
});

// Original tests maintained below...