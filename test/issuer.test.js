const ViraGovernedToken = artifacts.require("ViraGovernedToken");

contract("ViraGovernedToken operator", accounts => {
  const [owner, issuer, user1] = accounts;

  const duration = 3 * 24 * 60 * 60; // 3 giorni
  let contract;

  beforeEach(async () => {
    contract = await ViraGovernedToken.new({ from: owner });
    await contract.addIssuer(issuer, { from: owner });
  });

  it("should register users and assingn tokens", async () => {
    const balance1 = await contract.balanceOf(user1);
    assert.equal(balance1.toString(), "0");
  });

  it("should modify users' balance ", async () => {
    await contract.adjustBalance(user1, 1000, { from: issuer });
    const balance1 = await contract.balanceOf(user1);
    assert.equal(balance1.toString(), "1000");
  });


});