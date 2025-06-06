async function main() {
    const ViraGovernedToken = await ethers.getContractFactory("ViraGovernedToken");
  
  console.log("Deploying ViraGovernedToken...");
  const vira = await ViraGovernedToken.deploy();
  
  // Wait for deployment to be mined
  await vira.waitForDeployment();
  
  // Get the deployed contract address
  const address = await vira.getAddress();
  
  console.log(`Vira deployed to: ${address}`);
  
  // Optionally, wait for a few confirmations
  console.log("Waiting for confirmations...");
  await vira.deploymentTransaction().wait(5);
  console.log("Deployment confirmed!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
  