/**
 * xcc — Xandra Contract Compiler
 *
 * Programmatic API. Use this to integrate xcc into build tools.
 */

export { Registry, findFrameworkCSS, extractClassesFromCSS } from './registry.js';
export { scanFile, scanFiles, discoverFiles } from './scanner.js';
export { check, summarize } from './checker.js';
export { audit, collectNs, groupByReason, clusterReasons, generateSuggestions, buildNsTree, formatNsTree } from './auditor.js';
export { buildGraph, detectPatterns, detectAnomalies, formatGraphTree } from './grapher.js';
export { optimize, collectUsedClasses, optimizeCSS } from './optimizer.js';
export { findPromotable, generatePromotionCSS, formatPromotionPreview } from './promoter.js';
export { generateDocs, generateHTML, writeDocs } from './documenter.js';
export { loadConfig, DEFAULTS } from './config.js';
