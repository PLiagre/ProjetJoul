// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title JoulToken
 * @dev Implementation of the JOUL token with reward minting capabilities
 */
contract JoulToken is ERC20, ERC20Pausable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // Reward rates in basis points (1/10000)
    uint16 public constant PRODUCTION_REWARD_RATE = 100; // 1%
    uint16 public constant PURCHASE_REWARD_RATE = 50;    // 0.5%
    uint16 public constant SALE_REWARD_RATE = 50;       // 0.5%

    event RewardMinted(address indexed to, uint256 amount, string rewardType);

    constructor() ERC20("JOUL Energy Token", "JOUL") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }

    /**
     * @dev Mint rewards based on energy production
     * @param to Address receiving the rewards
     * @param energyAmount Amount of energy produced in Wh
     */
    function mintProductionReward(address to, uint256 energyAmount) 
        external
        onlyRole(MINTER_ROLE)
        whenNotPaused
    {
        uint256 rewardAmount = (energyAmount * PRODUCTION_REWARD_RATE) / 10000;
        _mint(to, rewardAmount);
        emit RewardMinted(to, rewardAmount, "PRODUCTION");
    }

    /**
     * @dev Mint rewards based on energy purchase
     * @param to Address receiving the rewards
     * @param purchaseAmount Amount of the purchase in wei
     */
    function mintPurchaseReward(address to, uint256 purchaseAmount)
        external
        onlyRole(MINTER_ROLE)
        whenNotPaused
    {
        uint256 rewardAmount = (purchaseAmount * PURCHASE_REWARD_RATE) / 10000;
        _mint(to, rewardAmount);
        emit RewardMinted(to, rewardAmount, "PURCHASE");
    }

    /**
     * @dev Mint rewards based on energy sale
     * @param to Address receiving the rewards
     * @param saleAmount Amount of the sale in wei
     */
    function mintSaleReward(address to, uint256 saleAmount)
        external
        onlyRole(MINTER_ROLE)
        whenNotPaused
    {
        uint256 rewardAmount = (saleAmount * SALE_REWARD_RATE) / 10000;
        _mint(to, rewardAmount);
        emit RewardMinted(to, rewardAmount, "SALE");
    }

    /**
     * @dev Pause token transfers and minting
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause token transfers and minting
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Required override for _update function from both ERC20 and ERC20Pausable
     */
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal virtual override(ERC20, ERC20Pausable) {
        super._update(from, to, amount);
    }

    /**
     * @dev Required override for supportsInterface from AccessControl
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
