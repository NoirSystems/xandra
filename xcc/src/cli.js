/**
 * xcc CLI
 *
 * Command routing and argument parsing.
 *
 * Usage:
 *   xcc check [path]         Validate HTML against the Xandra contract
 *   xcc audit [path]         Analyze ns patterns and suggest new classes
 *   xcc graph [path]         Build and display composition graph
 *   xcc optimize [options]   Tree-shake unused classes from framework CSS
 *   xcc init                 Create xandra.config.js
 *   xcc --help               Show help
 *   xcc --version            Show version
 */

import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig, DEFAULTS } from './config.js';
import { Registry, findFrameworkCSS } from './registry.js';
import { scanFiles } from './scanner.js';
import { check, summarize } from './checker.js';
import { audit } from './auditor.js';
import { buildGraph, detectPatterns, detectAnomalies } from './grapher.js';
import { optimize } from './optimizer.js';
import * as report from './reporter.js';
import { bold, dim, cyan } from './colors.js';

const VERSION = '1.0.0';

export async function cli(args) {
  const command = args[0];
  const flags = parseFlags(args.slice(1));

  if (!command || command === '--help' || command === '-h') {
    showHelp();
    return;
  }

  if (command === '--version' || command === '-v') {
    console.log(`xcc v${VERSION}`);
    return;
  }

  report.header();

  switch (command) {
    case 'check':
      await runCheck(flags);
      break;
    case 'audit':
      await runAudit(flags);
      break;
    case 'graph':
      await runGraph(flags);
      break;
    case 'optimize':
      await runOptimize(flags);
      break;
    case 'init':
      await runInit(flags);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run xcc --help for usage');
      process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Command implementations
// ---------------------------------------------------------------------------

async function runCheck(flags) {
  const config = await loadConfig();
  const registry = new Registry(config).load();

  const targetPath = flags._[0] || process.cwd();
  const scanResults = await scanFiles(config, resolve(targetPath));

  report.reportScanning(scanResults.length);

  if (scanResults.length === 0) {
    console.log('No files found matching patterns:', config.include.join(', '));
    return;
  }

  const results = check(scanResults, registry, config);
  const summary = summarize(results, scanResults);

  report.reportCheck(results, summary);

  if (flags['fail-on-error'] !== false && summary.exitCode !== 0) {
    process.exit(summary.exitCode);
  }
}

async function runAudit(flags) {
  const config = await loadConfig();
  const targetPath = flags._[0] || process.cwd();
  const scanResults = await scanFiles(config, resolve(targetPath));

  report.reportScanning(scanResults.length);

  if (scanResults.length === 0) {
    console.log('No files found matching patterns:', config.include.join(', '));
    return;
  }

  const auditResult = audit(scanResults, config);
  report.reportAudit(auditResult);

  // Check threshold
  const threshold = flags.threshold || config.ns.maxTotal;
  if (auditResult.total > threshold) {
    console.log('');
    console.log(`ns count (${auditResult.total}) exceeds threshold (${threshold})`);
    process.exit(1);
  }
}

async function runGraph(flags) {
  const config = await loadConfig();
  const targetPath = flags._[0] || process.cwd();
  const scanResults = await scanFiles(config, resolve(targetPath));

  report.reportScanning(scanResults.length);

  if (scanResults.length === 0) {
    console.log('No files found matching patterns:', config.include.join(', '));
    return;
  }

  const graph = buildGraph(scanResults);
  const patterns = detectPatterns(graph);
  const anomalies = detectAnomalies(graph, scanResults);

  report.reportGraph(graph, patterns, anomalies);
}

async function runOptimize(flags) {
  const config = await loadConfig();

  const cssInput = flags.input || findFrameworkCSS(config);
  if (!cssInput || !existsSync(cssInput)) {
    console.error('Could not find framework CSS. Use --input <path> or configure framework.css in xandra.config.js');
    process.exit(1);
  }

  const cssOutput = flags.output || resolve(process.cwd(), 'dist', 'xandra.optimized.css');
  const targetPath = flags._[0] || process.cwd();
  const scanResults = await scanFiles(config, resolve(targetPath));

  report.reportScanning(scanResults.length);

  const result = optimize(scanResults, cssInput, cssOutput);
  report.reportOptimize(result, cssOutput);
}

async function runInit(flags) {
  const configPath = resolve(process.cwd(), 'xandra.config.js');

  if (existsSync(configPath) && !flags.force) {
    console.log(`xandra.config.js already exists. Use --force to overwrite.`);
    return;
  }

  const template = `/** @type {import('xcc').XandraConfig} */
export default {
  // Xandra class prefix (change only for genuine namespace conflicts)
  prefix: "x-",

  // Template file patterns to scan
  include: [
    "**/*.html",
    "**/*.vue",
    "**/*.svelte",
  ],

  // Files to skip
  exclude: [
    "node_modules/**",
    "dist/**",
    ".git/**",
  ],

  // Framework CSS location (auto-detected if null)
  framework: {
    css: null,
  },

  // NS enforcement
  ns: {
    requireReason: true,       // data-ns must be present on [ns] elements
    maxPerFile: 10,            // warn if a file exceeds this ns count
    maxTotal: 50,              // xcc audit --threshold default
    boundarySkipChildren: true,// don't count children inside [data-ns-boundary]
  },

  // Check settings
  check: {
    failOnError: true,
    failOnWarning: false,
  },

  // Nesting depth
  depth: {
    warn: 6,                   // warn if x- class nesting exceeds this
  },
};
`;

  writeFileSync(configPath, template, 'utf-8');
  report.reportInit(configPath);
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseFlags(args) {
  const flags = { _: [] };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const eqIndex = key.indexOf('=');

      if (eqIndex !== -1) {
        flags[key.slice(0, eqIndex)] = key.slice(eqIndex + 1);
      } else {
        // Check if next arg is the value
        const next = args[i + 1];
        if (next && !next.startsWith('-')) {
          flags[key] = next;
          i++;
        } else {
          flags[key] = true;
        }
      }
    } else if (arg.startsWith('-')) {
      flags[arg.slice(1)] = true;
    } else {
      flags._.push(arg);
    }
  }

  return flags;
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

function showHelp() {
  console.log(`
${bold('xcc')} — Xandra Contract Compiler

${bold('USAGE')}
  xcc <command> [path] [options]

${bold('COMMANDS')}
  check [path]       Validate HTML against the Xandra contract
                     Reports: ns without reasons, conflicting classes,
                     unmarked non-standard classes, composition issues

  audit [path]       Analyze ns patterns across the codebase
                     Clusters similar reasons, suggests new x- classes
                     --threshold <n>  Fail if ns count exceeds threshold

  graph [path]       Build and display the composition graph
                     Shows parent-child relationships, detects patterns
                     and anomalies

  optimize [path]    Tree-shake unused x- classes from framework CSS
                     --input <path>   Input CSS (auto-detected if omitted)
                     --output <path>  Output CSS (default: dist/xandra.optimized.css)

  init               Create xandra.config.js with defaults
                     --force          Overwrite existing config

${bold('OPTIONS')}
  --help, -h         Show this help
  --version, -v      Show version

${bold('EXAMPLES')}
  xcc check src/                    Check all HTML in src/
  xcc audit                         Audit ns patterns in current directory
  xcc graph src/pages/              Graph compositions in pages
  xcc optimize --output dist/opt.css

${bold('CONFIG')}
  Create xandra.config.js with: xcc init
  The config controls file patterns, ns rules, and framework location.

${dim('https://github.com/xandra-css/xcc')}
`);
}

