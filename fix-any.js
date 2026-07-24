import fs from 'fs';
import path from 'path';

function replaceAny(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceAny(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Basic replacement for common patterns:
      // (event: any) => (event: unknown)
      // (e: any) => (e: unknown)
      // data: any => data: unknown
      // : any[] => : unknown[]
      // : any = => : unknown =
      
      const original = content;
      content = content.replace(/\(e: any\)/g, '(e: unknown)');
      content = content.replace(/\(err: any\)/g, '(err: unknown)');
      content = content.replace(/\(event: any\)/g, '(event: unknown)');
      content = content.replace(/\(msg: any\)/g, '(msg: unknown)');
      content = content.replace(/\(item: any\)/g, '(item: unknown)');
      content = content.replace(/\(p: any\)/g, '(p: unknown)');
      content = content.replace(/\(state: any\)/g, '(state: unknown)');
      content = content.replace(/\(c: any\)/g, '(c: unknown)');
      content = content.replace(/\(cmd: any\)/g, '(cmd: unknown)');
      content = content.replace(/let app: any;/g, 'let app: FastifyInstance;');
      content = content.replace(/let mockRedis: any;/g, 'let mockRedis: unknown;');
      content = content.replace(/let mockDb: any;/g, 'let mockDb: unknown;');
      content = content.replace(/let collabs: any\[\]/g, 'let collabs: unknown[]');
      content = content.replace(/const updateData: any/g, 'const updateData: Record<string, unknown>');
      content = content.replace(/const results: any/g, 'const results: Record<string, unknown>');
      content = content.replace(/\(connection: any, request: any\)/g, '(connection: import("@fastify/websocket").SocketStream, request: import("fastify").FastifyRequest)');
      content = content.replace(/meta\?: any/g, 'meta?: unknown');
      content = content.replace(/payload: any/g, 'payload: unknown');
      content = content.replace(/request: any/g, 'request: unknown');

      if (content !== original) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

replaceAny(path.join(process.cwd(), 'apps/desktop/src'));
replaceAny(path.join(process.cwd(), 'apps/backend/src'));
replaceAny(path.join(process.cwd(), 'packages/ui/src'));
replaceAny(path.join(process.cwd(), 'packages/remote-protocol/src'));
replaceAny(path.join(process.cwd(), 'packages/obs-adapter/src'));
