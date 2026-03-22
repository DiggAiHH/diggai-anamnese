#!/usr/bin/env node
/**
 * Design Token Generator
 * 
 * Generates CSS variables, Tailwind config, and TypeScript types
 * from a central tokens.json file.
 * 
 * Usage: npx ts-node scripts/generate-tokens.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Token value type definition
interface TokenValue {
  value: string;
  type: string;
}

// Token category can contain nested objects or token values
type TokenCategory = {
  [key: string]: TokenCategory | TokenValue;
};

// Full tokens structure
type Tokens = {
  [category: string]: TokenCategory;
};

// Configuration
const CONFIG = {
  tokensPath: path.resolve(__dirname, '../src/tokens/tokens.json'),
  outputDir: path.resolve(__dirname, '../src/tokens'),
  files: {
    css: 'tokens.css',
    tailwind: 'tokens.tailwind.ts',
    types: 'tokens.types.ts',
    figma: 'tokens.figma.json',
  },
};

/**
 * Resolve token references like {color.primary.500} to actual values
 */
function resolveValue(value: string, tokens: Tokens, visited = new Set<string>()): string {
  // Check if value is a reference {path.to.token}
  if (value.startsWith('{') && value.endsWith('}')) {
    const refPath = value.slice(1, -1);
    
    // Prevent circular references
    if (visited.has(refPath)) {
      console.warn(`Warning: Circular reference detected: ${refPath}`);
      return value;
    }
    visited.add(refPath);
    
    const pathParts = refPath.split('.');
    let result: unknown = tokens;
    
    for (const part of pathParts) {
      if (result && typeof result === 'object' && part in result) {
        result = (result as Record<string, unknown>)[part];
      } else {
        console.warn(`Warning: Could not resolve reference: ${refPath}`);
        return value;
      }
    }
    
    if (result && typeof result === 'object' && 'value' in result) {
      const tokenValue = (result as TokenValue).value;
      // Recursively resolve if the resolved value is also a reference
      return resolveValue(tokenValue, tokens, visited);
    }
    
    return value;
  }
  
  return value;
}

/**
 * Check if an object is a token value (has 'value' and 'type' properties)
 */
function isTokenValue(obj: unknown): obj is TokenValue {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'value' in obj &&
    'type' in obj &&
    typeof (obj as TokenValue).value === 'string' &&
    typeof (obj as TokenValue).type === 'string'
  );
}

/**
 * Convert camelCase or other formats to kebab-case
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[_.]/g, '-')
    .toLowerCase();
}

/**
 * Walk through tokens and execute a callback for each token value
 */
function walkTokens(
  tokens: Tokens,
  callback: (path: string[], key: string, token: TokenValue) => void,
  currentPath: string[] = []
): void {
  for (const [key, value] of Object.entries(tokens)) {
    if (isTokenValue(value)) {
      callback(currentPath, key, value);
    } else if (typeof value === 'object' && value !== null) {
      walkTokens(value as TokenCategory, callback, [...currentPath, key]);
    }
  }
}

/**
 * Generate CSS custom properties (variables)
 */
function generateCSS(tokens: Tokens): string {
  const lines: string[] = [];
  lines.push('/**');
  lines.push(' * Design Tokens - CSS Variables');
  lines.push(' * Auto-generated from tokens.json - DO NOT EDIT DIRECTLY');
  lines.push(' * Run: npx ts-node scripts/generate-tokens.ts');
  lines.push(' */');
  lines.push('');
  lines.push(':root {');
  
  walkTokens(tokens, (path, key, token) => {
    const varName = `--token-${[...path, key].map(toKebabCase).join('-')}`;
    const resolvedValue = resolveValue(token.value, tokens);
    lines.push(`  ${varName}: ${resolvedValue};`);
  });
  
  lines.push('}');
  lines.push('');
  
  // Add CSS comment with token documentation
  lines.push('/* Token Categories */');
  const categories = Object.keys(tokens);
  categories.forEach((cat) => {
    lines.push(`/* ${cat}: ${Object.keys(tokens[cat]).join(', ')} */`);
  });
  
  return lines.join('\n');
}

/**
 * Generate Tailwind CSS configuration
 */
function generateTailwind(tokens: Tokens): string {
  const config: {
    theme: {
      extend: {
        colors: Record<string, string | Record<string, string>>;
        spacing: Record<string, string>;
        fontSize: Record<string, string>;
        fontWeight: Record<string, string>;
        fontFamily: Record<string, string[]>;
        borderRadius: Record<string, string>;
        boxShadow: Record<string, string>;
        transitionDuration: Record<string, string>;
        transitionTimingFunction: Record<string, string>;
        zIndex: Record<string, string>;
        opacity: Record<string, string>;
        letterSpacing: Record<string, string>;
        lineHeight: Record<string, string>;
        screens: Record<string, string>;
      };
    };
  } = {
    theme: {
      extend: {
        colors: {},
        spacing: {},
        fontSize: {},
        fontWeight: {},
        fontFamily: {},
        borderRadius: {},
        boxShadow: {},
        transitionDuration: {},
        transitionTimingFunction: {},
        zIndex: {},
        opacity: {},
        letterSpacing: {},
        lineHeight: {},
        screens: {},
      },
    },
  };

  walkTokens(tokens, (path, key, token) => {
    const varName = `var(--token-${[...path, key].map(toKebabCase).join('-')})`;
    const category = path[0];
    
    switch (category) {
      case 'color':
        if (path.length === 1) {
          // Direct color category
          if (!config.theme.extend.colors[key]) {
            config.theme.extend.colors[key] = varName;
          }
        } else {
          // Nested colors (e.g., color.primary.500)
          const subCategory = path[1];
          if (!config.theme.extend.colors[subCategory]) {
            config.theme.extend.colors[subCategory] = {};
          }
          const colors = config.theme.extend.colors[subCategory];
          if (typeof colors === 'object' && colors !== null) {
            (colors as Record<string, string>)[key] = varName;
          }
        }
        break;
        
      case 'spacing':
        config.theme.extend.spacing[key] = varName;
        break;
        
      case 'font':
        if (path[1] === 'size') {
          config.theme.extend.fontSize[key] = varName;
        } else if (path[1] === 'weight') {
          config.theme.extend.fontWeight[key] = varName;
        } else if (path[1] === 'family') {
          const fontValue = resolveValue(token.value, tokens);
          config.theme.extend.fontFamily[key] = fontValue.split(',').map((f) => f.trim());
        } else if (path[1] === 'lineHeight') {
          config.theme.extend.lineHeight[key] = varName;
        } else if (path[1] === 'letterSpacing') {
          config.theme.extend.letterSpacing[key] = varName;
        }
        break;
        
      case 'radius':
        config.theme.extend.borderRadius[key === 'DEFAULT' ? 'DEFAULT' : key] = varName;
        break;
        
      case 'shadow':
        config.theme.extend.boxShadow[key === 'DEFAULT' ? 'DEFAULT' : key] = varName;
        break;
        
      case 'transition':
        if (path[1] === 'duration') {
          config.theme.extend.transitionDuration[key] = varName;
        } else if (path[1] === 'easing') {
          config.theme.extend.transitionTimingFunction[key] = varName;
        }
        break;
        
      case 'zIndex':
        config.theme.extend.zIndex[key] = varName;
        break;
        
      case 'opacity':
        config.theme.extend.opacity[key] = varName;
        break;
        
      case 'breakpoint':
        config.theme.extend.screens[key] = varName;
        break;
    }
  });

  const lines: string[] = [];
  lines.push('/**');
  lines.push(' * Design Tokens - Tailwind Configuration');
  lines.push(' * Auto-generated from tokens.json - DO NOT EDIT DIRECTLY');
  lines.push(' * Run: npx ts-node scripts/generate-tokens.ts');
  lines.push(' */');
  lines.push('');
  lines.push('const config = ' + JSON.stringify(config, null, 2) + ';');
  lines.push('');
  lines.push('export default config;');
  lines.push('');
  lines.push('// Type definition for the config');
  lines.push('export type TokenConfig = typeof config;');
  
  return lines.join('\n');
}

/**
 * Convert a key to a valid JavaScript identifier
 */
function toValidIdentifier(key: string): string {
  // Replace special characters that aren't valid in JS identifiers
  return key
    .replace(/\./g, '_')     // 0.5 -> 0_5
    .replace(/-/g, '_')      // kebab-case -> snake_case
    .replace(/[^a-zA-Z0-9_]/g, '_'); // Any other special chars to underscore
}

/**
 * Generate TypeScript types and constants
 */
function generateTypes(tokens: Tokens): string {
  const lines: string[] = [];
  lines.push('/**');
  lines.push(' * Design Tokens - TypeScript Types & Constants');
  lines.push(' * Auto-generated from tokens.json - DO NOT EDIT DIRECTLY');
  lines.push(' * Run: npx ts-node scripts/generate-tokens.ts');
  lines.push(' */');
  lines.push('');
  
  // Generate token path type
  const tokenPaths: string[] = [];
  
  walkTokens(tokens, (path, key, token) => {
    const fullPath = [...path, key].join('.');
    const constName = [...path, key]
      .map((p, i) => {
        const valid = toValidIdentifier(p);
        return i === 0 ? valid : valid.charAt(0).toUpperCase() + valid.slice(1);
      })
      .join('');
    const varName = `--token-${[...path, key].map(toKebabCase).join('-')}`;
    const resolvedValue = resolveValue(token.value, tokens);
    // Escape quotes for TypeScript string
    const escapedValue = resolvedValue.replace(/'/g, "\\'");
    
    tokenPaths.push(`'${fullPath}'`);
    
    // Add JSDoc comment
    lines.push(`/** ${fullPath} - ${token.type} */`);
    lines.push(`export const ${constName} = 'var(${varName})' as const;`);
    lines.push(`/** Resolved value: ${escapedValue} */`);
    lines.push(`export const ${constName}Value = '${escapedValue}' as const;`);
    lines.push('');
  });
  
  // Generate union type of all token paths
  lines.push('/** Union type of all token paths */');
  lines.push(`export type TokenPath =`);
  tokenPaths.forEach((path, index) => {
    const isLast = index === tokenPaths.length - 1;
    lines.push(`  | ${path}${isLast ? ';' : ''}`);
  });
  lines.push('');
  
  // Generate token value getter function
  lines.push('/**');
  lines.push(' * Get CSS variable reference for a token path');
  lines.push(' * Usage: getToken("color.primary.500") → var(--token-color-primary-500)');
  lines.push(' */');
  lines.push('export function getToken(path: TokenPath): string {');
  lines.push('  const varName = path.replace(/\\./g, "-").replace(/([A-Z])/g, "-$1").toLowerCase();');
  lines.push('  return `var(--token-${varName})`;');
  lines.push('}');
  lines.push('');
  
  return lines.join('\n');
}

/**
 * Generate Figma-compatible tokens file
 */
function generateFigma(tokens: Tokens): string {
  const figmaTokens: {
    [category: string]: {
      [name: string]: {
        value: string;
        type: string;
        description?: string;
      };
    };
  } = {};
  
  walkTokens(tokens, (path, key, token) => {
    const category = path[0] || 'uncategorized';
    const name = [...path.slice(1), key].join('/');
    
    if (!figmaTokens[category]) {
      figmaTokens[category] = {};
    }
    
    figmaTokens[category][name] = {
      value: resolveValue(token.value, tokens),
      type: token.type,
      description: `Auto-generated from ${path.join('.')}.${key}`,
    };
  });
  
  return JSON.stringify(figmaTokens, null, 2);
}

/**
 * Main execution
 */
function main(): void {
  console.log('🎨 Design Token Generator');
  console.log('========================\n');
  
  try {
    // Read tokens file
    console.log(`📖 Reading tokens from: ${CONFIG.tokensPath}`);
    const tokensContent = fs.readFileSync(CONFIG.tokensPath, 'utf-8');
    const tokens: Tokens = JSON.parse(tokensContent);
    
    // Ensure output directory exists
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }
    
    // Generate CSS
    console.log('📝 Generating CSS variables...');
    const css = generateCSS(tokens);
    fs.writeFileSync(path.join(CONFIG.outputDir, CONFIG.files.css), css);
    console.log(`   ✓ ${CONFIG.files.css}`);
    
    // Generate Tailwind config
    console.log('📝 Generating Tailwind configuration...');
    const tailwind = generateTailwind(tokens);
    fs.writeFileSync(path.join(CONFIG.outputDir, CONFIG.files.tailwind), tailwind);
    console.log(`   ✓ ${CONFIG.files.tailwind}`);
    
    // Generate TypeScript types
    console.log('📝 Generating TypeScript types...');
    const types = generateTypes(tokens);
    fs.writeFileSync(path.join(CONFIG.outputDir, CONFIG.files.types), types);
    console.log(`   ✓ ${CONFIG.files.types}`);
    
    // Generate Figma tokens
    console.log('📝 Generating Figma tokens...');
    const figma = generateFigma(tokens);
    fs.writeFileSync(path.join(CONFIG.outputDir, CONFIG.files.figma), figma);
    console.log(`   ✓ ${CONFIG.files.figma}`);
    
    // Generate index file
    console.log('📝 Generating index file...');
    const indexContent = `/**
 * Design Tokens - Index
 * Auto-generated from tokens.json
 */

// Import CSS (must be imported in your main CSS/entry file)
import './tokens.css';

// Export all token constants
export * from './tokens.types';

// Re-export Tailwind config for customization
export { default as tailwindConfig } from './tokens.tailwind';
`;
    fs.writeFileSync(path.join(CONFIG.outputDir, 'index.ts'), indexContent);
    console.log(`   ✓ index.ts`);
    
    console.log('\n✅ All files generated successfully!');
    console.log(`📁 Output directory: ${CONFIG.outputDir}`);
    console.log('\nNext steps:');
    console.log('  1. Import CSS in your main entry file:');
    console.log('     import "./tokens/tokens.css";');
    console.log('  2. Or import from index.ts:');
    console.log('     import "@/tokens";');
    console.log('  3. Use tokens in your components:');
    console.log('     className="text-primary-500 p-spacing-4"');
    console.log('     style={{ color: ColorPrimary500 }}');
    
  } catch (error) {
    console.error('\n❌ Error generating tokens:', error);
    process.exit(1);
  }
}

// Run if called directly
main();

export { generateCSS, generateTailwind, generateTypes, generateFigma };
