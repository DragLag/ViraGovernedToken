const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");


async function createSignedMetaTransaction(signer, functionCall, token, domain) {
    const nonce = await token.getNonce(signer.address);
    console.log("nonce: "+ nonce + " for signer: " + signer.address + " functionCall: " + functionCall);  ;
    
    const types = {
        MetaTransaction: [
            { name: 'nonce', type: 'uint256' },
            { name: 'from', type: 'address' },
            { name: 'functionCall', type: 'bytes' }
        ]
    };

    const values = {
        nonce: nonce,
        from: signer.address,
        functionCall: functionCall
    };
    
    const signature = await signer._signTypedData(domain, types, values);
    console.log("signature: " + signature);
    
    const { r, s, v } = ethers.utils.splitSignature(signature);

    return {
        userAddress: signer.address,
        nonce: nonce,
        signature: { r, s, v },
        functionCall: functionCall
    };
}

// ...describe("ViraGovernedToken - Relayer Meta-Transactions", function () { ... })

describe("ViraGovernedToken - Relayer Meta-Transactions", function () {
    let ViraGovernedToken;
    let token;
    let owner;
    let relayer1, relayer2;
    let operator1, operator2;
    let issuer1;
    let user1, user2, user3;
    let domain;

    beforeEach(async function () {
        [owner, relayer1, relayer2, operator1, operator2, issuer1, user1, user2, user3] = await ethers.getSigners();
        
        // Deploy contract
        ViraGovernedToken = await ethers.getContractFactory("ViraGovernedToken");
        token = await upgrades.deployProxy(ViraGovernedToken, [], {
            initializer: "initialize",
        });
        await token.waitForDeployment();

        // Setup domain for EIP-712
        const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
        domain = {
            name: "ViraGovernedToken",
            version: "1",
            chainId: chainId,
            verifyingContract: token.address
        };

        // Setup initial roles
        await token.addRelayer(relayer1.address);
        await token.addRelayer(relayer2.address);
        //await token.addOperator(operator1.address);
        await token.addOperator(operator2.address);
        await token.addIssuer(issuer1.address);

        // Mint some tokens for testing
        await token.connect(issuer1).adjustBalance(user1.address, 1000);
        await token.connect(issuer1).adjustBalance(user2.address, 500);
        await token.connect(issuer1).adjustBalance(user3.address, 200);
    });

    describe("Nonce Management", function () {
        it("Should return correct nonce for user", async function () {
            const nonce = await token.getNonce(user1.address);
            console.log("nonce: "+ nonce);
            expect(nonce).to.equal(0);
        });

         it("check operator1 in signers", async function () {
            const signers=  await ethers.getSigners()
            //console.log("signers: "+ signers.map(signer => signer.address).join(", "));
            expect(signers.map(signer => signer.address)).to.include(operator1.address);
        });

        it("Check _signTypedData available on operator1", async function () {
            console.log("operator1 type:", typeof operator1);
            console.log("operator1._signTypedData:", typeof operator1._signTypedData);
            console.log("operator1.signMessage:", typeof operator1.signMessage);
        });

        it("Should increment nonce after meta-transaction", async function () {
            const functionCall = token.interface.encodeFunctionData("registerUserMeta", [user2.address]);
            
            
            const metaTx = await createSignedMetaTransaction(relayer2, functionCall, token, domain);
            console.log("metaTx: ", metaTx);
            
            await token.connect(relayer1).executeMetaTransaction(
                metaTx.userAddress,
                metaTx.functionCall,
                metaTx.signature.r,
                metaTx.signature.s,
                metaTx.signature.v
            );
            const nonce= await token.getNonce(operator1.address);
            console.log("new nonce:", nonce.toString());
            expect(await token.getNonce(operator1.address)).to.equal(1);
        });
    });
    /*
    describe("Meta-Transaction Signature Verification", function () {
        it("Should verify valid signature", async function () {
            const functionCall = token.interface.encodeFunctionData("registerUserMeta", [user2.address]);
            const metaTx = await createSignedMetaTransaction(operator1, functionCall);
            
            // This should not revert
            await expect(token.connect(relayer1).executeMetaTransaction(
                metaTx.userAddress,
                metaTx.functionCall,
                metaTx.signature.r,
                metaTx.signature.s,
                metaTx.signature.v
            )).to.not.be.reverted;
        });

        it("Should reject invalid signature", async function () {
            const functionCall = token.interface.encodeFunctionData("registerUserMeta", [user2.address]);
            const metaTx = await createSignedMetaTransaction(operator1, functionCall);
            
            // Use wrong signature
            await expect(token.connect(relayer1).executeMetaTransaction(
                user2.address, // Wrong user address
                metaTx.functionCall,
                metaTx.signature.r,
                metaTx.signature.s,
                metaTx.signature.v
            )).to.be.revertedWith("Invalid signature");
        });

        it("Should reject replay attacks", async function () {
            const functionCall = token.interface.encodeFunctionData("registerUserMeta", [user2.address]);
            const metaTx = await createSignedMetaTransaction(operator1, functionCall);
            
            // Execute first time
            await token.connect(relayer1).executeMetaTransaction(
                metaTx.userAddress,
                metaTx.functionCall,
                metaTx.signature.r,
                metaTx.signature.s,
                metaTx.signature.v
            );

            // Try to replay - should fail
            await expect(token.connect(relayer1).executeMetaTransaction(
                metaTx.userAddress,
                metaTx.functionCall,
                metaTx.signature.r,
                metaTx.signature.s,
                metaTx.signature.v
            )).to.be.revertedWith("Invalid signature");
        });
    });

    describe("Meta-Transaction Authorization", function () {
        it("Should only allow authorized relayers", async function () {
            const functionCall = token.interface.encodeFunctionData("registerUserMeta", [user2.address]);
            const metaTx = await createSignedMetaTransaction(operator1, functionCall);
            
            await expect(token.connect(user1).executeMetaTransaction(
                metaTx.userAddress,
                metaTx.functionCall,
                metaTx.signature.r,
                metaTx.signature.s,
                metaTx.signature.v
            )).to.be.revertedWith("Not authorized relayer");
        });
    });

    describe("Meta-Transaction Function Execution", function () {
        it("Should execute registerUserMeta", async function () {
            const functionCall = token.interface.encodeFunctionData("registerUserMeta", [user2.address]);
            const metaTx = await createSignedMetaTransaction(operator1, functionCall);
            
            await expect(token.connect(relayer1).executeMetaTransaction(
                metaTx.userAddress,
                metaTx.functionCall,
                metaTx.signature.r,
                metaTx.signature.s,
                metaTx.signature.v
            )).to.emit(token, "MetaTransactionExecuted")
              .withArgs(operator1.address, relayer1.address, "0x9d4323be"); // registerUserMeta selector
        });

       

        it("Should execute blockUserMeta", async function () {
            const functionCall = token.interface.encodeFunctionData("blockUserMeta", [user3.address]);
            const metaTx = await createSignedMetaTransaction(operator1, functionCall);
            
            await token.connect(relayer1).executeMetaTransaction(
                metaTx.userAddress,
                metaTx.functionCall,
                metaTx.signature.r,
                metaTx.signature.s,
                metaTx.signature.v
            );

            expect(await token.isBlocked(user3.address)).to.be.true;
        });

        it("Should execute unblockUserMeta", async function () {
            // First block the user
            await token.connect(operator1).blockUser(user3.address);
            
            const functionCall = token.interface.encodeFunctionData("unblockUserMeta", [user3.address]);
            const metaTx = await createSignedMetaTransaction(operator1, functionCall);
            
            await token.connect(relayer1).executeMetaTransaction(
                metaTx.userAddress,
                metaTx.functionCall,
                metaTx.signature.r,
                metaTx.signature.s,
                metaTx.signature.v
            );

            expect(await token.isBlocked(user3.address)).to.be.false;
        });

        it("Should execute adjustBalanceMeta", async function () {
            const amount = 100;
            const functionCall = token.interface.encodeFunctionData("adjustBalanceMeta", [user3.address, amount]);
            const metaTx = await createSignedMetaTransaction(issuer1, functionCall);
            
            const balanceBefore = await token.balanceOf(user3.address);
            
            await token.connect(relayer1).executeMetaTransaction(
                metaTx.userAddress,
                metaTx.functionCall,
                metaTx.signature.r,
                metaTx.signature.s,
                metaTx.signature.v
            );

            const balanceAfter = await token.balanceOf(user3.address);
            expect(balanceAfter).to.equal(balanceBefore.add(amount));
        });
    });

    describe("Meta-Transaction Access Control", function () {
        it("Should enforce operator role for operator functions", async function () {
            const functionCall = token.interface.encodeFunctionData("blockUserMeta", [user3.address]);
            const metaTx = await createSignedMetaTransaction(user1, functionCall); // user1 is not operator
            
            await expect(token.connect(relayer1).executeMetaTransaction(
                metaTx.userAddress,
                metaTx.functionCall,
                metaTx.signature.r,
                metaTx.signature.s,
                metaTx.signature.v
            )).to.be.revertedWith("Not authorized operator");
        });

        it("Should enforce issuer role for issuer functions", async function () {
            const functionCall = token.interface.encodeFunctionData("adjustBalanceMeta", [user3.address, 100]);
            const metaTx = await createSignedMetaTransaction(user1, functionCall); // user1 is not issuer
            
            await expect(token.connect(relayer1).executeMetaTransaction(
                metaTx.userAddress,
                metaTx.functionCall,
                metaTx.signature.r,
                metaTx.signature.s,
                metaTx.signature.v
            )).to.be.revertedWith("Not authorized issuer");
        });
    });

    describe("Unsupported Functions", function () {
        it("Should revert for unsupported function selectors", async function () {
            // Create a function call with an unsupported selector
            const functionCall = "0x12345678"; // Invalid selector
            const metaTx = await createSignedMetaTransaction(operator1, functionCall);
            
            await expect(token.connect(relayer1).executeMetaTransaction(
                metaTx.userAddress,
                metaTx.functionCall,
                metaTx.signature.r,
                metaTx.signature.s,
                metaTx.signature.v
            )).to.be.revertedWith("Function not supported for meta-transaction");
        });

        it("Should revert when calling meta wrapper functions directly", async function () {
            await expect(token.registerUserMeta(user1.address))
                .to.be.revertedWith("Use executeMetaTransaction");
            
            await expect(token.blockUserMeta(user1.address))
                .to.be.revertedWith("Use executeMetaTransaction");
        });
    });

    // Helper function to create signed meta-transactions
    async function createSignedMetaTransaction(signer, functionCall) {
        const nonce = await token.getNonce(signer.address);
        
        const types = {
            MetaTransaction: [
                { name: 'nonce', type: 'uint256' },
                { name: 'from', type: 'address' },
                { name: 'functionCall', type: 'bytes' }
            ]
        };

        const values = {
            nonce: nonce,
            from: signer.address,
            functionCall: functionCall
        };

        const signature = await signer._signTypedData(domain, types, values);
        const { r, s, v } = ethers.utils.splitSignature(signature);

        return {
            userAddress: signer.address,
            nonce: nonce,
            signature: { r, s, v },
            functionCall: functionCall
        };
    }
});

// Integration Tests per il Relayer Service
describe("Relayer Service Integration", function () {
    let token;
    let relayer;
    let operator;
    let issuer;
    let user;

    beforeEach(async function () {
        [owner, relayer, operator, issuer, user] = await ethers.getSigners();
        
        const ViraGovernedToken = await ethers.getContractFactory("ViraGovernedToken");
        token = await upgrades.deployProxy(ViraGovernedToken, [], {
            initializer: "initialize",
        });
        await token.deployed();

        await token.addRelayer(relayer.address);
        await token.addOperator(operator.address);
        await token.addIssuer(issuer.address);
    });

    describe("Relayer Service Simulation", function () {
        it("Should simulate complete relayer workflow", async function () {
            // Simulate what the relayer service would do
            
            // 1. Get nonce
            const nonce = await token.getNonce(operator.address);
            expect(nonce).to.equal(0);

            // 2. Create function call
            const functionCall = token.interface.encodeFunctionData("registerUserMeta", [user.address]);

            // 3. Sign meta-transaction
            const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
            const domain = {
                name: "ViraGovernedToken",
                version: "1",
                chainId: chainId,
                verifyingContract: token.address
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

            const signature = await operator._signTypedData(domain, types, values);
            const { r, s, v } = ethers.utils.splitSignature(signature);

            // 4. Execute via relayer
            await expect(token.connect(relayer).executeMetaTransaction(
                operator.address,
                functionCall,
                r, s, v
            )).to.emit(token, "MetaTransactionExecuted");

            // 5. Verify state changes
            expect(await token.getNonce(operator.address)).to.equal(1);
        });

        it("Should handle multiple sequential meta-transactions", async function () {
            const users = [user, await ethers.getSigner()];
            
            for (let i = 0; i < users.length; i++) {
                const nonce = await token.getNonce(operator.address);
                const functionCall = token.interface.encodeFunctionData("registerUserMeta", [users[i].address]);
                
                const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
                const domain = {
                    name: "ViraGovernedToken",
                    version: "1",
                    chainId: chainId,
                    verifyingContract: token.address
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

                const signature = await operator._signTypedData(domain, types, values);
                const { r, s, v } = ethers.utils.splitSignature(signature);

                await token.connect(relayer).executeMetaTransaction(
                    operator.address,
                    functionCall,
                    r, s, v
                );

                expect(await token.getNonce(operator.address)).to.equal(i + 1);
            }
        });
    });

    */
});