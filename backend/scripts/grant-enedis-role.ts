import { ethers } from "hardhat";

// Contract interface for type safety
interface IEnergyExchange {
  ENEDIS_ROLE(): Promise<string>;
  grantRole(role: string, account: string): Promise<any>;
  hasRole(role: string, account: string): Promise<boolean>;
}

async function main() {
  try {
    // Get the contract address from the deployment
    const EnergyExchange = await ethers.getContractFactory("EnergyExchange");
    const energyExchange = (EnergyExchange.attach(
      "0x4A679253410272dd5232B3Ff7cF5dbB88f295319" // Updated contract address
    ) as unknown) as IEnergyExchange;

    // The address to grant the ENEDIS_ROLE to
    const targetAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

    // Get the ENEDIS_ROLE bytes32 value
    const ENEDIS_ROLE = await energyExchange.ENEDIS_ROLE();
    
    console.log("ENEDIS_ROLE bytes32:", ENEDIS_ROLE);
    console.log("Granting ENEDIS_ROLE to:", targetAddress);
    
    // Grant the role
    const tx = await energyExchange.grantRole(ENEDIS_ROLE, targetAddress);
    await tx.wait();
    
    console.log("Successfully granted ENEDIS_ROLE");
    
    // Verify the role was granted
    const hasRole = await energyExchange.hasRole(ENEDIS_ROLE, targetAddress);
    console.log("Role verification:", hasRole);

  } catch (error) {
    console.error("Error granting role:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
