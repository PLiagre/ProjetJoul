// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title UserManagement
 * @dev Gestion des utilisateurs du système Joul
 * - Attribution des rôles (producteur/consommateur)
 * - Contrôle d'accès pour l'admin
 */
contract UserManagement is AccessControl, Pausable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PRODUCER_ROLE = keccak256("PRODUCER_ROLE");
    bytes32 public constant CONSUMER_ROLE = keccak256("CONSUMER_ROLE");

    event UserAdded(address indexed userAddress, bool isProducer);
    event UserRemoved(address indexed userAddress);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Ajoute un nouvel utilisateur
     * @param userAddress Adresse de l'utilisateur
     * @param _isProducer true pour producteur, false pour consommateur
     */
    function addUser(address userAddress, bool _isProducer) 
        external 
        onlyRole(ADMIN_ROLE) 
        whenNotPaused 
    {
        require(userAddress != address(0), "Invalid address");
        require(
            !hasRole(PRODUCER_ROLE, userAddress) && !hasRole(CONSUMER_ROLE, userAddress),
            "User already registered"
        );

        if (_isProducer) {
            _grantRole(PRODUCER_ROLE, userAddress);
        } else {
            _grantRole(CONSUMER_ROLE, userAddress);
        }

        emit UserAdded(userAddress, _isProducer);
    }

    /**
     * @dev Supprime un utilisateur
     * @param userAddress Adresse de l'utilisateur
     */
    function removeUser(address userAddress) 
        external 
        onlyRole(ADMIN_ROLE) 
        whenNotPaused 
    {
        require(userAddress != address(0), "Invalid address");
        require(
            hasRole(PRODUCER_ROLE, userAddress) || hasRole(CONSUMER_ROLE, userAddress),
            "User not registered"
        );

        if (hasRole(PRODUCER_ROLE, userAddress)) {
            _revokeRole(PRODUCER_ROLE, userAddress);
        }
        if (hasRole(CONSUMER_ROLE, userAddress)) {
            _revokeRole(CONSUMER_ROLE, userAddress);
        }

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
        return hasRole(PRODUCER_ROLE, userAddress);
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
        return hasRole(CONSUMER_ROLE, userAddress);
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
