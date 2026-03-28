/**
 * Configuration loader
 * Looks for xandra.config.js in the current directory, merges with defaults.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULTS = {
  prefix: 'x-',

  include: [
    '**/*.html',
    '**/*.vue',
    '**/*.svelte',
  ],

  exclude: [
    'node_modules/**',
    'dist/**',
    '.git/**',
    'xcc/**',
  ],

  framework: {
    // Where to find the compiled Xandra CSS (for class extraction)
    css: null, // auto-detect: node_modules/xandra/dist/xandra.css or xcc/framework/dist/xandra.css
  },

  ns: {
    requireReason: true,
    maxPerFile: 10,
    maxTotal: 50,
    boundarySkipChildren: true,
  },

  check: {
    failOnError: true,
    failOnWarning: false,
  },

  depth: {
    warn: 6,
  },
};

export async function loadConfig(cwd = process.cwd()) {
  const configPath = resolve(cwd, 'xandra.config.js');

  let userConfig = {};
  if (existsSync(configPath)) {
    try {
      const mod = await import(pathToFileURL(configPath).href);
      userConfig = mod.default || mod;
    } catch (e) {
      console.error(`Failed to load ${configPath}: ${e.message}`);
    }
  }

  return deepMerge(DEFAULTS, userConfig);
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

export { DEFAULTS };
