const ViraGovernedToken = artifacts.require("ViraGovernedToken");

module.exports = async function (deployer, network, accounts) {
  await deployer.deploy(ViraGovernedToken);
};
