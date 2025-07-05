async function main() {
  const PUBLIC_KEY = process.env.PUBLIC_KEY;  
  const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
 
  const [deployer] = await ethers.getSigners();
  
  const ViraGovernedToken = await ethers.getContractFactory("ViraGovernedToken");
  const vira = ViraGovernedToken.attach(CONTRACT_ADDRESS);
  
  console.log("=== DIAGNOSTIC SCRIPT ===");
  console.log("Contract Address:", CONTRACT_ADDRESS);
  console.log("Deployer Address:", deployer.address);
  console.log("Public Key to authorize:", PUBLIC_KEY);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });