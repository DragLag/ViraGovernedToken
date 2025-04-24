const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const ViraGovernedToken = artifacts.require("ViraGovernedToken");

contract("ViraGovernedToken issuer", accounts => {
  const [owner, issuer, user1] = accounts;

  let contract;

  beforeEach(async () => {
    contract = await deployProxy(ViraGovernedToken, [], {
      initializer: 'initialize',
      from: owner
    });

    await contract.addIssuer(issuer, { from: owner });
  });

  it("should register users", async () => {
    const balance1 = await contract.balanceOf(user1);
    assert.equal(balance1.toString(), "0");
  });

  it("should modify users' balance", async () => {
    await contract.adjustBalance(user1, 1000, { from: issuer });
    const balance1 = await contract.balanceOf(user1);
    assert.equal(balance1.toString(), "1000");
  });
});
