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
    });

    describe("Support functions:", function () {
        it("Should retun name", async function () {
            const name = await token.name();
            expect(name).equal("ViraGovernedToken");
        });
        it("Should retun symbol", async function () {
            const sim = await token.symbol();
            expect(sim).equal("VGT");
        });
        it("Should retun contract address", async function () {
            const con = await token.getVerifyingContract();
            expect(con).equal("0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9");
        });
        

        it("Should retun the domain separator", async function () {
            domain = {
            name: await token.name(),
            version: "1",
            chainId: await ethers.provider.getNetwork().then(n => n.chainId),
            verifyingContract: await token.getVerifyingContract()
        };
            console.log(domain);
            const domSep = await token.domainSeparator();
            const expected = ethers.TypedDataEncoder.hashDomain(domain);
            expect(domSep).equal(expected);
        });
    });

  
});