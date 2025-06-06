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
  
  // 1. Check network connection
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId);
  
  // 2. Check current block
  const blockNumber = await ethers.provider.getBlockNumber();
  console.log("Current block number:", blockNumber);
  
  // 3. Check current issuer state
  console.log("\n=== CURRENT STATE ===");
  const isCurrentlyAuthorized = await vira.authorizedIssuers(PUBLIC_KEY);
  console.log("Is currently authorized:", isCurrentlyAuthorized);
  
  // 4. Add issuer with detailed logging
  console.log("\n=== ADDING ISSUER ===");
  try {
    // Check estimated gas
    const gasEstimate = await vira.connect(deployer).addIssuer.estimateGas(PUBLIC_KEY);
    console.log("Gas estimate:", gasEstimate.toString());
    
    // Execute transaction
    const tx = await vira.connect(deployer).addIssuer(PUBLIC_KEY, {
      gasLimit: gasEstimate * 2n // Double gas for safety
    });
    
    console.log("Transaction sent:", tx.hash);
    console.log("Waiting for confirmation...");
    
    // Wait for confirmation
    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed.toString());
    
    // Check emitted events
    console.log("Events emitted:", receipt.logs.length);
    receipt.logs.forEach((log, index) => {
      try {
        const parsedLog = vira.interface.parseLog(log);
        console.log(`Event ${index}:`, parsedLog.name, parsedLog.args);
      } catch (e) {
        console.log(`Event ${index}: Unable to parse`);
      }
    });
    
  } catch (error) {
    console.error("Error adding issuer:", error.message);
    return;
  }
  
  // 5. Check state after transaction
  console.log("\n=== STATE AFTER TRANSACTION ===");
  const isAuthorizedAfter = await vira.authorizedIssuers(PUBLIC_KEY);
  console.log("Is authorized after transaction:", isAuthorizedAfter);
  
  // 6. Wait a few seconds and check again
  console.log("\nWaiting 5 seconds and checking again...");
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  const isAuthorizedFinal = await vira.authorizedIssuers(PUBLIC_KEY);
  console.log("Is authorized after 5 seconds:", isAuthorizedFinal);
  
  // 7. Check final block
  const finalBlockNumber = await ethers.provider.getBlockNumber();
  console.log("Final block number:", finalBlockNumber);
  
  if (isAuthorizedFinal) {
    console.log("\n✅ SUCCESS: Issuer is properly authorized!");
  } else {
    console.log("\n❌ PROBLEM: Issuer authorization not persisted!");
    
    // Debug suggestions
    console.log("\n=== DEBUG SUGGESTIONS ===");
    console.log("1. Check if you're connected to the right network");
    console.log("2. Verify the contract address is correct");
    console.log("3. Make sure you're not using a local node that resets state");
    console.log("4. Check if there are multiple instances of the contract");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });