require("dotenv").config();

async function main() {
  const RELAYER_PUBLIC_KEY = process.env.RELAYER_PUBLIC_KEY;  
  const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS; 
 
  // Connect to the contract
  const ViraGovernedToken = await ethers.getContractFactory("ViraGovernedToken");
  const vira = ViraGovernedToken.attach(CONTRACT_ADDRESS);
  
  const [deployer] = await ethers.getSigners();

  console.log("=== ViraGovernedToken set Relayer ===");
  console.log("Contract Address:", CONTRACT_ADDRESS);
  console.log("Deployer Address:", deployer.address);
  try {
    const tx = await vira.connect(deployer).addRelayer(RELAYER_PUBLIC_KEY);
    await tx.wait(); 
    console.log("Relayer added successfully!");
    console.log("Transaction hash:", tx.hash);
    
    const isAuthorized = await vira.authorizedRelayers(RELAYER_PUBLIC_KEY);
    console.log("Is authorized Relayer:", isAuthorized);
    
  } catch (error) {
    console.error("Error adding Relayer:", error.message);
  }

  console.log("=== ViraGovernedToken authorizedRelayer ===");
   console.log(`Authorized Relayer (${RELAYER_PUBLIC_KEY}):`, await vira.authorizedRelayers(RELAYER_PUBLIC_KEY));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });