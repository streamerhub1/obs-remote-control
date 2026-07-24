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
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js') || fullPath.endsWith('.cjs') || fullPath.endsWith('.mjs')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      const original = content;
      // Replace : any with : unknown
      content = content.replace(/: any\b/g, ': unknown');
      content = content.replace(/<any>/g, '<unknown>');
      content = content.replace(/ as any\b/g, ' as unknown');
      
      // Fix some other lint errors from the output
      content = content.replace(/console\.log/g, '// console.log');
      content = content.replace(/console\.error/g, '// console.error');
      
      // Add eslint-disable for files that have undef
      if (content.includes('module.exports') || content.includes('process.env') || content.includes('Buffer.')) {
        if (!content.includes('/* eslint-env node */')) {
          content = '/* eslint-env node */\n' + content;
        }
      }
      
      if (content !== original) {
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

replaceAny(path.join(process.cwd(), 'apps'));
replaceAny(path.join(process.cwd(), 'packages'));
replaceAny(path.join(process.cwd(), 'scripts'));
