const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { N } = require("ethers");


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
        await token.waitForDeployment();

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
            const { r, s, p, v } = ethers.Signature.from(signature);

            // 4. Execute via relayer
            await expect(token.connect(relayer).executeMetaTransaction(
               await operator.getAddress(),
                functionCall,
                r, 
                s, 
                v
            )).to.emit(token, "MetaTransactionExecuted");

            // 5. Verify state changes
            expect(await token.getNonce(operator.address)).to.equal(1);
        });

        it("Should handle multiple sequential meta-transactions", async function () {
            let  user1,user2,user3
            users= [user1,user2,user3];
            users = await ethers.getSigners();
            for (let i = 0; i < users.length; i++) {
                const nonce = await token.getNonce(operator.address);
                const functionCall = token.interface.encodeFunctionData("registerUserMeta", [users[i].address]);
                
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
                const { r, s, p, v } = ethers.Signature.from(signature);


                await token.connect(relayer).executeMetaTransaction(
                   await operator.getAddress(),
                functionCall,
                r, 
                s, 
                v
                );

                expect(await token.getNonce(operator.address)).to.equal(i + 1);
                
            }
        });
    });

    
});