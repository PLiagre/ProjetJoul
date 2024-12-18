// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./JoulToken.sol";
import "./EnergyNFT.sol";
import "./UserManagement.sol";

/**
 * @title EnergyExchange
 * @dev Contrat principal pour l'échange d'énergie
 * - Gestion des offres d'énergie
 * - Distribution des frais
 * - Intégration avec ENEDIS
 * - Système de validation avec limite de 24h
 */
contract EnergyExchange is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant ENEDIS_ROLE = keccak256("ENEDIS_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    JoulToken public immutable joulToken;
    EnergyNFT public immutable energyNFT;
    UserManagement public immutable userManagement;

    // Paramètres de distribution des frais (base 1000)
    uint256 public constant PRODUCER_SHARE = 750;  // 75%
    uint256 public constant ENEDIS_SHARE = 200;   // 20%
    uint256 public constant PLATFORM_SHARE = 30;   // 3%
    uint256 public constant POOL_SHARE = 20;      // 2%

// Constante pour 1 JOUL avec 18 décimales (1 * 10^18)
uint256 private constant ONE_JOUL = 1000000000000000000;

    struct EnergyOffer {
        address producer;
        uint256 quantity;     // Wh
        uint256 pricePerUnit; // MATIC par Wh
        string energyType;
        uint256 timestamp;
        bool isActive;
        address buyer;
        bool isValidated;
        bool isCompleted;
        bool isPendingCreation; // New field for creation validation
    }

    mapping(uint256 => EnergyOffer) public offers;
    mapping(uint256 => uint256) public offerLocks; // offerId => timestamp
    uint256 private _nextOfferId;

    address public immutable enedisAddress;
    address public immutable poolAddress;
    uint256 public constant VALIDATION_DEADLINE = 24 hours;

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
        bool success
    );

    event OfferCreationValidated(
        uint256 indexed offerId,
        bool success
    );

    event FeesDistributed(
        uint256 indexed offerId,
        uint256 producerAmount,
        uint256 enedisAmount,
        uint256 platformAmount,
        uint256 poolAmount
    );

    event UserAdded(
        address indexed user,
        bool isProducer
    );

    event UserRemoved(
        address indexed user
    );

    constructor(
        address _joulToken,
        address _energyNFT,
        address _userManagement,
        address _enedisAddress,
        address _poolAddress
    ) {
        require(_joulToken != address(0), "Invalid JoulToken address");
        require(_energyNFT != address(0), "Invalid EnergyNFT address");
        require(_userManagement != address(0), "Invalid UserManagement address");
        require(_enedisAddress != address(0), "Invalid ENEDIS address");
        require(_poolAddress != address(0), "Invalid pool address");

        joulToken = JoulToken(_joulToken);
        energyNFT = EnergyNFT(_energyNFT);
        userManagement = UserManagement(_userManagement);
        enedisAddress = _enedisAddress;
        poolAddress = _poolAddress;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ENEDIS_ROLE, _enedisAddress);
        _grantRole(PAUSER_ROLE, msg.sender);
    }

    /**
     * @dev Ajoute un nouvel utilisateur
     */
    function addUser(address user, bool isProducer) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE)
        whenNotPaused 
    {
        userManagement.addUser(user, isProducer);
        emit UserAdded(user, isProducer);
    }

    /**
     * @dev Supprime un utilisateur
     */
    function removeUser(address user) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE)
        whenNotPaused 
    {
        userManagement.removeUser(user);
        emit UserRemoved(user);
    }

    /**
     * @dev Crée une nouvelle offre d'énergie (en attente de validation)
     */
    function createOffer(
        uint256 quantity,
        uint256 pricePerUnit,
        string memory energyType
    ) external whenNotPaused returns (uint256) {
        require(quantity > 0, "Quantity must be positive");
        require(pricePerUnit > 0, "Price must be positive");
        require(userManagement.isProducer(msg.sender), "Not a producer");

        uint256 offerId = _nextOfferId++;

        offers[offerId] = EnergyOffer({
            producer: msg.sender,
            quantity: quantity,
            pricePerUnit: pricePerUnit,
            energyType: energyType,
            timestamp: block.timestamp,
            isActive: false, // Initially not active until validated
            buyer: address(0),
            isValidated: false,
            isCompleted: false,
            isPendingCreation: true // New offer pending validation
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
     * @dev Validation de la création d'offre par ENEDIS
     */
    function validateOfferCreation(uint256 offerId, bool isValid) 
        external 
        onlyRole(ENEDIS_ROLE) 
        whenNotPaused 
    {
        EnergyOffer storage offer = offers[offerId];
        require(offer.isPendingCreation, "Offer not pending creation");
        require(!offer.isActive, "Offer already active");

        offer.isPendingCreation = false;
        
        if (isValid) {
            offer.isActive = true;
            // Mint JOUL tokens using the contract's PRODUCTION_REWARD_RATE
            joulToken.mintProductionReward(offer.producer, offer.quantity);
        }

        emit OfferCreationValidated(offerId, isValid);
    }

    /**
     * @dev Achète une offre d'énergie
     */
    function purchaseOffer(uint256 offerId) 
        external 
        payable 
        whenNotPaused 
        nonReentrant 
    {
        require(userManagement.isConsumer(msg.sender), "Not a consumer");
        
        EnergyOffer storage offer = offers[offerId];
        require(offer.isActive, "Offer is not active");
        require(!offer.isCompleted, "Offer already completed");
        require(offer.buyer == address(0), "Offer already purchased");
        require(!offer.isPendingCreation, "Offer pending creation validation");

        uint256 totalPrice = offer.quantity * offer.pricePerUnit;
        require(msg.value == totalPrice, "Incorrect payment amount");

        offer.buyer = msg.sender;
        offer.isActive = false;
        offerLocks[offerId] = block.timestamp;

        emit OfferPurchased(offerId, msg.sender, totalPrice);
    }

    /**
     * @dev Validation ENEDIS et distribution des fonds
     * L'offre doit être validée dans les 24h suivant l'achat
     */
    function validateAndDistribute(uint256 offerId, bool isValid) 
        external 
        onlyRole(ENEDIS_ROLE) 
        whenNotPaused 
        nonReentrant
    {
        EnergyOffer storage offer = offers[offerId];
        require(!offer.isCompleted, "Offer already completed");
        require(offer.buyer != address(0), "Offer not purchased");
        require(
            block.timestamp <= offerLocks[offerId] + VALIDATION_DEADLINE,
            "Validation deadline exceeded"
        );

        offer.isValidated = isValid;
        offer.isCompleted = true;

        emit OfferValidated(offerId, isValid);

        if (isValid) {
            _distributeFeesAndRewards(offerId);
        } else {
            // Remboursement de l'acheteur en cas d'échec
            uint256 totalPrice = offer.quantity * offer.pricePerUnit;
            (bool success,) = payable(offer.buyer).call{value: totalPrice}("");
            require(success, "Refund failed");
        }
    }

    /**
     * @dev Annule une offre si elle n'a pas été validée dans les 24h
     */
    function cancelExpiredOffer(uint256 offerId)
        external
        whenNotPaused
        nonReentrant
    {
        EnergyOffer storage offer = offers[offerId];
        require(!offer.isCompleted, "Offer already completed");
        require(offer.buyer != address(0), "Offer not purchased");
        require(
            block.timestamp > offerLocks[offerId] + VALIDATION_DEADLINE,
            "Validation deadline not exceeded"
        );

        offer.isCompleted = true;
        offer.isValidated = false;

        // Remboursement automatique de l'acheteur
        uint256 totalPrice = offer.quantity * offer.pricePerUnit;
        (bool success,) = payable(offer.buyer).call{value: totalPrice}("");
        require(success, "Refund failed");

        emit OfferValidated(offerId, false);
    }

    /**
     * @dev Distribution interne des frais et récompenses
     */
    function _distributeFeesAndRewards(uint256 offerId) private {
        EnergyOffer storage offer = offers[offerId];
        uint256 totalAmount = offer.quantity * offer.pricePerUnit;
        
        // Calcul des parts
        uint256 producerAmount = (totalAmount * PRODUCER_SHARE) / 1000;
        uint256 enedisAmount = (totalAmount * ENEDIS_SHARE) / 1000;
        uint256 platformAmount = (totalAmount * PLATFORM_SHARE) / 1000;
        uint256 poolAmount = (totalAmount * POOL_SHARE) / 1000;

        // Transferts MATIC
        (bool producerSuccess,) = payable(offer.producer).call{value: producerAmount}("");
        require(producerSuccess, "Producer transfer failed");

        (bool enedisSuccess,) = payable(enedisAddress).call{value: enedisAmount}("");
        require(enedisSuccess, "ENEDIS transfer failed");

        (bool poolSuccess,) = payable(poolAddress).call{value: poolAmount}("");
        require(poolSuccess, "Pool transfer failed");

        // Mint 0.5 JOUL each to producer and consumer
        // Since JoulToken applies its own rates (0.5%), we need to pass 100 JOUL to get 0.5 JOUL
        joulToken.mintSaleReward(offer.producer, ONE_JOUL * 100);
        joulToken.mintPurchaseReward(offer.buyer, ONE_JOUL * 100);

        // Mint du NFT pour l'acheteur
        string memory uri = _generateTokenURI(offerId);
        energyNFT.mintCertificate(
            offer.buyer,
            offer.quantity,
            offer.energyType,
            uri
        );

        emit FeesDistributed(
            offerId,
            producerAmount,
            enedisAmount,
            platformAmount,
            poolAmount
        );
    }

    /**
     * @dev Génère l'URI des métadonnées pour le NFT
     * Note: Dans une version production, ceci devrait être lié à IPFS
     */
    function _generateTokenURI(uint256 offerId) 
        private 
        pure 
        returns (string memory) 
    {
        // Placeholder - à implémenter avec IPFS
        return string(abi.encodePacked("ipfs://", uint2str(offerId)));
    }

    /**
     * @dev Convertit un uint en string
     */
    function uint2str(uint256 _i) 
        private 
        pure 
        returns (string memory str) 
    {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        j = _i;
        while (j != 0) {
            bstr[--k] = bytes1(uint8(48 + j % 10));
            j /= 10;
        }
        str = string(bstr);
    }

    /**
     * @dev Pause le contrat
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Reprend les opérations
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
