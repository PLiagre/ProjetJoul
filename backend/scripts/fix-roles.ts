import { ethers } from "hardhat";

async function main() {
  try {
    console.log("Fixing roles on Polygon Amoy...");
    
    const [signer] = await ethers.getSigners();
    const address = await signer.getAddress();
    console.log("Using address:", address);
    
    // Get contracts
    const energyExchange = await ethers.getContractAt("EnergyExchange", "0xf43a1C5CC26F3C109B786b2Cd3f3a0Ed6cAe696A");
    const userManagement = await ethers.getContractAt("UserManagement", "0x960D47CF566343e98b6c6D45Ba96aA4b52240fEB");

    // Get roles
    const adminRole = await userManagement.DEFAULT_ADMIN_ROLE();
    
    console.log("\nFixing UserManagement roles...");
    // Add as consumer (all users should be consumers)
    if (!(await userManagement.hasRole(await userManagement.CONSUMER_ROLE(), address))) {
        console.log("Adding as consumer...");
        await userManagement.addUser(address, false);
        console.log("Added as consumer");
    }
    
    // Add as producer
    if (!(await userManagement.hasRole(await userManagement.PRODUCER_ROLE(), address))) {
        console.log("Adding as producer...");
        await userManagement.addUser(address, true);
        console.log("Added as producer");
    }

    console.log("\nFixing EnergyExchange roles...");
    // Check and grant DEFAULT_ADMIN_ROLE on EnergyExchange if missing
    const exchangeDefaultAdminRole = await energyExchange.DEFAULT_ADMIN_ROLE();
    if (!(await energyExchange.hasRole(exchangeDefaultAdminRole, address))) {
        console.log("Missing DEFAULT_ADMIN_ROLE on EnergyExchange");
        console.log("This role should have been granted during deployment");
        console.log("Please check if the contract was redeployed without granting the role");
    } else {
        console.log("Has DEFAULT_ADMIN_ROLE on EnergyExchange");
    }

    console.log("\nRoles fixed!");
    
  } catch (error) {
    console.error("\nError fixing roles:");
    console.error(error);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
