import { ethers } from "hardhat";

async function main() {
  try {
    const [signer] = await ethers.getSigners();
    console.log("Testing network with a small transaction...");
    console.log("From address:", await signer.getAddress());
    
    // Get current balance
    const balance = await ethers.provider.getBalance(signer.getAddress());
    console.log("Current balance:", ethers.formatEther(balance), "MATIC");
    
    // Send a tiny amount to self
    const tx = await signer.sendTransaction({
      to: await signer.getAddress(),
      value: ethers.parseEther("0.0001")
    });
    
    console.log("Transaction sent:", tx.hash);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait();
    
    if (receipt) {
      console.log("Transaction confirmed in block:", receipt.blockNumber);
    } else {
      console.log("Transaction sent but receipt not available");
    }
    console.log("\nNetwork is accepting transactions normally");
    
  } catch (error) {
    console.error("\nError during test transaction:");
    console.error(error);
    console.log("\nNetwork might be having issues processing transactions");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
