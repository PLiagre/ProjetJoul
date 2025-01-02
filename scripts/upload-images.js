import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PINATA_API_KEY = 'c735fc410fd49cdbc1cc';
const PINATA_SECRET_KEY = 'bc129087595b8affa12a6e4a18b065b3aca34588a219e971a32cb9eef971b365';

async function uploadToPinata(filePath) {
    const formData = new FormData();
    const file = fs.createReadStream(filePath);
    const fileName = path.basename(filePath);
    
    formData.append('file', file);

    try {
        const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
            maxBodyLength: Infinity,
            headers: {
                'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
                'pinata_api_key': PINATA_API_KEY,
                'pinata_secret_api_key': PINATA_SECRET_KEY,
            },
        });

        console.log(`${fileName}: https://ipfs.io/ipfs/${response.data.IpfsHash}`);
        return response.data.IpfsHash;
    } catch (error) {
        console.error(`Error uploading ${fileName}:`, error.response?.data || error.message);
        throw error;
    }
}

async function uploadAllImages() {
    const imagesPath = path.join(__dirname, '..', 'frontend', 'public', 'images');
    const images = [
        path.join(imagesPath, 'Solaire.png'),
        path.join(imagesPath, 'Eolien.png'),
        path.join(imagesPath, 'Hydro.png'),
        path.join(imagesPath, 'BioMass.png')
    ];

    const hashes = {};
    for (const imagePath of images) {
        try {
            const hash = await uploadToPinata(imagePath);
            const fileName = path.basename(imagePath, '.png').toLowerCase();
            hashes[fileName] = hash;
        } catch (error) {
            console.error(`Failed to upload ${imagePath}:`, error);
        }
    }

    console.log('\nIPFS Hashes for energyTypeImages:');
    console.log(JSON.stringify(hashes, null, 2));
}

uploadAllImages().catch(console.error);
