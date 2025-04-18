const ViraGovernedToken = artifacts.require("ViraGovernedToken");

contract("ViraGovernedToken operator", accounts => {
  const [owner, operator, user1] = accounts;

  const duration = 3 * 24 * 60 * 60; // 3 giorni
  let contract;

  beforeEach(async () => {
    contract = await ViraGovernedToken.new({ from: owner });
    await contract.addOperator(operator, { from: owner });
  });

  it("should register users but without tokens", async () => {
    const balance1 = await contract.balanceOf(user1);
    assert.equal(balance1.toString(), "0");
  });

  it("should block and unblock a user", async () => {
    await contract.blockUser(user1, { from: operator });
    let isBlocked = await contract.isBlocked(user1);
    assert.equal(isBlocked, true);

    await contract.unblockUser(user1, { from: operator });
    isBlocked = await contract.isBlocked(user1);
    assert.equal(isBlocked, false);
  });

});