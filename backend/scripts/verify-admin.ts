import { ethers } from "hardhat";
import { UserManagement } from "../typechain-types";

async function main() {
  const userManagementAddress = "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0";
  const deployer = "0x5276736a83fb2Fb0601D01738cC81A612A3D9BCA";

  const UserManagementFactory = await ethers.getContractFactory("UserManagement");
  const userManagement = (await UserManagementFactory.attach(
    userManagementAddress
  )) as UserManagement;

  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash; // bytes32(0)
  const hasRole = await userManagement.hasRole(DEFAULT_ADMIN_ROLE, deployer);
  
  console.log(`Checking ADMIN_ROLE for address: ${deployer}`);
  console.log(`Has ADMIN_ROLE: ${hasRole}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
