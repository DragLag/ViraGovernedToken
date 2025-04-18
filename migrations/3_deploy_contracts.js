const OperatorVotingManager = artifacts.require("OperatorVotingManager");
const ViraGovernedToken = artifacts.require("ViraGovernedToken");

module.exports = async function (deployer) {
  const tokenInstance = await ViraGovernedToken.deployed();
  await deployer.deploy(OperatorVotingManager, tokenInstance.address);
};