const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");



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
        await token.addOperator(operator1.address);
        await token.addOperator(operator2.address);
        await token.addIssuer(issuer1.address);

        // Mint some tokens for testing
        await token.connect(issuer1).adjustBalance(user1.address, 1000);
        await token.connect(issuer1).adjustBalance(user2.address, 500);
        await token.connect(issuer1).adjustBalance(user3.address, 200);
    });

    describe("Relayer Management", function () {
        it("Should add relayer successfully", async function () {
            await expect(token.addRelayer(relayer2.address))
                .to.emit(token, "RelayerAdded")
                .withArgs(relayer2.address);
            
            expect(await token.authorizedRelayers(relayer2.address)).to.be.true;
        });

        it("Should not add relayer twice", async function () {
            await expect(token.addRelayer(relayer1.address))
                .to.be.revertedWith("Already a relayer");
        });

        it("Should remove relayer successfully", async function () {
            await token.removeRelayer(relayer1.address);
            expect(await token.authorizedRelayers(relayer1.address)).to.be.false;
        });

        it("Should get relayers list", async function () {
            await token.addRelayer(relayer2.address);
            const relayers = await token.getRelayers();
            expect(relayers).to.include(relayer1.address);
            expect(relayers).to.include(relayer2.address);
        });

        it("Should retun the domain separator", async function () {
            console.log(domain);
            const domSep = await token.domainSeparator();
            const expected = ethers.TypedDataEncoder.hashDomain(domain);
            expect(domSep).equal(expected);
        });
    });

  
});