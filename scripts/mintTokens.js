async function main() {
  const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
  const RECIPIENT_ADDRESS = process.env.RECIPIENT_ADDRESS || process.env.PUBLIC_KEY; // Address to mint tokens to
  const MINT_AMOUNT = process.env.MINT_AMOUNT || "1000"; // Amount to mint (in tokens, not wei)
 
  const [deployer] = await ethers.getSigners();
  
  const ViraGovernedToken = await ethers.getContractFactory("ViraGovernedToken");
  const vira = ViraGovernedToken.attach(CONTRACT_ADDRESS);
  
  console.log("=== MINT TOKENS SCRIPT ===");
  console.log("Contract Address:", CONTRACT_ADDRESS);
  console.log("Minter Address:", deployer.address);
  console.log("Recipient Address:", RECIPIENT_ADDRESS);
  console.log("Amount to mint:", MINT_AMOUNT, "tokens");
  
  // Check network connection
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId);
  
  try {
    // 1. Check if the deployer is authorized to mint
    console.log("\n=== AUTHORIZATION CHECK ===");
    const isAuthorizedIssuer = await vira.authorizedIssuers(deployer.address);
    console.log("Is deployer an authorized issuer:", isAuthorizedIssuer);
    
    if (!isAuthorizedIssuer) {
      console.log("❌ ERROR: Deployer is not an authorized issuer!");
      console.log("Please add the deployer as an issuer first.");
      return;
    }
    
    // 2. Get token decimals and convert amount
    const decimals = await vira.decimals();
    console.log("Token decimals:", decimals);
    
    const mintAmount = ethers.parseUnits(MINT_AMOUNT, decimals);
    console.log("Amount in wei:", mintAmount.toString());
    
    // 3. Check recipient balance before minting
    console.log("\n=== BALANCE BEFORE MINTING ===");
    const balanceBefore = await vira.balanceOf(RECIPIENT_ADDRESS);
    const balanceBeforeFormatted = ethers.formatUnits(balanceBefore, decimals);
    console.log("Recipient balance before:", balanceBeforeFormatted, "tokens");
    
    // 4. Check total supply before minting
    const totalSupplyBefore = await vira.totalSupply();
    const totalSupplyBeforeFormatted = ethers.formatUnits(totalSupplyBefore, decimals);
    console.log("Total supply before:", totalSupplyBeforeFormatted, "tokens");
    
    // 5. Execute mint transaction
    const tx = await vira.connect(deployer).adjustBalance(RECIPIENT_ADDRESS,mintAmount);
    
    console.log("Transaction sent:", tx.hash);
    console.log("Waiting for confirmation...");
    
    // Wait for confirmation
    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed.toString());
    
    // 6. Check emitted events
    console.log("\n=== EVENTS ===");
    console.log("Events emitted:", receipt.logs.length);
    receipt.logs.forEach((log, index) => {
      try {
        const parsedLog = vira.interface.parseLog(log);
        console.log(`Event ${index}:`, parsedLog.name);
        if (parsedLog.name === 'Transfer') {
          const from = parsedLog.args[0];
          const to = parsedLog.args[1];
          const value = parsedLog.args[2];
          console.log(`  From: ${from}`);
          console.log(`  To: ${to}`);
          console.log(`  Amount: ${ethers.formatUnits(value, decimals)} tokens`);
        }
      } catch (e) {
        console.log(`Event ${index}: Unable to parse`);
      }
    });
    
    // 8. Check balances after minting
    console.log("\n=== BALANCE AFTER MINTING ===");
    const balanceAfter = await vira.balanceOf(RECIPIENT_ADDRESS);
    const balanceAfterFormatted = ethers.formatUnits(balanceAfter, decimals);
    console.log("Recipient balance after:", balanceAfterFormatted, "tokens");
    
    const totalSupplyAfter = await vira.totalSupply();
    const totalSupplyAfterFormatted = ethers.formatUnits(totalSupplyAfter, decimals);
    console.log("Total supply after:", totalSupplyAfterFormatted, "tokens");
    
    // 9. Calculate differences
    const balanceDifference = balanceAfter - balanceBefore;
    const balanceDifferenceFormatted = ethers.formatUnits(balanceDifference, decimals);
    console.log("Balance increase:", balanceDifferenceFormatted, "tokens");
    
    const supplyDifference = totalSupplyAfter - totalSupplyBefore;
    const supplyDifferenceFormatted = ethers.formatUnits(supplyDifference, decimals);
    console.log("Supply increase:", supplyDifferenceFormatted, "tokens");
    
    console.log("\n✅ SUCCESS: Tokens minted successfully!");
    
  } catch (error) {
    console.error("❌ ERROR:", error.message);
    
    // Common error suggestions
    if (error.message.includes("not authorized")) {
      console.log("\n💡 SUGGESTION: Make sure the minter address is added as an authorized issuer");
    } else if (error.message.includes("insufficient")) {
      console.log("\n💡 SUGGESTION: Check if there are any minting limits or caps");
    } else if (error.message.includes("revert")) {
      console.log("\n💡 SUGGESTION: Check the contract's mint function requirements");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });