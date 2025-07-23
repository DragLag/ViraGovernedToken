require("dotenv").config();

async function main() {
  const PUBLIC_KEY = process.env.PUBLIC_KEY;  
  const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS; 
 
  // Connect to the contract
  const ViraGovernedToken = await ethers.getContractFactory("ViraGovernedToken");
  const vira = ViraGovernedToken.attach(CONTRACT_ADDRESS);
  
  const [deployer] = await ethers.getSigners();
  

  console.log("=== ViraGovernedToken setIssuer ===");
  console.log("Contract Address:", CONTRACT_ADDRESS);
  console.log("Deployer Address:", deployer.address);
  try {
    
    const tx = await vira.connect(deployer).addIssuer(deployer.address);
    await tx.wait(); 
    console.log("Issuer added successfully!");
    console.log("Transaction hash:", tx.hash);
    
    // Check if the issuer has been added
     console.log(vira.issuerList);
    const isAuthorized = await vira.authorizedIssuers(deployer.address);
   
    console.log("Is authorized issuer:", isAuthorized);
    
  } catch (error) {
    console.error("Error adding issuer:", error.message);
  }

  console.log("=== ViraGovernedToken authorizedIssuer ===");
   console.log(`Authorized issuer (${PUBLIC_KEY}):`, await vira.authorizedIssuers(deployer.address));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });