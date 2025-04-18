const ViraGovernedToken = artifacts.require("ViraGovernedToken");
const OperatorVotingManager = artifacts.require("OperatorVotingManager");

contract("OperatorVotingManager", accounts => {
  const [owner, holder1, holder2, holder3, nonHolder, nominee, issuer] = accounts;
  let token, voting;

  beforeEach(async () => {
    token = await ViraGovernedToken.new({ from: owner });
    voting = await OperatorVotingManager.new(token.address, { from: owner });

    // add issuer
    await token.addIssuer(issuer, { from: owner });

    // 3 holders
    await token.registerUser(holder1, { from: owner });
    await token.registerUser(holder2, { from: owner });
    await token.registerUser(holder3, { from: owner });

    // adjust balance
    await token.adjustBalance(holder1, 100, { from: issuer });
    await token.adjustBalance(holder2, 1100, { from: issuer });
    await token.adjustBalance(holder3, 100, { from: issuer });

    // verify holders
    assert(await token.isHolderAddress(holder1));
    assert(await token.isHolderAddress(holder2));
    assert(await token.isHolderAddress(holder3));
  });

  it("should allow holders to vote and elect a new operator by majority", async () => {
    // Holder1 propose nominee
    await voting.proposeOperator(nominee, { from: holder1 });

    let proposal = await voting.proposals(nominee);
    assert.equal(proposal.voteCount.toString(), "1");

    // Holder2 votes for nominee
    await voting.proposeOperator(nominee, { from: holder2 });

    proposal = await voting.proposals(nominee);
    assert.equal(proposal.voteCount.toString(), "2");
    assert.equal(proposal.executed, true, "Vote should be executed");

    // verify that the nominee is now an operator
    const isNowOperator = await token.authorizedOperators(nominee);
    assert.equal(isNowOperator, true, "Nominee should be an authorized operator");
  });

  it("should not allow the same holder to vote twice", async () => {
    await voting.proposeOperator(nominee, { from: holder1 });

    try {
      await voting.proposeOperator(nominee, { from: holder1 });
      assert.fail("Should not allow double voting");
    } catch (err) {
      assert.include(err.message, "Already voted");
    }
  });

  it("should not allow non-holders to vote", async () => {
    try {
      await voting.proposeOperator(nominee, { from: nonHolder });
      assert.fail("Non-holders should not be allowed to vote");
    } catch (err) {
      assert.include(err.message, "Only holders can propose");
    }
  });

  it("should reset votes after proposal expiration", async () => {
    await voting.proposeOperator(nominee, { from: holder1 });

    // simulate passage of time
    await time.increase(4 * 24 * 60 * 60);

    // new vote: reset the proposal
    await voting.proposeOperator(nominee, { from: holder2 });

    const proposal = await voting.proposals(nominee);
    assert.equal(proposal.voteCount.toString(), "1");
    assert.equal(proposal.executed, false);
  });
});
