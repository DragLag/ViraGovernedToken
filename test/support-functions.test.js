const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");


describe("ViraGovernedToken - Relayer Meta-Transactions", function () {

    beforeEach(async function () {
        // Deploy contract
        ViraGovernedToken = await ethers.getContractFactory("ViraGovernedToken");
        token = await upgrades.deployProxy(ViraGovernedToken, [], {
            initializer: "initialize",
        });
        await token.waitForDeployment();
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