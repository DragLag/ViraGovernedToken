const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { N } = require("ethers");




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
        [owner, relayer1, relayer2, operator1, operator2, issuer1, user1, user2, user3, user4] = await ethers.getSigners();
        
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
            //chainId: chainId,
            chainId: (await ethers.provider.getNetwork()).chainId,
            //verifyingContract: token.address
            verifyingContract: await token.getAddress()
        };
        //console.log("Domain for EIP-712:", domain);
        // Setup initial roles
        await token.addRelayer(relayer1.address);
        await token.addRelayer(relayer2.address);
        //await token.addOperator(operator1.address);
        await token.addOperator(operator1.address);
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
      

        it("Should increment nonce after meta-transaction", async function () {
            const functionCall = token.interface.encodeFunctionData("registerUserMeta", [user4.address]);
            //const metaTxDbg = await debugSignature(operator1, functionCall, token, domain);
            const metaTx = await createSignedMetaTransaction(operator1, functionCall, token, domain);
            await token.connect(relayer1).executeMetaTransaction(
                await operator1.getAddress(),  // userAddress
                functionCall,                  // functionCall
                metaTx.signature.r,
                metaTx.signature.s,
                metaTx.signature.v             // v (from splitSignature)
            );
            const digetsSol = await token.debugDigest();
            console.log("digest from solidity:", digetsSol);
            const nonce = await token.getNonce(await operator1.getAddress());
            console.log("new nonce:", nonce.toString());
            expect(nonce).to.equal(1);
        });
    });
   
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
        });
        /*
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
    */
    // Helper function to create signed meta-transactions
   async function createSignedMetaTransaction(signer, functionCall, token, domain) {
    const nonce = await token.getNonce(signer.address);
    const signerAddress = await signer.getAddress();
    console.log("nonce:", nonce.toString(), "for signer:", signerAddress, "functionCall:", functionCall);    

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
    
    const signature = await signer.signTypedData(domain, types, values);
    console.log("signature: " + signature);

    const { r, s, p, v } = ethers.Signature.from(signature);// splitSignature(signature);
    return {
        userAddress: signer.address,
        nonce: nonce,
        signature: { r, s, p, v },
        functionCall: functionCall
    };
    
}

async function debugSignature(signer, functionCall, tokenContract, domain) {
    const signerAddress = await signer.getAddress();
    const nonce = await tokenContract.getNonce(signerAddress);
    
    console.log("=== DEBUG SIGNATURE ===");
    console.log("Signer address:", signerAddress);
    console.log("Nonce:", nonce.toString());
    console.log("Function call:", functionCall);
    console.log("Domain:", domain);
    
    const metaTx = {
        nonce: nonce,
        from: signerAddress,
        functionCall: functionCall
    };
    
    console.log("MetaTx object:", metaTx);
    
    const types = {
        MetaTransaction: [
            { name: "nonce", type: "uint256" },
            { name: "from", type: "address" },
            { name: "functionCall", type: "bytes" }
        ]
    };
    
    console.log("Types:", types);
    
    // Calcola il digest che dovrebbe essere usato
    const digest = ethers.TypedDataEncoder.hash(domain, types, metaTx);
    console.log("Expected digest:", digest);
    
    const signature = await signer.signTypedData(domain, types, metaTx);
    const { r, s, v } = ethers.Signature.from(signature);
    
    console.log("Signature components:");
    console.log("r:", r);
    console.log("s:", s);
    console.log("v:", v);
    
    return { metaTx, signature: { r, s, v } };
}
});

