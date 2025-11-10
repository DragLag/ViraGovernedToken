const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  
  const ViraGovernedToken = await ethers.getContractFactory("ViraGovernedToken");
  
   // Deploy upgradeable proxy
  const vira = await upgrades.deployProxy(ViraGovernedToken, [], {
    initializer: "initialize",
  });
  await vira.waitForDeployment();
  
  const contractAddress = await vira.getAddress();
  console.log("ViraGovernedToken deployed to:", contractAddress);
  console.log("Contract initialized!");
  console.log("Owner:", await vira.owner());
  console.log("Contract address to use:", contractAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });