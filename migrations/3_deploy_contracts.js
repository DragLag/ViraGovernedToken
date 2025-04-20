const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const ViraGovernedToken = artifacts.require("ViraGovernedToken");

module.exports = async function (deployer) {
  await deployProxy(ViraGovernedToken, [], { deployer });
};
