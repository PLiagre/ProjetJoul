// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
/**
 * @title JoulToken
 * @dev Token ERC20 pour le système d'échange d'énergie JOUL
 * - Mintable selon règles de récompenses
 * - Contrôle d'accès pour les rôles de minting
 * - Pausable en cas d'urgence
 * - Limites de minting quotidiennes
 */
contract JoulToken is ERC20Pausable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // Taux de récompense en pourcentage (base 1000)
    uint256 public constant PRODUCTION_REWARD_RATE = 10; // 1%
    uint256 public constant PURCHASE_REWARD_RATE = 5;    // 0.5%
    uint256 public constant SALE_REWARD_RATE = 5;       // 0.5%

    // Limites de minting quotidiennes
    uint256 public constant DAILY_MINT_LIMIT = 1000000 * 10**18; // 1M tokens
    mapping(uint256 => uint256) public dailyMintedAmount;

    event RewardMinted(
        address indexed to, 
        uint256 amount, 
        string rewardType,
        uint256 baseAmount
    );
    
    event DailyMintLimitUpdated(uint256 day, uint256 totalMinted);

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
        require(to != address(0), "Invalid recipient address");
        require(energyAmount > 0, "Amount must be positive");

        uint256 rewardAmount = (energyAmount * PRODUCTION_REWARD_RATE) / 1000;
        _mintWithLimit(to, rewardAmount);
        
        emit RewardMinted(to, rewardAmount, "PRODUCTION", energyAmount);
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
        require(to != address(0), "Invalid recipient address");
        require(purchaseAmount > 0, "Amount must be positive");

        uint256 rewardAmount = (purchaseAmount * PURCHASE_REWARD_RATE) / 1000;
        _mintWithLimit(to, rewardAmount);
        
        emit RewardMinted(to, rewardAmount, "PURCHASE", purchaseAmount);
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
        require(to != address(0), "Invalid recipient address");
        require(saleAmount > 0, "Amount must be positive");

        uint256 rewardAmount = (saleAmount * SALE_REWARD_RATE) / 1000;
        _mintWithLimit(to, rewardAmount);
        
        emit RewardMinted(to, rewardAmount, "SALE", saleAmount);
    }

    /**
     * @dev Mint interne avec vérification de la limite quotidienne
     */
    function _mintWithLimit(address to, uint256 amount) internal {
        uint256 day = block.timestamp / 1 days;
        uint256 currentDayMinted = dailyMintedAmount[day];
        uint256 newAmount = currentDayMinted + amount;
        
        require(newAmount <= DAILY_MINT_LIMIT, "Daily mint limit exceeded");
        
        dailyMintedAmount[day] = newAmount;
        _mint(to, amount);
        
        emit DailyMintLimitUpdated(day, newAmount);
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
