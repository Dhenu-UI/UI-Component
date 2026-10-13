import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

const jsonDir = path.join(process.cwd(), 'src', 'style', 'json');

console.log('👀 Token watch mode is ACTIVATED! Listening for changes or manual triggers...');

// Check for changes or run sync every 10 seconds automatically
setInterval(() => {
  console.log('🔄 Checking Figma for updates...');
  exec('npx ts-node src/tokens/figmaSyncTokens.ts', (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Sync error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`⚠️ stderr: ${stderr}`);
      return;
    }
    console.log(stdout);
  });
}, 10000); 