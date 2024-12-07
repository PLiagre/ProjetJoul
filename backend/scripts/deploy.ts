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

    // 3. Déploiement du EnergyExchange
    console.log("\nDeploying EnergyExchange...");
    // @ts-ignore
    const EnergyExchange = await hre.ethers.getContractFactory("EnergyExchange");
    const energyExchange = await EnergyExchange.deploy(
      joulTokenAddress,
      energyNFTAddress,
      process.env.ENEDIS_ADDRESS,
      process.env.POOL_ADDRESS
    );
    await energyExchange.waitForDeployment();
    const energyExchangeAddress = await energyExchange.getAddress();
    console.log("EnergyExchange deployed to:", energyExchangeAddress);

    // 4. Déploiement du JoulGovernance
    console.log("\nDeploying JoulGovernance...");
    // @ts-ignore
    const JoulGovernance = await hre.ethers.getContractFactory("JoulGovernance");
    const joulGovernance = await JoulGovernance.deploy(joulTokenAddress);
    await joulGovernance.waitForDeployment();
    const joulGovernanceAddress = await joulGovernance.getAddress();
    console.log("JoulGovernance deployed to:", joulGovernanceAddress);

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

    // Sauvegarder les adresses des contrats
    const deploymentInfo = {
      network: "polygonAmoy",
      contracts: {
        JoulToken: joulTokenAddress,
        EnergyNFT: energyNFTAddress,
        EnergyExchange: energyExchangeAddress,
        JoulGovernance: joulGovernanceAddress,
        ENEDIS: process.env.ENEDIS_ADDRESS,
        Pool: process.env.POOL_ADDRESS
      },
      deployer: deployer.address,
      timestamp: new Date().toISOString()
    };

    // Sauvegarder les informations de déploiement
    const deploymentPath = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentPath)) {
      fs.mkdirSync(deploymentPath);
    }
    fs.writeFileSync(
      path.join(deploymentPath, `deployment-${deploymentInfo.timestamp}.json`),
      JSON.stringify(deploymentInfo, null, 2)
    );

    // Mettre à jour les adresses pour le frontend
    const frontendAddresses = {
      JOUL_TOKEN: joulTokenAddress,
      ENERGY_NFT: energyNFTAddress,
      ENERGY_EXCHANGE: energyExchangeAddress,
      JOUL_GOVERNANCE: joulGovernanceAddress
    };

    const frontendPath = path.join(__dirname, "..", "..", "frontend", "src", "lib");
    if (!fs.existsSync(frontendPath)) {
      fs.mkdirSync(frontendPath, { recursive: true });
    }
    fs.writeFileSync(
      path.join(frontendPath, "contract-addresses.json"),
      JSON.stringify(frontendAddresses, null, 2)
    );

    console.log("\nDeployment successful! Contract addresses saved to:");
    console.log(`- ${deploymentPath}/deployment-${deploymentInfo.timestamp}.json`);
    console.log(`- ${frontendPath}/contract-addresses.json`);

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
