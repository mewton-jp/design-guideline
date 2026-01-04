
import fs from 'node:fs';
import path from 'node:path';

// Define paths
const SRC_PATH = path.resolve(__dirname, '../src/tokens/primitives.json');
const DIST_DIR = path.resolve(__dirname, '../dist/w3c');
const DIST_PATH = path.join(DIST_DIR, 'base.json');

// Type definitions for W3C Token Format
type W3CToken = {
  $type?: string;
  $value: any;
  $description?: string;
  [key: string]: any;
};

type Primitives = {
  [key: string]: string | number | { value: any; pixel?: string } | Primitives;
};

const parseOklch = (value: string) => {
  const match = value.match(/oklch\(\s*([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)\s*\)/);
  if (match) {
    const [_, l, c, h] = match;
    return {
      colorSpace: 'oklch',
      components: [parseFloat(l), parseFloat(c), parseFloat(h)],
      alpha: 1.0,
    };
  }
  return value;
};

const determineType = (key: string, parentKey: string = ''): string | undefined => {
  if (['palette', 'color'].includes(parentKey) || key.match(/color|ink|surface/)) return 'color';
  if (['spacing', 'radius', 'size'].includes(parentKey) || key.match(/size|spacing|radius/)) return 'dimension';
  if (['weight'].includes(parentKey)) return 'fontWeight';
  if (['leading'].includes(parentKey)) return 'number';
  return undefined;
};

const transform = (obj: Primitives, parentKey: string = ''): any => {
  const result: any = {};

  for (const [key, value] of Object.entries(obj)) {
    // 1. Handle Dimension Object { value: "1rem", pixel: "16px" }
    if (typeof value === 'object' && value !== null && 'value' in value && 'pixel' in value) {
       result[key] = {
        $type: 'dimension',
        $value: (value as any).value,
        $description: (value as any).pixel,
      };
      continue;
    }

    // 2. Handle simple string/number values
    if (typeof value !== 'object' || value === null) {
      let val = value;
      let type = determineType(key, parentKey);

      // Convert OKLCH string to Object
      if (typeof val === 'string' && val.startsWith('oklch')) {
        val = parseOklch(val);
        type = 'color';
      }

      result[key] = {
        $value: val,
      };
      
      if (type) {
        result[key].$type = type;
      }
      continue;
    }

    // 3. Recurse for nested objects
    result[key] = transform(value as Primitives, key);
  }

  return result;
};

const main = () => {
  try {
    // Ensure output directory exists
    if (!fs.existsSync(DIST_DIR)) {
      fs.mkdirSync(DIST_DIR, { recursive: true });
    }

    const rawData = fs.readFileSync(SRC_PATH, 'utf-8');
    const primitives = JSON.parse(rawData);
    const transformed = transform(primitives);

    fs.writeFileSync(DIST_PATH, JSON.stringify(transformed, null, 2));
    console.log(`Successfully generated W3C tokens at ${DIST_PATH}`);
  } catch (error) {
    console.error('Failed to build tokens:', error);
    process.exit(1);
  }
};

main();
