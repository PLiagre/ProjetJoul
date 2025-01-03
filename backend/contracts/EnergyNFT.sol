// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title EnergyNFT
 * @dev NFT représentant les certificats d'énergie
 * - Stockage des métadonnées sur IPFS
 * - Mintable uniquement par les rôles autorisés
 * - Traçabilité de la production d'énergie
 */
contract EnergyNFT is ERC721, AccessControl, ReentrancyGuard {
    uint256 private _nextTokenId;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

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
    ) external onlyRole(MINTER_ROLE) nonReentrant returns (uint256) {
        require(to != address(0), "Invalid recipient address");
        require(bytes(energyType).length > 0, "Energy type cannot be empty");
        require(quantity > 0, "Quantity must be greater than 0");
        require(bytes(uri).length > 0, "URI cannot be empty");

        uint256 tokenId = _nextTokenId++;
        
        // Mettre à jour l'état avant l'appel externe
        _tokenURIs[tokenId] = uri;
        energyData[tokenId] = EnergyData({
            quantity: quantity,
            energyType: energyType,
            timestamp: block.timestamp,
            producer: to
        });

        // Appel externe en dernier
        _safeMint(to, tokenId);

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
     * @dev Fonction pour brûler un token
     */
    function burn(uint256 tokenId) public {
        require(_ownerOf(tokenId) == _msgSender() || 
                isApprovedForAll(_ownerOf(tokenId), _msgSender()) ||
                getApproved(tokenId) == _msgSender(),
                "Caller is not owner or approved");
        
        _burn(tokenId);
        delete _tokenURIs[tokenId];
        delete energyData[tokenId];
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
