// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title EnergyNFT
 * @dev NFT représentant les certificats d'énergie
 * - Stockage des métadonnées sur IPFS
 * - Mintable uniquement par les rôles autorisés
 * - Traçabilité de la production d'énergie
 */
contract EnergyNFT is ERC721, AccessControl, Pausable {
    uint256 private _nextTokenId;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    struct EnergyData {
        uint256 quantity;     // Quantité d'énergie en Wh
        string energyType;    // Type d'énergie (solaire, éolien, etc.)
        uint256 timestamp;    // Date de production
        address producer;     // Adresse du producteur
    }

    // Mapping pour stocker les URIs des tokens
    mapping(uint256 => string) private _tokenURIs;
    // Mapping pour stocker les données d'énergie
    mapping(uint256 => EnergyData) public energyData;

    event EnergyNFTMinted(
        uint256 indexed tokenId,
        address indexed producer,
        uint256 quantity,
        string energyType,
        string uri
    );

    constructor() ERC721("JOUL Energy Certificate", "JEC") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }

    /**
     * @dev Crée un nouveau certificat d'énergie
     * @param to Adresse du bénéficiaire
     * @param quantity Quantité d'énergie en Wh
     * @param energyType Type d'énergie
     * @param uri URI IPFS des métadonnées
     * @return uint256 ID du nouveau token
     */
    function mintCertificate(
        address to,
        uint256 quantity,
        string memory energyType,
        string memory uri
    ) external onlyRole(MINTER_ROLE) whenNotPaused returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        energyData[tokenId] = EnergyData({
            quantity: quantity,
            energyType: energyType,
            timestamp: block.timestamp,
            producer: to
        });

        emit EnergyNFTMinted(
            tokenId,
            to,
            quantity,
            energyType,
            uri
        );

        return tokenId;
    }

    /**
     * @dev Récupère les données d'énergie d'un certificat
     * @param tokenId ID du token
     */
    function getCertificateData(uint256 tokenId) 
        external 
        view 
        returns (EnergyData memory) 
    {
        require(_ownerOf(tokenId) != address(0), "Certificate does not exist");
        return energyData[tokenId];
    }

    /**
     * @dev Définit l'URI d'un token
     */
    function _setTokenURI(uint256 tokenId, string memory uri) internal {
        require(_ownerOf(tokenId) != address(0), "URI set for nonexistent token");
        _tokenURIs[tokenId] = uri;
    }

    /**
     * @dev Récupère l'URI d'un token
     */
    function tokenURI(uint256 tokenId) 
        public 
        view 
        virtual 
        override 
        returns (string memory) 
    {
        require(_ownerOf(tokenId) != address(0), "URI query for nonexistent token");
        return _tokenURIs[tokenId];
    }

    /**
     * @dev Pause toutes les opérations de minting et transfert
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
     * @dev Hook avant le transfert
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        virtual
        override
        whenNotPaused
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    /**
     * @dev Override requis par Solidity
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
