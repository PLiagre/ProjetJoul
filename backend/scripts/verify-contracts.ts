import { ethers } from "hardhat";

async function main() {
  try {
    console.log("Verifying contracts state on Polygon Amoy...");
    
    // Get contracts
    const joulToken = await ethers.getContractAt("JoulToken", "0x28FF9091f6ADcdDAc7E6d13d9eA6DeF5F2D12F78");
    const energyNFT = await ethers.getContractAt("EnergyNFT", "0x4b4eFf8750Ea2C710826653C5A28Fb64f9d835b6");
    const userManagement = await ethers.getContractAt("UserManagement", "0x960D47CF566343e98b6c6D45Ba96aA4b52240fEB");
    const energyExchange = await ethers.getContractAt("EnergyExchange", "0xf43a1C5CC26F3C109B786b2Cd3f3a0Ed6cAe696A");
    const joulVoting = await ethers.getContractAt("JoulVoting", "0xDb99DEedF3A664F2974FD22A009959Ad99927B1B");

    // Get signer
    const [signer] = await ethers.getSigners();
    console.log("Testing with address:", await signer.getAddress());

    // Check JoulToken
    console.log("\nChecking JoulToken...");
    const tokenName = await joulToken.name();
    const tokenSymbol = await joulToken.symbol();
    console.log("Name:", tokenName);
    console.log("Symbol:", tokenSymbol);
    
    // Check EnergyNFT
    console.log("\nChecking EnergyNFT...");
    const nftName = await energyNFT.name();
    const nftSymbol = await energyNFT.symbol();
    console.log("Name:", nftName);
    console.log("Symbol:", nftSymbol);
    
    // Check UserManagement
    console.log("\nChecking UserManagement...");
    const adminRole = await userManagement.ADMIN_ROLE();
    const isAdmin = await userManagement.hasRole(adminRole, await signer.getAddress());
    console.log("Is signer admin?", isAdmin);
    
    // Check if contract is paused
    const isPaused = await userManagement.paused();
    console.log("Is contract paused?", isPaused);
    
    // Check EnergyExchange
    console.log("\nChecking EnergyExchange...");
    const exchangeToken = await energyExchange.joulToken();
    console.log("Exchange JoulToken address:", exchangeToken);
    
    // Check JoulVoting
    console.log("\nChecking JoulVoting...");
    const votingToken = await joulVoting.joulToken();
    console.log("Voting JoulToken address:", votingToken);

    console.log("\nAll contracts verified successfully!");
    
  } catch (error) {
    console.error("\nError verifying contracts:");
    console.error(error);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
