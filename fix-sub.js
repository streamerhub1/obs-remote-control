import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const routesDir = path.join(__dirname, 'apps/backend/src/routes');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  if (content.includes('request.user.sub')) {
    content = content.replace(/request\.user\.sub/g, '(request.user as any).sub');
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('Fixed sub in', filePath);
  }
}

fs.readdirSync(routesDir).forEach(file => {
  if (file.endsWith('.ts')) {
    processFile(path.join(routesDir, file));
  }
});
