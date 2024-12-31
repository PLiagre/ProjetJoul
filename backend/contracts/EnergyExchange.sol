// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "hardhat/console.sol";
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
        userManagement.addUser(user, isProducer);
        emit UserAdded(user, isProducer);
    }

    function removeUser(address user) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE)
        whenNotPaused 
    {
        require(user != address(0), "Invalid user address");
        userManagement.initiateUserRemoval(user);
        emit UserRemoved(user);
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
            isPendingCreation: true
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
            // Calculate 0.1% of the energy amount in Wh, then convert to JOUL
            uint256 rewardAmount = (offer.quantity * ONE_JOUL) / 1000000; // (Wh * 10^18) / (1000 * 1000)
            console.log("Minting production reward:", offer.producer, rewardAmount);
            require(rewardAmount > 0, "Production reward amount must be positive");
            joulToken.mintProductionReward(offer.producer, rewardAmount);
            console.log("Production reward minted successfully");
        }

        emit OfferCreationValidated(offerId, isValid);
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

        emit OfferPurchased(offerId, msg.sender, totalPrice);
    }

    function validateAndDistribute(uint256 offerId, bool isValid) 
        external 
        whenNotPaused 
        nonReentrant 
        returns (bool)
    {
        console.log("\n=== validateAndDistribute called ===");
        console.log("Transaction sender:", msg.sender);
        
        // Debug: Check if caller has ENEDIS_ROLE
        console.log("Caller address:", msg.sender);
        console.log("Has ENEDIS_ROLE:", hasRole(ENEDIS_ROLE, msg.sender));

        // Debug: Check if EnergyExchange has MINTER_ROLE
        bytes32 minterRole = joulToken.MINTER_ROLE();
        console.log("EnergyExchange address:", address(this));
        console.log("Has MINTER_ROLE:", joulToken.hasRole(minterRole, address(this)));

        console.log("Starting validateAndDistribute for offer:", offerId);
        console.log("isValid:", isValid);
        
        // Check if offer exists and get it
        require(offerId < _nextOfferId, "Invalid offer ID");
        EnergyOffer storage offer = offers[offerId];
        console.log("\nOffer State:");
        console.log("Producer:", offer.producer);
        console.log("Buyer:", offer.buyer);
        console.log("isActive:", offer.isActive);
        console.log("isValidated:", offer.isValidated);
        console.log("isCompleted:", offer.isCompleted);
        console.log("isPendingCreation:", offer.isPendingCreation);
        
        // Validate offer state
        require(offer.producer != address(0), "Offer does not exist");
        require(!offer.isCompleted, "Offer already completed");
        require(offer.buyer != address(0), "Offer not purchased");
        require(!offer.isPendingCreation, "Offer creation not validated");
        console.log("\nOffer state validation passed");

        // Calculate refund amount before state changes
        uint256 totalPrice = offer.quantity * offer.pricePerUnit;
        console.log("Total price:", totalPrice);

        // Update state
        offer.isValidated = isValid;
        offer.isCompleted = true;
        console.log("Offer state updated. isValidated:", isValid, "isCompleted: true");

        // Emit event
        emit OfferValidated(offerId, isValid);
        console.log("OfferValidated event emitted");

        // Handle validation result
        if (isValid) {
            console.log("Offer is valid, proceeding with distribution");
            _distributeFeesAndRewards(offerId);
        } else {
            console.log("Offer is invalid, proceeding with refund");
            (bool success, ) = payable(offer.buyer).call{value: totalPrice}("");
            require(success, "Refund transfer failed");
            console.log("Refund completed successfully");
        }
        return true;
    }

    function _distributeFeesAndRewards(uint256 offerId) private {
        console.log("Starting distribution for offer:", offerId);
        
        EnergyOffer storage offer = offers[offerId];
        uint256 totalAmount = offer.quantity * offer.pricePerUnit;
        console.log("Total amount:", totalAmount);
        
        uint256 producerAmount = (totalAmount * PRODUCER_SHARE) / 1000;
        uint256 enedisAmount = (totalAmount * ENEDIS_SHARE) / 1000;
        uint256 platformAmount = (totalAmount * PLATFORM_SHARE) / 1000;
        uint256 poolAmount = (totalAmount * POOL_SHARE) / 1000;
        
        console.log("Calculated shares:");
        console.log("Producer:", producerAmount);
        console.log("Enedis:", enedisAmount);
        console.log("Platform:", platformAmount);
        console.log("Pool:", poolAmount);
        console.log("Sum:", producerAmount + enedisAmount + platformAmount + poolAmount);
        console.log("Total:", totalAmount);

        require(
            producerAmount + enedisAmount + platformAmount + poolAmount == totalAmount,
            "Distribution amount mismatch"
        );

        console.log("Sending to producer");
        console.log("Address:", offer.producer);
        console.log("Amount:", producerAmount);
        payable(offer.producer).sendValue(producerAmount);
        console.log("Sent to producer");

        console.log("Sending to Enedis");
        console.log("Address:", enedisAddress);
        console.log("Amount:", enedisAmount);
        payable(enedisAddress).sendValue(enedisAmount);
        console.log("Sent to Enedis");

        console.log("Sending to pool");
        console.log("Address:", poolAddress);
        console.log("Amount:", poolAmount);
        payable(poolAddress).sendValue(poolAmount);
        console.log("Sent to pool");

        // Fixed reward of 0.5 JOUL for both sale and purchase
        uint256 fixedReward = ONE_JOUL / 2; // 0.5 JOUL
        console.log("Fixed reward amount:", fixedReward);
        
        // Verify addresses before minting
        require(offer.producer != address(0), "Invalid producer address for minting");
        require(offer.buyer != address(0), "Invalid buyer address for minting");
        
        console.log("Attempting to mint sale reward");
        console.log("Producer address:", offer.producer);
        console.log("Reward amount:", fixedReward);
        
        // Check if EnergyExchange has MINTER_ROLE
        bytes32 minterRole = joulToken.MINTER_ROLE();
        bool hasMinterRole = joulToken.hasRole(minterRole, address(this));
        console.log("EnergyExchange has MINTER_ROLE:", hasMinterRole);

        // Get current day's minted amount
        uint256 day = block.timestamp / 1 days;
        uint256 currentDayMinted = joulToken.dailyMintedAmount(day);
        console.log("Current day minted amount:", currentDayMinted);
        
        try joulToken.mintSaleReward(offer.producer, fixedReward) {
            console.log("Sale reward minted successfully");
        } catch Error(string memory reason) {
            console.log("Sale reward minting failed with Error:", reason);
            console.log("Checking potential issues:");
            console.log("Producer address:", offer.producer);
            console.log("Reward amount:", fixedReward);
            console.log("Daily mint limit:", joulToken.DAILY_MINT_LIMIT());
            console.log("Current day minted:", currentDayMinted);
            revert(string(abi.encodePacked("Sale reward minting failed: ", reason)));
        } catch Panic(uint errorCode) {
            string memory panicReason;
            if (errorCode == 0x01) panicReason = "Assertion failed";
            else if (errorCode == 0x11) panicReason = "Arithmetic overflow";
            else if (errorCode == 0x12) panicReason = "Division by zero";
            else panicReason = "Unknown panic code";
            console.log("Sale reward minting failed with Panic:", panicReason);
            revert(string(abi.encodePacked("Sale reward minting failed with panic: ", panicReason)));
        } catch (bytes memory err) {
            console.log("Sale reward minting failed with low-level error");
            revert("Sale reward minting failed with low-level error");
        }
        
        console.log("Attempting to mint purchase reward");
        console.log("Buyer address:", offer.buyer);
        console.log("Reward amount:", fixedReward);
        
        try joulToken.mintPurchaseReward(offer.buyer, fixedReward) {
            console.log("Purchase reward minted successfully");
        } catch Error(string memory reason) {
            console.log("Purchase reward minting failed with Error:", reason);
            console.log("Checking potential issues:");
            console.log("Buyer address:", offer.buyer);
            console.log("Reward amount:", fixedReward);
            console.log("Daily mint limit:", joulToken.DAILY_MINT_LIMIT());
            console.log("Current day minted:", currentDayMinted);
            revert(string(abi.encodePacked("Purchase reward minting failed: ", reason)));
        } catch Panic(uint errorCode) {
            string memory panicReason;
            if (errorCode == 0x01) panicReason = "Assertion failed";
            else if (errorCode == 0x11) panicReason = "Arithmetic overflow";
            else if (errorCode == 0x12) panicReason = "Division by zero";
            else panicReason = "Unknown panic code";
            console.log("Purchase reward minting failed with Panic:", panicReason);
            revert(string(abi.encodePacked("Purchase reward minting failed with panic: ", panicReason)));
        } catch (bytes memory err) {
            console.log("Purchase reward minting failed with low-level error");
            revert("Purchase reward minting failed with low-level error");
        }

/*
        string memory uri = _generateTokenURI(offerId);
        energyNFT.mintCertificate(
            offer.buyer,
            offer.quantity,
            offer.energyType,
            uri
        );
*/
        emit FeesDistributed(
            offerId,
            producerAmount,
            enedisAmount,
            platformAmount,
            poolAmount
        );
    }

    function _generateTokenURI(uint256 offerId) 
        private 
        pure 
        returns (string memory) 
    {
        return string(abi.encodePacked("ipfs://", uint2str(offerId)));
    }

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
