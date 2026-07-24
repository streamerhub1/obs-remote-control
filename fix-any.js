import fs from 'fs';
import path from 'path';

function replaceAny(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'build' || file === 'out') continue;
    
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceAny(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      const original = content;
      // Replace : any with : unknown
      content = content.replace(/:\s*any\b/g, ': unknown');
      content = content.replace(/<\s*any\s*>/g, '<unknown>');
      content = content.replace(/\s+as\s+any\b/g, ' as unknown');
      content = content.replace(/,\s*any\s*>/g, ', unknown>');
      content = content.replace(/\[any\]/g, '[unknown]');
      
      if (content !== original) {
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

replaceAny(path.join(process.cwd(), 'apps'));
replaceAny(path.join(process.cwd(), 'packages'));
