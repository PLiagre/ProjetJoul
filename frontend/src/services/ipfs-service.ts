import axios from 'axios';

const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY;

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: {
    trait_type: string;
    value: string | number;
  }[];
}

// Mapping des types d'énergie vers leurs images IPFS
const energyTypeImages: { [key: string]: string } = {
  "solaire": "https://ipfs.io/ipfs/QmZNqPN3MNvHbW6gkUB4VH19mnCzDyUe1u933okCNbTgMD",
  "eolien": "https://ipfs.io/ipfs/Qmdvy5wjzKZ3dchsdRWPbZZmRDvHtgkrjBQzxECNfDXBpt",
  "hydraulique": "https://ipfs.io/ipfs/QmY2pjifFR5CQbE25LkGCztq3smM6SW8WQHuSfCiWHEFgP",
  "biomasse": "https://ipfs.io/ipfs/Qmf7iRSjE6zkSeYiVXikosSFiDqHntFcBkEQmwpMVRNsQ6"
};

// Fonction pour obtenir l'URL de l'image selon le type d'énergie
function getEnergyTypeImage(energyType: string): string {
  const normalizedType = energyType.toLowerCase();
  return energyTypeImages[normalizedType] || energyTypeImages["solaire"];
}

export async function uploadToIPFS(metadata: NFTMetadata) {
  if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
    throw new Error('Pinata API credentials are not configured');
  }

  try {
    console.log('Uploading metadata to IPFS:', metadata);
    
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      metadata,
      {
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_SECRET_KEY,
        },
        timeout: 10000, // 10 second timeout
      }
    );

    if (!response.data || !response.data.IpfsHash) {
      throw new Error('Invalid response from Pinata API');
    }

    console.log('Successfully uploaded to IPFS:', response.data);
    return `ipfs://${response.data.IpfsHash}`;
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error('Invalid Pinata API credentials');
      }
      throw new Error(`IPFS upload failed: ${error.response?.data?.message || error.message}`);
    }
    throw new Error('Failed to upload metadata to IPFS');
  }
}

export function generateNFTMetadata(
  offerId: string,
  quantity: number,
  energyType: string,
  producer: string,
  timestamp: number
): NFTMetadata {
  return {
    name: `Energy Certificate #${offerId}`,
    description: `Certificate of energy production for ${quantity / 1000} kWh of ${energyType} energy`,
    image: getEnergyTypeImage(energyType),
    attributes: [
      {
        trait_type: "Energy Type",
        value: energyType
      },
      {
        trait_type: "Quantity",
        value: quantity / 1000 // Convert Wh to kWh
      },
      {
        trait_type: "Producer",
        value: producer
      },
      {
        trait_type: "Timestamp",
        value: timestamp
      }
    ]
  };
}
