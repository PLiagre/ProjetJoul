// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./JoulToken.sol";
import "./EnergyNFT.sol";
import "./UserManagement.sol";

/**
 * @title EnergyExchange
 * @dev Contrat principal pour l'échange d'énergie
 * - Gestion des offres d'énergie
 * - Distribution des frais
 * - Intégration avec ENEDIS
 */
contract EnergyExchange is AccessControl, Pausable, ReentrancyGuard {
    using Address for address payable;
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

    // Limites de sécurité
    uint256 public constant MAX_QUANTITY = 1000000000; // 1 GWh
    uint256 public constant MAX_PRICE_PER_UNIT = 1000000000000000000; // 1 MATIC
    uint256 public constant MAX_ENERGY_TYPE_LENGTH = 32;
    uint256 public constant VALIDATION_DEADLINE = 24 hours;

    struct EnergyOffer {
        address producer;
        uint256 quantity;     // Wh
        uint256 pricePerUnit; // MATIC par Wh
        string energyType;
        bool isActive;
        address buyer;
        bool isValidated;
        bool isCompleted;
        bool isPendingCreation;
        string ipfsUri;       // URI IPFS pour les métadonnées du NFT
        uint256 purchaseTimestamp; // Timestamp when the offer was purchased
    }

    mapping(uint256 => EnergyOffer) public offers;
    mapping(address => bytes32) public commitments; // Protection contre le front-running
    uint256 private _nextOfferId;

    address public immutable enedisAddress;
    address public immutable poolAddress;

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

    event CommitmentSubmitted(
        address indexed user,
        bytes32 commitment
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

    function addUser(address user, bool isProducer) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE)
        whenNotPaused 
    {
        require(user != address(0), "Invalid user address");
        emit UserAdded(user, isProducer);
        userManagement.addUser(user, isProducer);
    }

    function removeUser(address user) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE)
        whenNotPaused 
    {
        require(user != address(0), "Invalid user address");
        emit UserRemoved(user);
        userManagement.initiateUserRemoval(user);
    }

    function commitToPurchase(bytes32 commitment) 
        external 
        whenNotPaused 
    {
        require(userManagement.isConsumer(msg.sender), "Not a consumer");
        require(commitment != bytes32(0), "Invalid commitment");
        commitments[msg.sender] = commitment;
        emit CommitmentSubmitted(msg.sender, commitment);
    }

    function createOffer(
        uint256 quantity,
        uint256 pricePerUnit,
        string memory energyType
    ) external whenNotPaused returns (uint256) {
        require(quantity > 0 && quantity <= MAX_QUANTITY, "Invalid quantity");
        require(pricePerUnit > 0 && pricePerUnit <= MAX_PRICE_PER_UNIT, "Invalid price");
        require(bytes(energyType).length <= MAX_ENERGY_TYPE_LENGTH, "Energy type too long");
        require(userManagement.isProducer(msg.sender), "Not a producer");

        uint256 offerId = _nextOfferId++;

        offers[offerId] = EnergyOffer({
            producer: msg.sender,
            quantity: quantity,
            pricePerUnit: pricePerUnit,
            energyType: energyType,
            isActive: false,
            buyer: address(0),
            isValidated: false,
            isCompleted: false,
            isPendingCreation: true,
            ipfsUri: "",
            purchaseTimestamp: 0
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

    function validateOfferCreation(uint256 offerId, bool isValid, string memory ipfsUri) 
        external 
        onlyRole(ENEDIS_ROLE) 
        whenNotPaused 
        nonReentrant
    {
        require(bytes(ipfsUri).length > 0, "IPFS URI cannot be empty");
        EnergyOffer storage offer = offers[offerId];
        require(offer.isPendingCreation, "Offer not pending creation");
        require(!offer.isActive, "Offer already active");

        // Calculate reward amount before state changes
        uint256 rewardAmount = 0;
        if (isValid) {
            rewardAmount = (offer.quantity * ONE_JOUL) / 1000;
            require(rewardAmount > 0, "Production reward amount must be positive");
        }

        // Update state
        offer.ipfsUri = ipfsUri;
        offer.isPendingCreation = false;
        if (isValid) {
            offer.isActive = true;
        }

        // Emit event
        emit OfferCreationValidated(offerId, isValid);

        // External interactions last
        if (isValid && rewardAmount > 0) {
            joulToken.mintProductionReward(offer.producer, rewardAmount);
        }
    }

    function purchaseOffer(uint256 offerId, bytes32 secret) 
        external 
        payable 
        whenNotPaused 
        nonReentrant 
    {
        require(userManagement.isConsumer(msg.sender), "Not a consumer");
        require(keccak256(abi.encodePacked(secret)) == commitments[msg.sender], "Invalid commitment");
        delete commitments[msg.sender];
        
        EnergyOffer storage offer = offers[offerId];
        require(offer.isActive, "Offer is not active");
        require(!offer.isCompleted, "Offer already completed");
        require(offer.buyer == address(0), "Offer already purchased");
        require(!offer.isPendingCreation, "Offer pending creation validation");

        uint256 totalPrice = offer.quantity * offer.pricePerUnit;
        require(msg.value == totalPrice, "Incorrect payment amount");

        offer.buyer = msg.sender;
        offer.isActive = false;
        offer.purchaseTimestamp = block.timestamp;

        emit OfferPurchased(offerId, msg.sender, totalPrice);
    }

    function validateAndDistribute(uint256 offerId, bool isValid) 
        external 
        whenNotPaused 
        nonReentrant 
        returns (bool)
    {
        // Check if offer exists and get it
        require(offerId < _nextOfferId, "Invalid offer ID");
        EnergyOffer storage offer = offers[offerId];
        
        // Validate offer state
        require(offer.producer != address(0), "Offer does not exist");
        require(!offer.isCompleted, "Offer already completed");
        require(offer.buyer != address(0), "Offer not purchased");
        require(!offer.isPendingCreation, "Offer creation not validated");
        require(block.timestamp <= offer.purchaseTimestamp + VALIDATION_DEADLINE, "Validation deadline exceeded");
        // Calculate refund amount before state changes
        uint256 totalPrice = offer.quantity * offer.pricePerUnit;

        // Update state
        offer.isValidated = isValid;
        offer.isCompleted = true;

        // Emit event
        emit OfferValidated(offerId, isValid);

        // Handle validation result
        if (isValid) {
            _distributeFeesAndRewards(offerId);
        } else {
            (bool success, ) = payable(offer.buyer).call{value: totalPrice}("");
            require(success, "Refund transfer failed");
        }
        return true;
    }

    function _distributeFeesAndRewards(uint256 offerId) private {
        EnergyOffer storage offer = offers[offerId];
        
        // Vérifications préalables
        require(offer.producer != address(0), "Invalid producer address");
        require(offer.buyer != address(0), "Invalid buyer address");
        
        // Calculs des montants
        uint256 totalAmount = offer.quantity * offer.pricePerUnit;
        uint256 producerAmount = (totalAmount * PRODUCER_SHARE) / 1000;
        uint256 enedisAmount = (totalAmount * ENEDIS_SHARE) / 1000;
        uint256 platformAmount = (totalAmount * PLATFORM_SHARE) / 1000;
        uint256 poolAmount = (totalAmount * POOL_SHARE) / 1000;
        uint256 fixedReward = ONE_JOUL / 2; // 0.5 JOUL

        require(
            producerAmount + enedisAmount + platformAmount + poolAmount == totalAmount,
            "Distribution amount mismatch"
        );

        // Émettre l'événement avant les interactions externes
        emit FeesDistributed(
            offerId,
            producerAmount,
            enedisAmount,
            platformAmount,
            poolAmount
        );

        // Transfert direct des MATIC
        (bool producerSuccess, ) = payable(offer.producer).call{value: producerAmount}("");
        require(producerSuccess, "Producer transfer failed");

        (bool enedisSuccess, ) = payable(enedisAddress).call{value: enedisAmount}("");
        require(enedisSuccess, "Enedis transfer failed");

        (bool poolSuccess, ) = payable(poolAddress).call{value: poolAmount}("");
        require(poolSuccess, "Pool transfer failed");

        // Minting des récompenses
        joulToken.mintSaleReward(offer.producer, fixedReward);
        joulToken.mintPurchaseReward(offer.buyer, fixedReward);
        
        // Mint du NFT au producteur comme preuve de production
        energyNFT.mintCertificate(
            offer.producer,
            offer.quantity,
            offer.energyType,
            offer.ipfsUri
        );
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
