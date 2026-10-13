import 'dotenv/config'; 
import fs from 'fs';
import path from 'path';

const token = process.env.FIGMA_PERSONAL_ACCESS_TOKEN?.trim();
const fileKey = process.env.FIGMA_FILE_KEY || 'CXxUbHl3oMzt9Bzv3SKv75';

if (!token) {
  console.warn('⚠️ FIGMA_PERSONAL_ACCESS_TOKEN is missing in .env file. Skipping Figma fetch.');
}

const jsonDir = path.join(process.cwd(), 'src', 'style', 'json');
const scssDir = path.join(process.cwd(), 'src', 'style', 'scss');

async function fetchFigmaVariables() {
  if (!token) {
    console.warn('⚠️ Skipping Figma fetch because no token is configured.');
    return;
  }

  console.log('🚀 Fetching variables from Figma API...');
  
  if (!fs.existsSync(jsonDir)) {
    fs.mkdirSync(jsonDir, { recursive: true });
  }

  try {
    const response = await fetch(`https://api.figma.com/v1/files/${fileKey}/variables/local`, {
      headers: {
        'X-Figma-Token': token
      }
    });

    if (!response.ok) {
      throw new Error(`Figma API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const savePath = path.join(jsonDir, 'figma-variables.tokens.json');
    
    fs.writeFileSync(savePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`📥 Downloaded Figma variables to: ${savePath}`);
  } catch (error) {
    console.error('❌ Failed to fetch from Figma API:', error);
  }
}

function processFigmaVariables() {
  const jsonPath = path.join(jsonDir, 'figma-variables.tokens.json');
  if (!fs.existsSync(jsonPath)) {
    console.log(`ℹ️ No JSON file found at ${jsonPath}`);
    return;
  }

  if (!fs.existsSync(scssDir)) {
    fs.mkdirSync(scssDir, { recursive: true });
  }

  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(rawData);
  const variables = data?.meta?.variables;

  if (!variables) {
    console.log('⚠️ No variables found in Figma JSON.');
    return;
  }

  // Map variable IDs to clean names for alias resolution
  const idToNameMap = new Map<string, string>();
  for (const id in variables) {
    const variable = variables[id];
    if (variable && variable.name) {
      const cleanName = variable.name
        .replace(/[\/\s\_]+/g, '-')
        .replace(/[^a-zA-Z0-9\-]/g, '')
        .toLowerCase();
      idToNameMap.set(id, cleanName);
    }
  }

  let scssVars = '';
  let cssVars = '';

  for (const id in variables) {
    const variable = variables[id];
    if (!variable || !variable.name) continue;

    const valuesByMode = variable.valuesByMode;
    if (!valuesByMode) continue;
    
    const modeId = Object.keys(valuesByMode)[0];
    let rawVal = valuesByMode[modeId];

    const cleanName = variable.name
      .replace(/[\/\s\_]+/g, '-')
      .replace(/[^a-zA-Z0-9\-]/g, '')
      .toLowerCase();

    let finalVal = '';

    if (typeof rawVal === 'object' && rawVal !== null) {
      // Check if it's a color RGBA object
      if (rawVal.r !== undefined && rawVal.g !== undefined && rawVal.b !== undefined) {
        const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
        finalVal = `#${toHex(rawVal.r)}${toHex(rawVal.g)}${toHex(rawVal.b)}`.toUpperCase();
      } 
      // Check if it's an alias/variable reference (Type: VARIABLE_ALIAS)
      else if (rawVal.type === 'VARIABLE_ALIAS' && rawVal.id) {
        const referencedName = idToNameMap.get(rawVal.id);
        finalVal = referencedName ? `var(--${referencedName})` : '#000000';
      } else {
        finalVal = 'inherit';
      }
    } else if (variable.resolvedType === 'FLOAT') {
      const needsPx = /height|width|padding|margin|radius|size|gap|spacing|top|bottom|left|right/i.test(cleanName);
      finalVal = needsPx ? `${rawVal}px` : `${rawVal}`;
    } else {
      finalVal = String(rawVal);
    }

    scssVars += `$${cleanName}: ${finalVal};\n`;
    cssVars += `  --${cleanName}: ${finalVal};\n`;
  }

  const scssPath = path.join(scssDir, 'figma-variables.scss');
  const content = `// 🤖 Auto-generated SCSS variables from Figma API\n${scssVars}\n:root {\n${cssVars}}\n`;

  fs.writeFileSync(scssPath, content, 'utf-8');
  console.log(`✅ Generated SCSS file successfully: ${scssPath}`);
}

async function main() {
  await fetchFigmaVariables();
  processFigmaVariables();
}

main();