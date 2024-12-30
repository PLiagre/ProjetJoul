import { ethers } from "hardhat";
import { UserManagement } from "../typechain-types";

async function main() {
  try {
    const userManagementAddress = "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0";
    const newAdminAddress = "0x5276736a83fb2Fb0601D01738cC81A612A3D9BCA";

    const UserManagementFactory = await ethers.getContractFactory("UserManagement");
    const userManagement = (await UserManagementFactory.attach(
      userManagementAddress
    )) as UserManagement;

    const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
    
    console.log("Granting DEFAULT_ADMIN_ROLE to:", newAdminAddress);
    
    // Grant the role
    const tx = await userManagement.grantRole(DEFAULT_ADMIN_ROLE, newAdminAddress);
    await tx.wait();
    
    console.log("Successfully granted DEFAULT_ADMIN_ROLE");
    
    // Verify the role was granted
    const hasRole = await userManagement.hasRole(DEFAULT_ADMIN_ROLE, newAdminAddress);
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
