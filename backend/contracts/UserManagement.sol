// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
/**
 * @title UserManagement
 * @dev Gestion des utilisateurs du système Joul
 * - Attribution des rôles (producteur/consommateur)
 * - Contrôle d'accès pour l'admin
 * - Délai de grâce pour la suppression
 * - Support des rôles multiples
 */
contract UserManagement is AccessControl, Pausable {

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PRODUCER_ROLE = keccak256("PRODUCER_ROLE");
    bytes32 public constant CONSUMER_ROLE = keccak256("CONSUMER_ROLE");

    uint256 public constant GRACE_PERIOD = 24 hours;
    mapping(address => uint256) public removalTimestamp;

    event UserAdded(
        address indexed userAddress, 
        bool isProducer,
        bool isConsumer
    );
    
    event UserRemoved(address indexed userAddress);
    event UserRemovalInitiated(
        address indexed userAddress, 
        uint256 effectiveTime
    );
    event UserRemovalCancelled(address indexed userAddress);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Ajoute un nouvel utilisateur avec possibilité de rôles multiples
     * @param userAddress Adresse de l'utilisateur
     * @param _isProducer true pour ajouter le rôle producteur
     */
    function addUser(address userAddress, bool _isProducer) 
        external 
        onlyRole(ADMIN_ROLE) 
        whenNotPaused 
    {
        require(userAddress != address(0), "Invalid address");
        require(
            removalTimestamp[userAddress] == 0,
            "User pending removal"
        );

        // Toujours accorder le rôle consommateur
        _grantRole(CONSUMER_ROLE, userAddress);
        
        if (_isProducer) {
            _grantRole(PRODUCER_ROLE, userAddress);
        }

        emit UserAdded(userAddress, _isProducer, true);
    }

    /**
     * @dev Initie la suppression d'un utilisateur avec délai de grâce
     * @param userAddress Adresse de l'utilisateur
     */
    function initiateUserRemoval(address userAddress) 
        external 
        onlyRole(ADMIN_ROLE) 
        whenNotPaused 
    {
        require(userAddress != address(0), "Invalid address");
        require(
            hasRole(PRODUCER_ROLE, userAddress) || hasRole(CONSUMER_ROLE, userAddress),
            "User not registered"
        );
        require(removalTimestamp[userAddress] == 0, "Removal already initiated");

        uint256 effectiveTime = block.timestamp + GRACE_PERIOD;
        removalTimestamp[userAddress] = effectiveTime;
        
        emit UserRemovalInitiated(userAddress, effectiveTime);
    }

    /**
     * @dev Annule une suppression d'utilisateur en cours
     * @param userAddress Adresse de l'utilisateur
     */
    function cancelUserRemoval(address userAddress)
        external
        onlyRole(ADMIN_ROLE)
        whenNotPaused
    {
        require(userAddress != address(0), "Invalid address");
        require(removalTimestamp[userAddress] > 0, "No removal pending");

        delete removalTimestamp[userAddress];
        
        emit UserRemovalCancelled(userAddress);
    }

    /**
     * @dev Finalise la suppression d'un utilisateur après le délai de grâce
     * @param userAddress Adresse de l'utilisateur
     */
    function finalizeUserRemoval(address userAddress) 
        external 
        onlyRole(ADMIN_ROLE) 
        whenNotPaused 
    {
        require(userAddress != address(0), "Invalid address");
        require(removalTimestamp[userAddress] > 0, "Removal not initiated");
        require(
            block.timestamp >= removalTimestamp[userAddress],
            "Grace period not ended"
        );

        if (hasRole(PRODUCER_ROLE, userAddress)) {
            _revokeRole(PRODUCER_ROLE, userAddress);
        }
        _revokeRole(CONSUMER_ROLE, userAddress);
        
        delete removalTimestamp[userAddress];

        emit UserRemoved(userAddress);
    }

    /**
     * @dev Vérifie si un utilisateur est un producteur
     * @param userAddress Adresse de l'utilisateur
     */
    function isProducer(address userAddress) 
        external 
        view 
        returns (bool) 
    {
        return hasRole(PRODUCER_ROLE, userAddress) && 
               removalTimestamp[userAddress] == 0;
    }

    /**
     * @dev Vérifie si un utilisateur est un consommateur
     * @param userAddress Adresse de l'utilisateur
     */
    function isConsumer(address userAddress) 
        external 
        view 
        returns (bool) 
    {
        return hasRole(CONSUMER_ROLE, userAddress) && 
               removalTimestamp[userAddress] == 0;
    }

    /**
     * @dev Pause le contrat
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Reprend les opérations
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
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
