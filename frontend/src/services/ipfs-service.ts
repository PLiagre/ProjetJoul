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

export async function uploadToIPFS(metadata: NFTMetadata) {
  try {
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      metadata,
      {
        headers: {
          'Content-Type': 'application/json',
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
      }
    );

    return `ipfs://${response.data.IpfsHash}`;
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
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
    image: "https://your-default-image-url.com/energy-certificate.png", // À remplacer par une vraie image
    attributes: [
      {
        trait_type: "Energy Type",
        value: energyType
      },
      {
        trait_type: "Quantity",
        value: quantity / 1000 // Convertir Wh en kWh
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
