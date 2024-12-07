// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title JoulToken
 * @dev Token ERC20 pour le système d'échange d'énergie JOUL
 * - Mintable selon règles de récompenses
 * - Contrôle d'accès pour les rôles de minting
 * - Pausable en cas d'urgence
 */
contract JoulToken is ERC20, AccessControl, Pausable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // Taux de récompense en pourcentage (base 1000)
    uint256 public constant PRODUCTION_REWARD_RATE = 10; // 1%
    uint256 public constant PURCHASE_REWARD_RATE = 5;    // 0.5%
    uint256 public constant SALE_REWARD_RATE = 5;       // 0.5%

    event RewardMinted(address indexed to, uint256 amount, string rewardType);

    constructor() ERC20("JOUL Energy Token", "JOUL") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }

    /**
     * @dev Mint des tokens de récompense pour la production d'énergie
     * @param to Adresse du bénéficiaire
     * @param energyAmount Montant d'énergie produite (en Wh)
     */
    function mintProductionReward(address to, uint256 energyAmount) 
        external 
        onlyRole(MINTER_ROLE) 
        whenNotPaused 
    {
        uint256 rewardAmount = (energyAmount * PRODUCTION_REWARD_RATE) / 1000;
        _mint(to, rewardAmount);
        emit RewardMinted(to, rewardAmount, "PRODUCTION");
    }

    /**
     * @dev Mint des tokens de récompense pour l'achat d'énergie
     * @param to Adresse du bénéficiaire
     * @param purchaseAmount Montant de l'achat en MATIC
     */
    function mintPurchaseReward(address to, uint256 purchaseAmount) 
        external 
        onlyRole(MINTER_ROLE) 
        whenNotPaused 
    {
        uint256 rewardAmount = (purchaseAmount * PURCHASE_REWARD_RATE) / 1000;
        _mint(to, rewardAmount);
        emit RewardMinted(to, rewardAmount, "PURCHASE");
    }

    /**
     * @dev Mint des tokens de récompense pour la vente d'énergie
     * @param to Adresse du bénéficiaire
     * @param saleAmount Montant de la vente en MATIC
     */
    function mintSaleReward(address to, uint256 saleAmount) 
        external 
        onlyRole(MINTER_ROLE) 
        whenNotPaused 
    {
        uint256 rewardAmount = (saleAmount * SALE_REWARD_RATE) / 1000;
        _mint(to, rewardAmount);
        emit RewardMinted(to, rewardAmount, "SALE");
    }

    /**
     * @dev Pause toutes les opérations de minting
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Reprend les opérations de minting
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Override requis par Solidity
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
