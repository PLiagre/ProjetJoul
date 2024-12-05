// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./JoulToken.sol";
import "./EnergyNFT.sol";

/**
 * @title EnergyExchange
 * @dev Main contract for the JOUL Energy Exchange platform
 */
contract EnergyExchange is AccessControl, ReentrancyGuard {
    bytes32 public constant ENEDIS_ROLE = keccak256("ENEDIS_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // Fee distribution (in basis points, 10000 = 100%)
    uint16 public constant PRODUCER_SHARE = 7500;    // 75%
    uint16 public constant ENEDIS_SHARE = 2000;     // 20%
    uint16 public constant PLATFORM_FEE = 300;      // 3%
    uint16 public constant POOL_SHARE = 200;        // 2%

    // Lock period for ENEDIS validation
    uint256 public constant LOCK_PERIOD = 24 hours;

    JoulToken public joulToken;
    EnergyNFT public energyNFT;
    address public enedisAddress;
    address public poolAddress;
    address public platformAddress;

    struct EnergyOffer {
        address producer;
        uint256 quantity;         // in Wh
        uint256 pricePerUnit;     // in wei per Wh
        string energyType;
        uint256 timestamp;
        bool active;
        bool validated;
        address buyer;
        uint256 lockExpiry;
    }

    // Mapping from offer ID to offer details
    mapping(uint256 => EnergyOffer) public offers;
    uint256 private _nextOfferId;

    // Events
    event OfferCreated(
        uint256 indexed offerId,
        address indexed producer,
        uint256 quantity,
        uint256 pricePerUnit,
        string energyType
    );

    event OfferPurchased(
        uint256 indexed offerId,
        address indexed buyer,
        uint256 totalPrice
    );

    event OfferValidated(
        uint256 indexed offerId,
        address indexed validator
    );

    event OfferReverted(
        uint256 indexed offerId,
        string reason
    );

    constructor(
        address _joulToken,
        address _energyNFT,
        address _enedisAddress,
        address _poolAddress,
        address _platformAddress
    ) {
        require(_joulToken != address(0), "Invalid JOUL token address");
        require(_energyNFT != address(0), "Invalid NFT address");
        require(_enedisAddress != address(0), "Invalid ENEDIS address");
        require(_poolAddress != address(0), "Invalid pool address");
        require(_platformAddress != address(0), "Invalid platform address");

        joulToken = JoulToken(_joulToken);
        energyNFT = EnergyNFT(_energyNFT);
        enedisAddress = _enedisAddress;
        poolAddress = _poolAddress;
        platformAddress = _platformAddress;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ENEDIS_ROLE, _enedisAddress);
        _grantRole(OPERATOR_ROLE, msg.sender);
    }

    /**
     * @dev Create a new energy offer
     * @param quantity Amount of energy in Wh
     * @param pricePerUnit Price per Wh in wei
     * @param energyType Type of energy being offered
     */
    function createOffer(
        uint256 quantity,
        uint256 pricePerUnit,
        string memory energyType
    ) external returns (uint256) {
        require(quantity > 0, "Quantity must be positive");
        require(pricePerUnit > 0, "Price must be positive");

        uint256 offerId = _nextOfferId++;

        offers[offerId] = EnergyOffer({
            producer: msg.sender,
            quantity: quantity,
            pricePerUnit: pricePerUnit,
            energyType: energyType,
            timestamp: block.timestamp,
            active: true,
            validated: false,
            buyer: address(0),
            lockExpiry: 0
        });

        emit OfferCreated(
            offerId,
            msg.sender,
            quantity,
            pricePerUnit,
            energyType
        );

        return offerId;
    }

    /**
     * @dev Purchase an energy offer
     * @param offerId ID of the offer to purchase
     */
    function purchaseOffer(uint256 offerId) external payable nonReentrant {
        EnergyOffer storage offer = offers[offerId];
        require(offer.active, "Offer is not active");
        require(!offer.validated, "Offer already validated");
        require(offer.buyer == address(0), "Offer already purchased");
        
        uint256 totalPrice = offer.quantity * offer.pricePerUnit;
        require(msg.value == totalPrice, "Incorrect payment amount");

        offer.buyer = msg.sender;
        offer.lockExpiry = block.timestamp + LOCK_PERIOD;

        emit OfferPurchased(offerId, msg.sender, totalPrice);
    }

    /**
     * @dev Validate an offer (ENEDIS only)
     * @param offerId ID of the offer to validate
     * @param tokenURI IPFS URI for the NFT metadata
     */
    function validateOffer(uint256 offerId, string memory tokenURI) 
        external 
        onlyRole(ENEDIS_ROLE) 
    {
        EnergyOffer storage offer = offers[offerId];
        require(offer.buyer != address(0), "Offer not purchased");
        require(block.timestamp <= offer.lockExpiry, "Lock period expired");
        require(!offer.validated, "Already validated");

        // Calculate fee distribution
        uint256 totalAmount = offer.quantity * offer.pricePerUnit;
        uint256 producerAmount = (totalAmount * PRODUCER_SHARE) / 10000;
        uint256 enedisAmount = (totalAmount * ENEDIS_SHARE) / 10000;
        uint256 platformAmount = (totalAmount * PLATFORM_FEE) / 10000;
        uint256 poolAmount = (totalAmount * POOL_SHARE) / 10000;

        // Distribute payments
        (bool producerSuccess,) = offer.producer.call{value: producerAmount}("");
        (bool enedisSuccess,) = enedisAddress.call{value: enedisAmount}("");
        (bool platformSuccess,) = platformAddress.call{value: platformAmount}("");
        (bool poolSuccess,) = poolAddress.call{value: poolAmount}("");

        require(producerSuccess && enedisSuccess && platformSuccess && poolSuccess, 
                "Payment distribution failed");

        // Mint NFT to buyer
        energyNFT.mintEnergyNFT(
            offer.buyer,
            offer.quantity,
            offer.energyType,
            tokenURI
        );

        // Mint JOUL rewards
        joulToken.mintProductionReward(offer.producer, offer.quantity);
        joulToken.mintSaleReward(offer.producer, totalAmount);
        joulToken.mintPurchaseReward(offer.buyer, totalAmount);

        offer.validated = true;
        offer.active = false;

        emit OfferValidated(offerId, msg.sender);
    }

    /**
     * @dev Revert an offer if validation fails or lock period expires
     * @param offerId ID of the offer to revert
     */
    function revertOffer(uint256 offerId) external {
        EnergyOffer storage offer = offers[offerId];
        require(offer.buyer != address(0), "Offer not purchased");
        require(!offer.validated, "Offer already validated");
        require(
            block.timestamp > offer.lockExpiry || 
            hasRole(ENEDIS_ROLE, msg.sender),
            "Cannot revert: lock period active"
        );

        uint256 refundAmount = offer.quantity * offer.pricePerUnit;
        (bool success,) = offer.buyer.call{value: refundAmount}("");
        require(success, "Refund failed");

        offer.buyer = address(0);
        offer.lockExpiry = 0;
        offer.active = true;

        emit OfferReverted(offerId, "Validation failed or lock period expired");
    }

    /**
     * @dev Get active offer details
     * @param offerId ID of the offer
     */
    function getOffer(uint256 offerId) external view returns (
        address producer,
        uint256 quantity,
        uint256 pricePerUnit,
        string memory energyType,
        uint256 timestamp,
        bool active,
        bool validated,
        address buyer,
        uint256 lockExpiry
    ) {
        EnergyOffer memory offer = offers[offerId];
        return (
            offer.producer,
            offer.quantity,
            offer.pricePerUnit,
            offer.energyType,
            offer.timestamp,
            offer.active,
            offer.validated,
            offer.buyer,
            offer.lockExpiry
        );
    }

    /**
     * @dev Update ENEDIS address
     * @param newEnedisAddress New address for ENEDIS
     */
    function updateEnedisAddress(address newEnedisAddress) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(newEnedisAddress != address(0), "Invalid address");
        _revokeRole(ENEDIS_ROLE, enedisAddress);
        _grantRole(ENEDIS_ROLE, newEnedisAddress);
        enedisAddress = newEnedisAddress;
    }

    /**
     * @dev Update pool address
     * @param newPoolAddress New address for the pool
     */
    function updatePoolAddress(address newPoolAddress) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(newPoolAddress != address(0), "Invalid address");
        poolAddress = newPoolAddress;
    }

    /**
     * @dev Update platform address
     * @param newPlatformAddress New address for the platform
     */
    function updatePlatformAddress(address newPlatformAddress) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(newPlatformAddress != address(0), "Invalid address");
        platformAddress = newPlatformAddress;
    }
}
