import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const routesDir = path.join(__dirname, 'apps/backend/src/routes');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;

  if (content.includes('import { FastifyInstance } from \'fastify\';')) {
    content = content.replace('import { FastifyInstance } from \'fastify\';', 'import { FastifyInstance, FastifyPluginAsync } from \'fastify\';');
    changed = true;
  }
  
  if (content.includes('FastifyPluginAsyncZod')) {
    content = content.replace(/import \{ FastifyPluginAsyncZod \} from 'fastify-type-provider-zod';/g, "import { ZodTypeProvider } from 'fastify-type-provider-zod';");
    content = content.replace(/FastifyPluginAsyncZod/g, "FastifyPluginAsync");
    
    // Add const app = appOriginal.withTypeProvider<ZodTypeProvider>();
    content = content.replace(/export const ([a-zA-Z]+Routes): FastifyPluginAsync = async \(app\) => \{/, "export const $1: FastifyPluginAsync = async (appOriginal) => {\n  const app = appOriginal.withTypeProvider<ZodTypeProvider>();");
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('Fixed', filePath);
  }
}

fs.readdirSync(routesDir).forEach(file => {
  if (file.endsWith('.ts')) {
    processFile(path.join(routesDir, file));
  }
});
