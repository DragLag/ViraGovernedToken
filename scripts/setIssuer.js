require("dotenv").config();

async function main() {
  const PUBLIC_KEY = process.env.PUBLIC_KEY;  
  const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS; 
 
  // Connect to the contract
  const ViraGovernedToken = await ethers.getContractFactory("ViraGovernedToken");
  const vira = ViraGovernedToken.attach(PUBLIC_KEY);
  
  const [deployer] = await ethers.getSigners();
  
  /*
  console.log(vira.authorizedIssuers);
  const contractOwner = await vira.owner();
  console.log("Contract Owner:", contractOwner);

  if (deployer.address.toLowerCase() !== contractOwner.toLowerCase()) {
    console.error("ERROR: Deployer is not the contract owner!");
    console.log("Deployer:", deployer.address);
    console.log("Owner:", contractOwner);
    return;
  }*/

  console.log("=== ViraGovernedToken setIssuer ===");
  console.log("Contract Address:", CONTRACT_ADDRESS);
  console.log("Deployer Address:", deployer.address);
  try {
    // Aggiungi await e connect per specificare il signer
    const tx = await vira.connect(deployer).addIssuer(deployer.address);
    await tx.wait(); // Aspetta la conferma della transazione
    console.log("Issuer added successfully!");
    console.log("Transaction hash:", tx.hash);
    
    // Verifica che l'issuer sia stato aggiunto
    const isAuthorized = await vira.authorizedIssuers(PUBLIC_KEY);
    console.log("Is authorized issuer:", isAuthorized);
    
  } catch (error) {
    console.error("Error adding issuer:", error.message);
  }

  console.log("=== ViraGovernedToken authorizedIssuer ===");
   console.log(`Authorized issuer (${PUBLIC_KEY}):`, await vira.authorizedIssuers(PUBLIC_KEY));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });