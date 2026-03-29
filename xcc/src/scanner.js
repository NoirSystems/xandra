/**
 * HTML Scanner
 *
 * Parses HTML/Vue/Svelte files into a structured element tree.
 * Each element carries its classes, attributes, parent context,
 * children, file path, and line number.
 */

import { readFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { parseDocument } from 'htmlparser2';
import { getElementsByTagName } from 'domutils';
import fg from 'fast-glob';

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

export async function discoverFiles(patterns, excludePatterns, cwd = process.cwd()) {
  return fg(patterns, {
    cwd,
    absolute: true,
    ignore: excludePatterns,
    onlyFiles: true,
  });
}

// ---------------------------------------------------------------------------
// Source extraction — handle different file types
// ---------------------------------------------------------------------------

function extractTemplate(source, ext) {
  if (ext === '.vue') {
    // Extract <template> block
    const start = source.indexOf('<template');
    const end = source.lastIndexOf('</template>');
    if (start === -1 || end === -1) return { html: source, offset: 0 };
    const templateStart = source.indexOf('>', start) + 1;
    // Count lines before template for offset
    const offset = (source.slice(0, templateStart).match(/\n/g) || []).length;
    return { html: source.slice(templateStart, end), offset };
  }

  if (ext === '.svelte') {
    // Svelte: parse everything (script/style tags will be ignored by our walker)
    return { html: source, offset: 0 };
  }

  // Plain HTML
  return { html: source, offset: 0 };
}

// ---------------------------------------------------------------------------
// Line number computation
// ---------------------------------------------------------------------------

function buildLineIndex(source) {
  const starts = [0];
  for (let i = 0; i < source.length; i++) {
    if (source[i] === '\n') starts.push(i + 1);
  }
  return starts;
}

function indexToLine(lineIndex, index) {
  if (index <= 0) return 1;
  let lo = 0;
  let hi = lineIndex.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lineIndex[mid] <= index) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1; // 1-based
}

// ---------------------------------------------------------------------------
// DOM tree → XandraElement tree
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} XandraElement
 * @property {string} tag
 * @property {string[]} classes - all classes
 * @property {string[]} xClasses - only x- prefixed
 * @property {string[]} nonXClasses - non x- classes (excluding standard HTML like no-js etc)
 * @property {boolean} hasNs
 * @property {string|null} nsReason
 * @property {boolean} nsBoundary
 * @property {string} file
 * @property {number} line
 * @property {string[]} parentXClasses
 * @property {string|null} parentTag
 * @property {XandraElement[]} children
 * @property {number} depth
 */

function walkNode(node, file, lineIndex, lineOffset, parentXClasses, parentTag, depth) {
  if (node.type !== 'tag') return null;

  // Skip script and style tags
  if (node.name === 'script' || node.name === 'style') return null;

  const attribs = node.attribs || {};
  const classStr = attribs.class || attribs.className || '';
  const classes = classStr.split(/\s+/).filter(Boolean);
  const xClasses = classes.filter(c => c.startsWith('x-'));
  const nonXClasses = classes.filter(c => !c.startsWith('x-'));

  const hasNs = 'data-ns' in attribs;
  const nsReason = attribs['data-ns'] || null;
  const nsBoundary = 'data-ns-boundary' in attribs;

  const line = node.startIndex != null
    ? indexToLine(lineIndex, node.startIndex) + lineOffset
    : 0;

  const element = {
    tag: node.name,
    classes,
    xClasses,
    nonXClasses,
    hasNs,
    nsReason,
    nsBoundary,
    file,
    line,
    parentXClasses,
    parentTag,
    children: [],
    depth,
  };

  // Recurse into children
  const childXClasses = xClasses.length > 0 ? xClasses : parentXClasses;
  if (node.children) {
    for (const child of node.children) {
      const childEl = walkNode(child, file, lineIndex, lineOffset, childXClasses, node.name, depth + 1);
      if (childEl) {
        element.children.push(childEl);
      }
    }
  }

  return element;
}

// ---------------------------------------------------------------------------
// Flatten tree to list (for iteration)
// ---------------------------------------------------------------------------

function flattenTree(element, list = []) {
  list.push(element);
  for (const child of element.children) {
    flattenTree(child, list);
  }
  return list;
}

// ---------------------------------------------------------------------------
// Main scan function
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ScanResult
 * @property {string} file
 * @property {XandraElement} tree - root element
 * @property {XandraElement[]} elements - flat list of all elements
 */

export function scanFile(filePath) {
  const source = readFileSync(filePath, 'utf-8');
  const ext = extname(filePath);
  const { html, offset } = extractTemplate(source, ext);
  const lineIndex = buildLineIndex(source);

  const dom = parseDocument(html, {
    withStartIndices: true,
    withEndIndices: true,
  });

  const roots = [];
  for (const node of dom.children || []) {
    const el = walkNode(node, filePath, lineIndex, offset, [], null, 0);
    if (el) roots.push(el);
  }

  // Wrap in a virtual root
  const root = {
    tag: '#root',
    classes: [],
    xClasses: [],
    nonXClasses: [],
    hasNs: false,
    nsReason: null,
    nsBoundary: false,
    file: filePath,
    line: 0,
    parentXClasses: [],
    parentTag: null,
    children: roots,
    depth: -1,
  };

  const elements = [];
  for (const r of roots) {
    flattenTree(r, elements);
  }

  return { file: filePath, tree: root, elements };
}

/**
 * Scan multiple files
 * @returns {Promise<ScanResult[]>}
 */
export async function scanFiles(config, targetPath) {
  const cwd = targetPath || process.cwd();
  const files = await discoverFiles(config.include, config.exclude, cwd);

  const results = [];
  for (const file of files) {
    try {
      results.push(scanFile(file));
    } catch (e) {
      // Skip files that can't be parsed (binary, corrupted, etc.)
      // But report it
      results.push({
        file,
        tree: null,
        elements: [],
        error: e.message,
      });
    }
  }

  return results;
}
