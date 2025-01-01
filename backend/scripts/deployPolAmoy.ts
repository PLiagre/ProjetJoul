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

      // Donner le DEFAULT_ADMIN_ROLE au déployeur sur EnergyNFT
      const NFT_DEFAULT_ADMIN_ROLE = await energyNFT.DEFAULT_ADMIN_ROLE();
      const nftAdminTx = await energyNFT.grantRole(NFT_DEFAULT_ADMIN_ROLE, deployer.address);
      await nftAdminTx.wait();
      console.log("Granted DEFAULT_ADMIN_ROLE to deployer for EnergyNFT");

      // 5. Déploiement du JoulVoting
      console.log("\nDeploying JoulVoting...");
      // @ts-ignore
      const JoulVoting = await hre.ethers.getContractFactory("JoulVoting");
      const joulVoting = await JoulVoting.deploy(joulTokenAddress);
      await joulVoting.waitForDeployment();
      const joulVotingAddress = await joulVoting.getAddress();
      console.log("JoulVoting deployed to:", joulVotingAddress);

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
      const USER_MANAGEMENT_ADMIN_ROLE = await userManagement.ADMIN_ROLE();
      const adminTx = await userManagement.grantRole(USER_MANAGEMENT_ADMIN_ROLE, energyExchangeAddress);
      await adminTx.wait();
      console.log("Granted ADMIN_ROLE to EnergyExchange for UserManagement");

      // Explicitement donner le rôle ADMIN au déployeur pour UserManagement
      const deployerAdminTx = await userManagement.grantRole(USER_MANAGEMENT_ADMIN_ROLE, deployer.address);
      await deployerAdminTx.wait();
      console.log("Granted ADMIN_ROLE to deployer for UserManagement");

      // Ajouter l'adresse du déployeur principal en tant qu'admin
      const mainDeployer = "0x5276736a83fb2Fb0601D01738cC81A612A3D9BCA";
      const mainDeployerTx = await userManagement.grantRole(USER_MANAGEMENT_ADMIN_ROLE, mainDeployer);
      await mainDeployerTx.wait();
      console.log(`Granted ADMIN_ROLE to main deployer: ${mainDeployer}`);

      // Donner le DEFAULT_ADMIN_ROLE sur UserManagement au déployeur principal
      const USER_MANAGEMENT_DEFAULT_ADMIN_ROLE = await userManagement.DEFAULT_ADMIN_ROLE();
      const mainDeployerDefaultTx = await userManagement.grantRole(USER_MANAGEMENT_DEFAULT_ADMIN_ROLE, mainDeployer);
      await mainDeployerDefaultTx.wait();
      console.log(`Granted DEFAULT_ADMIN_ROLE to main deployer on UserManagement: ${mainDeployer}`);

      // Donner le rôle ENEDIS et DEFAULT_ADMIN_ROLE au déployeur principal sur EnergyExchange
      const ENEDIS_ROLE = await energyExchange.ENEDIS_ROLE();
      const ENERGY_EXCHANGE_DEFAULT_ADMIN_ROLE = await energyExchange.DEFAULT_ADMIN_ROLE();
      
      const mainDeployerEnedisTx = await energyExchange.grantRole(ENEDIS_ROLE, mainDeployer);
      await mainDeployerEnedisTx.wait();
      console.log(`Granted ENEDIS_ROLE to main deployer: ${mainDeployer}`);
      
      const mainDeployerEnergyExchangeDefaultTx = await energyExchange.grantRole(ENERGY_EXCHANGE_DEFAULT_ADMIN_ROLE, mainDeployer);
      await mainDeployerEnergyExchangeDefaultTx.wait();
      console.log(`Granted DEFAULT_ADMIN_ROLE to main deployer on EnergyExchange: ${mainDeployer}`);

      // Deuxième admin
      const secondAdmin = "0x8606684bD504EFBcb23B55C2729d77D328Fb62ad";
      const secondAdminTx = await userManagement.grantRole(USER_MANAGEMENT_ADMIN_ROLE, secondAdmin);
      await secondAdminTx.wait();
      console.log(`Granted ADMIN_ROLE to second admin: ${secondAdmin}`);

      // Donner le DEFAULT_ADMIN_ROLE sur UserManagement au deuxième admin
      const secondAdminDefaultTx = await userManagement.grantRole(USER_MANAGEMENT_DEFAULT_ADMIN_ROLE, secondAdmin);
      await secondAdminDefaultTx.wait();
      console.log(`Granted DEFAULT_ADMIN_ROLE to second admin on UserManagement: ${secondAdmin}`);

      // Donner le rôle ENEDIS et DEFAULT_ADMIN_ROLE au deuxième admin sur EnergyExchange
      const secondAdminEnedisTx = await energyExchange.grantRole(ENEDIS_ROLE, secondAdmin);
      await secondAdminEnedisTx.wait();
      console.log(`Granted ENEDIS_ROLE to second admin: ${secondAdmin}`);
      
      const secondAdminEnergyExchangeDefaultTx = await energyExchange.grantRole(ENERGY_EXCHANGE_DEFAULT_ADMIN_ROLE, secondAdmin);
      await secondAdminEnergyExchangeDefaultTx.wait();
      console.log(`Granted DEFAULT_ADMIN_ROLE to second admin on EnergyExchange: ${secondAdmin}`);

      // Troisième admin
      const thirdAdmin = "0x3F52a5dde225089750378E41aa2e7c635D95bDAB";
      const thirdAdminTx = await userManagement.grantRole(USER_MANAGEMENT_ADMIN_ROLE, thirdAdmin);
      await thirdAdminTx.wait();
      console.log(`Granted ADMIN_ROLE to third admin: ${thirdAdmin}`);

      // Donner le DEFAULT_ADMIN_ROLE sur UserManagement au troisième admin
      const thirdAdminDefaultTx = await userManagement.grantRole(USER_MANAGEMENT_DEFAULT_ADMIN_ROLE, thirdAdmin);
      await thirdAdminDefaultTx.wait();
      console.log(`Granted DEFAULT_ADMIN_ROLE to third admin on UserManagement: ${thirdAdmin}`);

      // Donner le rôle ENEDIS et DEFAULT_ADMIN_ROLE au troisième admin sur EnergyExchange
      const thirdAdminEnedisTx = await energyExchange.grantRole(ENEDIS_ROLE, thirdAdmin);
      await thirdAdminEnedisTx.wait();
      console.log(`Granted ENEDIS_ROLE to third admin: ${thirdAdmin}`);
      
      const thirdAdminEnergyExchangeDefaultTx = await energyExchange.grantRole(ENERGY_EXCHANGE_DEFAULT_ADMIN_ROLE, thirdAdmin);
      await thirdAdminEnergyExchangeDefaultTx.wait();
      console.log(`Granted DEFAULT_ADMIN_ROLE to third admin on EnergyExchange: ${thirdAdmin}`);

      // Quatrième admin
      const fourthAdmin = "0x8FC529c92f56E6787EF6110cDd7FBC1D7Cf6dCFa";
      const fourthAdminTx = await userManagement.grantRole(USER_MANAGEMENT_ADMIN_ROLE, fourthAdmin);
      await fourthAdminTx.wait();
      console.log(`Granted ADMIN_ROLE to fourth admin: ${fourthAdmin}`);

      // Donner le DEFAULT_ADMIN_ROLE sur UserManagement au quatrième admin
      const fourthAdminDefaultTx = await userManagement.grantRole(USER_MANAGEMENT_DEFAULT_ADMIN_ROLE, fourthAdmin);
      await fourthAdminDefaultTx.wait();
      console.log(`Granted DEFAULT_ADMIN_ROLE to fourth admin on UserManagement: ${fourthAdmin}`);

      // Donner le rôle ENEDIS et DEFAULT_ADMIN_ROLE au quatrième admin sur EnergyExchange
      const fourthAdminEnedisTx = await energyExchange.grantRole(ENEDIS_ROLE, fourthAdmin);
      await fourthAdminEnedisTx.wait();
      console.log(`Granted ENEDIS_ROLE to fourth admin: ${fourthAdmin}`);
      
      const fourthAdminEnergyExchangeDefaultTx = await energyExchange.grantRole(ENERGY_EXCHANGE_DEFAULT_ADMIN_ROLE, fourthAdmin);
      await fourthAdminEnergyExchangeDefaultTx.wait();
      console.log(`Granted DEFAULT_ADMIN_ROLE to fourth admin on EnergyExchange: ${fourthAdmin}`);

      // Sauvegarder les adresses des contrats
      const deploymentInfo = {
        network: "polygonAmoy",
        contracts: {
          JoulToken: joulTokenAddress,
          EnergyNFT: energyNFTAddress,
          UserManagement: userManagementAddress,
          EnergyExchange: energyExchangeAddress,
          JoulVoting: joulVotingAddress,
          ENEDIS: process.env.ENEDIS_ADDRESS,
          Pool: process.env.POOL_ADDRESS
        },
        deployer: deployer.address,
        additionalAdmins: [
          mainDeployer,
          secondAdmin,
          thirdAdmin,
          fourthAdmin
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
        ENERGY_EXCHANGE: energyExchangeAddress,
        JOUL_VOTING: joulVotingAddress
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
      console.error("\nDeployment failed!");
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
