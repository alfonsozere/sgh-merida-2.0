import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourcePath = path.join(__dirname, '..', 'bd_sgh.json');
const destPath = path.join(__dirname, 'public', 'planteles.json');

const data = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));
const planteles = {};

const municipios = data.municipios || {};
for (const [munName, munData] of Object.entries(municipios)) {
  const parroquias = munData.parroquias || {};
  for (const [parrName, parrData] of Object.entries(parroquias)) {
    const pl = parrData.planteles || {};
    for (const [dea, pData] of Object.entries(pl)) {
      planteles[dea] = {
        ...pData,
        estado: 'MERIDA',
        municipio: munName,
        parroquia: parrName,
        dea: dea
      };
    }
  }
}

// Ensure public dir exists
if (!fs.existsSync(path.join(__dirname, 'public'))) {
  fs.mkdirSync(path.join(__dirname, 'public'));
}

fs.writeFileSync(destPath, JSON.stringify(planteles));
console.log(`Extracted ${Object.keys(planteles).length} planteles to public/planteles.json`);
