import { ethers } from "hardhat";

async function main() {
  const privateKey = "3872fd6960cf36e3992a08152223da684f41589a107470809f7ee40016962254";
  
  // Créer un wallet avec la clé privée fournie
  const wallet = new ethers.Wallet(privateKey, ethers.provider);
  
  // Adresse de destination qui a besoin des POL
  const destinationAddress = "0x5276736a83fb2Fb0601D01738cC81A612A3D9BCA";
  
  // Montant à transférer (0.2 POL)
  const amountToTransfer = ethers.parseEther("0.2");

  try {
    console.log(`Transfert de 0.2 POL de ${wallet.address} vers ${destinationAddress}...`);
    
    // Créer et envoyer la transaction
    const tx = {
      to: destinationAddress,
      value: amountToTransfer
    };
    
    const transaction = await wallet.sendTransaction(tx);
    console.log(`Transaction hash: ${transaction.hash}`);
    await transaction.wait();
    console.log("Transfert réussi!");
  } catch (error) {
    console.error("Erreur lors du transfert:", error);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
