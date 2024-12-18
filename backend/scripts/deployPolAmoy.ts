import { task } from "hardhat/config";
import * as fs from "fs";
import * as path from "path";

async function main() {
  try {
    // Vérification des variables d'environnement requises
    if (!process.env.PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY is required in .env file");
    }
    if (!process.env.ENEDIS_ADDRESS) {
      throw new Error("ENEDIS_ADDRESS is required in .env file");
    }
    if (!process.env.POOL_ADDRESS) {
      throw new Error("POOL_ADDRESS is required in .env file");
    }

    // @ts-ignore
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Network: Polygon Amoy");

    // 1. Déploiement du JoulToken
    console.log("\nDeploying JoulToken...");
    // @ts-ignore
    const JoulToken = await hre.ethers.getContractFactory("JoulToken");
    const joulToken = await JoulToken.deploy();
    await joulToken.waitForDeployment();
    const joulTokenAddress = await joulToken.getAddress();
    console.log("JoulToken deployed to:", joulTokenAddress);

    // 2. Déploiement du EnergyNFT
    console.log("\nDeploying EnergyNFT...");
    // @ts-ignore
    const EnergyNFT = await hre.ethers.getContractFactory("EnergyNFT");
    const energyNFT = await EnergyNFT.deploy();
    await energyNFT.waitForDeployment();
    const energyNFTAddress = await energyNFT.getAddress();
    console.log("EnergyNFT deployed to:", energyNFTAddress);

    // 3. Déploiement du UserManagement
    console.log("\nDeploying UserManagement...");
    // @ts-ignore
    const UserManagement = await hre.ethers.getContractFactory("UserManagement");
    const userManagement = await UserManagement.deploy();
    await userManagement.waitForDeployment();
    const userManagementAddress = await userManagement.getAddress();
    console.log("UserManagement deployed to:", userManagementAddress);

    // 4. Déploiement du EnergyExchange
    console.log("\nDeploying EnergyExchange...");
    try {
      // Vérification des adresses
      console.log("Constructor arguments:");
      console.log("- JoulToken:", joulTokenAddress);
      console.log("- EnergyNFT:", energyNFTAddress);
      console.log("- UserManagement:", userManagementAddress);
      console.log("- ENEDIS:", process.env.ENEDIS_ADDRESS);
      console.log("- Pool:", process.env.POOL_ADDRESS);

      // @ts-ignore
      const EnergyExchange = await hre.ethers.getContractFactory("EnergyExchange");
      const energyExchange = await EnergyExchange.deploy(
        joulTokenAddress,
        energyNFTAddress,
        userManagementAddress,
        process.env.ENEDIS_ADDRESS,
        process.env.POOL_ADDRESS
      );
      await energyExchange.waitForDeployment();
      const energyExchangeAddress = await energyExchange.getAddress();
      console.log("EnergyExchange deployed to:", energyExchangeAddress);

      // Configuration des rôles
      console.log("\nSetting up roles...");

      // Donner le rôle MINTER à EnergyExchange pour JoulToken
      const MINTER_ROLE = await joulToken.MINTER_ROLE();
      const mintTx = await joulToken.grantRole(MINTER_ROLE, energyExchangeAddress);
      await mintTx.wait();
      console.log("Granted MINTER_ROLE to EnergyExchange for JoulToken");

      // Donner le rôle MINTER à EnergyExchange pour EnergyNFT
      const NFT_MINTER_ROLE = await energyNFT.MINTER_ROLE();
      const nftMintTx = await energyNFT.grantRole(NFT_MINTER_ROLE, energyExchangeAddress);
      await nftMintTx.wait();
      console.log("Granted MINTER_ROLE to EnergyExchange for EnergyNFT");

      // Donner le rôle ADMIN à EnergyExchange pour UserManagement
      const ADMIN_ROLE = await userManagement.ADMIN_ROLE();
      const adminTx = await userManagement.grantRole(ADMIN_ROLE, energyExchangeAddress);
      await adminTx.wait();
      console.log("Granted ADMIN_ROLE to EnergyExchange for UserManagement");

      // Explicitement donner le rôle ADMIN au déployeur pour UserManagement
      const deployerAdminTx = await userManagement.grantRole(ADMIN_ROLE, deployer.address);
      await deployerAdminTx.wait();
      console.log("Granted ADMIN_ROLE to deployer for UserManagement");

      // Ajouter l'adresse supplémentaire en tant qu'admin
      const additionalAdmin = "0x4d6371994557c161B3133BE641C4Fa013169522d";
      const additionalAdminTx = await userManagement.grantRole(ADMIN_ROLE, additionalAdmin);
      await additionalAdminTx.wait();
      console.log(`Granted ADMIN_ROLE to additional admin: ${additionalAdmin}`);


      // Deuxième admin
      const secondAdmin = "0x8606684bD504EFBcb23B55C2729d77D328Fb62ad";
      const secondAdminTx = await userManagement.grantRole(ADMIN_ROLE, secondAdmin);
      await secondAdminTx.wait();
      console.log(`Granted ADMIN_ROLE to second admin: ${secondAdmin}`);
      
      /*
      // Troisième admin
      const thirdAdmin = "0x0000000000000000000000000000000000000000";
      const thirdAdminTx = await userManagement.grantRole(ADMIN_ROLE, thirdAdmin);
      await thirdAdminTx.wait();
      console.log(`Granted ADMIN_ROLE to third admin: ${thirdAdmin}`);
      */

      // Sauvegarder les adresses des contrats
      const deploymentInfo = {
        network: "polygonAmoy",
        contracts: {
          JoulToken: joulTokenAddress,
          EnergyNFT: energyNFTAddress,
          UserManagement: userManagementAddress,
          EnergyExchange: energyExchangeAddress,
          ENEDIS: process.env.ENEDIS_ADDRESS,
          Pool: process.env.POOL_ADDRESS
        },
        deployer: deployer.address,
        additionalAdmins: [
          additionalAdmin,
          secondAdmin,
                    /*
          thirdAdmin
          */
        ],
        timestamp: new Date().toISOString()
      };

      // Sauvegarder les informations de déploiement
      const deploymentPath = path.join(__dirname, "..", "deployments");
      if (!fs.existsSync(deploymentPath)) {
        fs.mkdirSync(deploymentPath);
      }
      fs.writeFileSync(
        path.join(deploymentPath, `deployment-amoy-${deploymentInfo.timestamp}.json`),
        JSON.stringify(deploymentInfo, null, 2)
      );

      // Mettre à jour les adresses pour le frontend
      const frontendAddresses = {
        JOUL_TOKEN: joulTokenAddress,
        ENERGY_NFT: energyNFTAddress,
        USER_MANAGEMENT: userManagementAddress,
        ENERGY_EXCHANGE: energyExchangeAddress
      };

      const frontendPath = path.join(__dirname, "..", "..", "frontend", "src", "lib");
      if (!fs.existsSync(frontendPath)) {
        fs.mkdirSync(frontendPath, { recursive: true });
      }
      fs.writeFileSync(
        path.join(frontendPath, "contract-addresses-amoy.json"),
        JSON.stringify(frontendAddresses, null, 2)
      );

      console.log("\nDeployment successful! Contract addresses saved to:");
      console.log(`- ${deploymentPath}/deployment-amoy-${deploymentInfo.timestamp}.json`);
      console.log(`- ${frontendPath}/contract-addresses-amoy.json`);

    } catch (error) {
      console.error("\nEnergyExchange deployment failed!");
      console.error("Error details:", error);
      throw error;
    }

  } catch (error) {
    console.error("\nDeployment failed!");
    console.error(error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
