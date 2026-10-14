import 'dotenv/config'; 
import fs from 'fs';
import path from 'path';

const token = process.env.FIGMA_PERSONAL_ACCESS_TOKEN?.trim();
const fileKey = process.env.FIGMA_FILE_KEY || 'CXxUbHl3oMzt9Bzv3SKv75';

if (!token) {
  console.warn('⚠️ FIGMA_PERSONAL_ACCESS_TOKEN is missing. Add it to a local .env file or your shell environment.');
}

const jsonDir = path.join(process.cwd(), 'src', 'style', 'json');
const scssDir = path.join(process.cwd(), 'src', 'style', 'scss');

function normalizeScssVariableName(name: string): string {
  const cleaned = name
    .replace(/[\/\s_]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  if (!cleaned) {
    return 'token';
  }

  return /^[0-9]/.test(cleaned) ? `token-${cleaned}` : cleaned;
}

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

  const idToNameMap = new Map<string, string>();
  const groupOrder = ['global', 'font', 'spacing', 'radius', 'border', 'size', 'button', 'forms', 'icon', 'text', 'surface', 'feedback', 'shadow', 'component', 'misc'];
  const groupLabels: Record<string, string> = {
    global: 'Global tokens',
    font: 'Font tokens',
    spacing: 'Spacing tokens',
    radius: 'Radius tokens',
    border: 'Border tokens',
    size: 'Size tokens',
    button: 'Button tokens',
    forms: 'Form tokens',
    icon: 'Icon tokens',
    text: 'Text tokens',
    surface: 'Surface tokens',
    feedback: 'Feedback tokens',
    shadow: 'Shadow tokens',
    component: 'Component tokens',
    misc: 'Misc tokens'
  };

  for (const id in variables) {
    const variable = variables[id];
    if (variable && variable.name) {
      const cleanName = normalizeScssVariableName(variable.name);
      idToNameMap.set(id, cleanName);
    }
  }

  const groupedLines = new Map<string, string[]>();
  const semanticValues = new Map<string, string>();

  for (const id in variables) {
    const variable = variables[id];
    if (!variable || !variable.name) continue;

    const valuesByMode = variable.valuesByMode;
    if (!valuesByMode) continue;

    const modeId = Object.keys(valuesByMode)[0];
    const rawVal = valuesByMode[modeId];

    const cleanName = normalizeScssVariableName(variable.name);

    const groupKey = (variable.name.split('/')[0] || 'misc').toLowerCase();
    const groupName = Object.prototype.hasOwnProperty.call(groupLabels, groupKey) ? groupKey : 'misc';

    let finalVal = '';

    if (typeof rawVal === 'object' && rawVal !== null) {
      if (rawVal.r !== undefined && rawVal.g !== undefined && rawVal.b !== undefined) {
        const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
        finalVal = `#${toHex(rawVal.r)}${toHex(rawVal.g)}${toHex(rawVal.b)}`.toUpperCase();
      } else if (rawVal.type === 'VARIABLE_ALIAS' && rawVal.id) {
        const referencedName = idToNameMap.get(rawVal.id);
        finalVal = referencedName ? `var(--${referencedName})` : '#000000';
      } else if (typeof rawVal.value !== 'undefined') {
        finalVal = toScssLiteral(rawVal.value, cleanName, idToNameMap);
      } else {
        finalVal = 'inherit';
      }
    } else {
      finalVal = toScssLiteral(rawVal, cleanName, idToNameMap);
    }

    semanticValues.set(cleanName, finalVal);

    const groupLines = groupedLines.get(groupName) ?? [];
    groupLines.push(`$${cleanName}: ${finalVal};`);
    groupedLines.set(groupName, groupLines);
  }

  const scssLines: string[] = ['// 🤖 Auto-generated SCSS variables from Figma API'];

  for (const groupKey of groupOrder) {
    const lines = groupedLines.get(groupKey);
    if (!lines || lines.length === 0) continue;

    scssLines.push('');
    scssLines.push(`// ${groupLabels[groupKey]}`);
    scssLines.push(...lines);
  }

  const remainingGroups = [...groupedLines.keys()].filter((key) => !groupOrder.includes(key));
  for (const groupKey of remainingGroups) {
    const lines = groupedLines.get(groupKey) ?? [];
    scssLines.push('');
    scssLines.push(`// ${groupLabels[groupKey] ?? groupKey}`);
    scssLines.push(...lines);
  }

  const scssPath = path.join(scssDir, 'figma-variables.scss');
  const content = `${scssLines.join('\n')}\n`;

  fs.writeFileSync(scssPath, content, 'utf-8');
  console.log(`✅ Generated SCSS file successfully: ${scssPath}`);

  const cssVarLines: string[] = [
    '// 🤖 Auto-generated CSS custom properties from Figma API',
    '',
    ':root {'
  ];

  for (const [name, value] of [...semanticValues.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    cssVarLines.push(`  --${name}: ${value};`);
  }

  cssVarLines.push('}');

  const semanticPath = path.join(scssDir, 'semantics.scss');
  fs.writeFileSync(semanticPath, `${cssVarLines.join('\n')}\n`, 'utf-8');
  console.log(`✅ Generated semantic CSS file successfully: ${semanticPath}`);
}

function toScssLiteral(rawVal: unknown, cleanName: string, idToNameMap: Map<string, string>): string {
  if (typeof rawVal === 'string') {
    if (rawVal.startsWith('var(') || rawVal.startsWith('#') || rawVal.startsWith('rgb') || rawVal.startsWith('hsl')) {
      return rawVal;
    }
    return JSON.stringify(rawVal);
  }

  if (typeof rawVal === 'number') {
    const needsPx = /height|width|padding|margin|radius|size|gap|spacing|top|bottom|left|right|font|line|border/i.test(cleanName);
    if (Number.isFinite(rawVal) && needsPx && !Number.isInteger(rawVal)) {
      return `${rawVal}px`;
    }
    if (Number.isFinite(rawVal) && needsPx && Number.isInteger(rawVal)) {
      return `${rawVal}px`;
    }
    return String(rawVal);
  }

  if (typeof rawVal === 'boolean') {
    return rawVal ? 'true' : 'false';
  }

  if (Array.isArray(rawVal)) {
    return rawVal.map((value): string => toScssLiteral(value, cleanName, idToNameMap)).join(', ');
  }

  if (typeof rawVal === 'object' && rawVal !== null && 'id' in rawVal && rawVal.id && 'type' in rawVal && rawVal.type === 'VARIABLE_ALIAS') {
    const referencedName = idToNameMap.get(String(rawVal.id));
    return referencedName ? `var(--${referencedName})` : '#000000';
  }

  return JSON.stringify(String(rawVal));
}

async function main() {
  await fetchFigmaVariables();
  processFigmaVariables();
}

main();