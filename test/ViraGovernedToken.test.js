const ViraGovernedToken = artifacts.require("ViraGovernedToken");
const assert = require("assert");

contract("ViraGovernedToken (Web3-based test)", (accounts) => {
    let contract;

    const [owner, operator, user1, user2] = accounts;

    before(async () => {
        contract = await ViraGovernedToken.deployed();
    });

    it("should allow the owner to add an operator", async () => {
        await contract.addOperator(operator, { from: owner });
        const isOp = await contract.authorizedOperators(operator);
        assert.strictEqual(isOp, true);
    });

    it("should register a new user with 100 tokens", async () => {
        await contract.registerUser(user1, { from: operator });
        const balance = await contract.balanceOf(user1);
        assert.strictEqual(balance.toString(), "100");
    });

    it("should adjust user balance", async () => {
        await contract.adjustBalance(user1, 50, { from: operator });
        let balance = await contract.balanceOf(user1);
        assert.strictEqual(balance.toString(), "150");

        await contract.adjustBalance(user1, -30, { from: operator });
        balance = await contract.balanceOf(user1);
        assert.strictEqual(balance.toString(), "120");
    });

    it("should block and unblock user", async () => {
        await contract.blockUser(user1, { from: operator });
        let blocked = await contract.isBlocked(user1);
        assert.strictEqual(blocked, true);

        await contract.unblockUser(user1, { from: operator });
        blocked = await contract.isBlocked(user1);
        assert.strictEqual(blocked, false);
    });

    it("should handle redistribution vote and execution", async () => {
        await contract.registerUser(user2, { from: operator });
        await contract.adjustBalance(user2, 1000, { from: operator });

        await contract.proposeRedistribution(user2, { from: operator });

        const vote = await contract.redistributionVotes(user2);
        assert.strictEqual(vote.executed, true); // se c’è solo un operatore
    });
});
