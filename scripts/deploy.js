async function main() {
    const ViraGovernedToken = await ethers.getContractFactory("ViraGovernedToken");
    const vira = await ViraGovernedToken.deploy();
    await vira.deployed();
    console.log(`Vira deployed to: ${vira.address}`);
  }
  
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
  