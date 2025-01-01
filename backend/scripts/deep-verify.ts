import { ethers } from "hardhat";

async function main() {
  try {
    console.log("Performing deep verification of contracts on Polygon Amoy...");
    
    const [signer] = await ethers.getSigners();
    const address = await signer.getAddress();
    console.log("Testing with address:", address);
    
    // Get contracts
    const joulToken = await ethers.getContractAt("JoulToken", "0x28FF9091f6ADcdDAc7E6d13d9eA6DeF5F2D12F78");
    const energyNFT = await ethers.getContractAt("EnergyNFT", "0x4b4eFf8750Ea2C710826653C5A28Fb64f9d835b6");
    const userManagement = await ethers.getContractAt("UserManagement", "0x960D47CF566343e98b6c6D45Ba96aA4b52240fEB");
    const energyExchange = await ethers.getContractAt("EnergyExchange", "0xf43a1C5CC26F3C109B786b2Cd3f3a0Ed6cAe696A");
    const joulVoting = await ethers.getContractAt("JoulVoting", "0xDb99DEedF3A664F2974FD22A009959Ad99927B1B");

    // Check JoulToken detailed state
    console.log("\nDetailed JoulToken check:");
    const balance = await joulToken.balanceOf(address);
    const minterRole = await joulToken.MINTER_ROLE();
    const isMinter = await joulToken.hasRole(minterRole, address);
    console.log("Balance:", ethers.formatEther(balance), "JOUL");
    console.log("Is minter?", isMinter);
    
    // Check UserManagement detailed state
    console.log("\nDetailed UserManagement check:");
    const adminRole = await userManagement.ADMIN_ROLE();
    const producerRole = await userManagement.PRODUCER_ROLE();
    const consumerRole = await userManagement.CONSUMER_ROLE();
    
    console.log("Roles:");
    console.log("- Admin:", await userManagement.hasRole(adminRole, address));
    console.log("- Producer:", await userManagement.hasRole(producerRole, address));
    console.log("- Consumer:", await userManagement.hasRole(consumerRole, address));
    
    // Check EnergyExchange detailed state
    console.log("\nDetailed EnergyExchange check:");
    const enedisRole = await energyExchange.ENEDIS_ROLE();
    const pauserRole = await energyExchange.PAUSER_ROLE();
    console.log("Roles:");
    console.log("- Admin:", await energyExchange.hasRole(adminRole, address));
    console.log("- ENEDIS:", await energyExchange.hasRole(enedisRole, address));
    console.log("- Pauser:", await energyExchange.hasRole(pauserRole, address));
    
    // Check contract connections
    const exchangeJoulToken = await energyExchange.joulToken();
    const exchangeEnergyNFT = await energyExchange.energyNFT();
    const exchangeUserManagement = await energyExchange.userManagement();
    
    console.log("\nContract connections:");
    console.log("JoulToken:", exchangeJoulToken);
    console.log("EnergyNFT:", exchangeEnergyNFT);
    console.log("UserManagement:", exchangeUserManagement);
    
    // Check EnergyNFT detailed state
    console.log("\nDetailed EnergyNFT check:");
    const nftMinterRole = await energyNFT.MINTER_ROLE();
    const isNFTMinter = await energyNFT.hasRole(nftMinterRole, address);
    const nftBalance = await energyNFT.balanceOf(address);
    console.log("NFT balance:", nftBalance.toString());
    console.log("Is NFT minter?", isNFTMinter);
    
    // Check JoulVoting detailed state
    console.log("\nDetailed JoulVoting check:");
    const votingJoulToken = await joulVoting.joulToken();
    console.log("JoulToken connection:", votingJoulToken);
    
    // Check if the voting contract is properly connected to JoulToken
    console.log("Contract connections verified:", 
        votingJoulToken.toLowerCase() === "0x28FF9091f6ADcdDAc7E6d13d9eA6DeF5F2D12F78".toLowerCase() ? "OK" : "MISMATCH");

    console.log("\nDeep verification completed!");
    
  } catch (error) {
    console.error("\nError during deep verification:");
    console.error(error);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
