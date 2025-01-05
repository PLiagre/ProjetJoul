# ProjetJoul - Plateforme d'Échange d'Énergie

ProjetJoul est une plateforme décentralisée d'échange d'énergie utilisant la technologie blockchain. La plateforme permet aux producteurs et consommateurs d'énergie d'échanger de l'énergie via des NFTs et inclut un système de gouvernance par le biais de mécanismes de vote.

## Structure du Projet

Le projet est organisé en deux composants principaux :

### Backend (`/backend`)
- Smart contracts écrits en Solidity
- Inclut les contrats pour :
  - NFTs d'énergie (`EnergyNFT.sol`)
  - Échange d'énergie (`EnergyExchange.sol`)
  - Token de la plateforme (`JoulToken.sol`)
  - Système de vote (`JoulVoting.sol`)
  - Gestion des utilisateurs (`UserManagement.sol`)
- Suite de tests utilisant Hardhat
- Scripts de déploiement pour différents réseaux (Polygon, Amoy)

### Frontend (`/frontend`)
- Application Next.js avec TypeScript
- Composants React pour différents rôles utilisateurs (Admin, Producteur, Consommateur)
- Intégration Web3 avec wagmi
- Stylisation avec Tailwind CSS
- Intégration IPFS pour les métadonnées NFT

## Fonctionnalités Principales

- Échange d'énergie via NFTs
- Contrôle d'accès basé sur les rôles (Admin, Producteur, Consommateur)
- Gouvernance par système de vote
- Support multi-réseaux (Polygon, Amoy)
- Intégration IPFS pour le stockage décentralisé

## Prérequis

- Node.js
- npm ou yarn
- MetaMask ou portefeuille Web3 compatible

## Installation

1. Cloner le dépôt :
```bash
git clone [repository-url]
cd ProjetJoul
```

2. Installer les dépendances pour le backend et le frontend :
```bash
# Installer les dépendances racines
npm install

# Installer les dépendances backend
cd backend
npm install

# Installer les dépendances frontend
cd ../frontend
npm install
```

3. Configurer les variables d'environnement :
- Créer des fichiers `.env` dans les répertoires backend et frontend
- Configurer les variables d'environnement nécessaires (URLs des réseaux, clés privées, etc.)

## Développement

### Lancer le Backend

```bash
cd backend

# Lancer le réseau local Hardhat
npx hardhat node

# Déployer les contrats
npx hardhat run scripts/deploy.ts --network localhost
```

### Lancer le Frontend

```bash
cd frontend
npm run dev
```

L'application sera disponible à l'adresse `http://localhost:3000`

## Tests

### Tests des Smart Contracts

```bash
cd backend
npx hardhat test
```

## Déploiement

### Smart Contracts

Le projet inclut des scripts de déploiement pour différents réseaux :
- `deployPolygon.ts` pour le mainnet Polygon
- `deployPolAmoy.ts` pour le testnet Amoy

### Frontend

Le frontend peut être déployé en utilisant Vercel ou des plateformes similaires :

```bash
cd frontend
npm run build
```

## Licence

[Informations de Licence]
