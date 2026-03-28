/**
 * Contract Checker
 *
 * Validates scanned elements against the Xandra contract:
 * - ns without data-ns → ERROR
 * - Non-x- class without ns → WARNING
 * - Conflicting x- classes → ERROR
 * - Redundant x- classes → WARNING
 * - Unknown x- classes → WARNING
 * - Invalid parent-child compositions → ERROR/WARNING
 * - Excessive nesting depth → WARNING
 */

/**
 * @typedef {Object} CheckResult
 * @property {'error'|'warning'|'info'} severity
 * @property {string} code
 * @property {string} message
 * @property {string} file
 * @property {number} line
 * @property {string[]} [classes]
 */

export function check(scanResults, registry, config) {
  const results = [];

  for (const scan of scanResults) {
    if (scan.error) {
      results.push({
        severity: 'warning',
        code: 'PARSE_ERROR',
        message: `Could not parse file: ${scan.error}`,
        file: scan.file,
        line: 0,
      });
      continue;
    }

    for (const el of scan.elements) {
      // Skip non-element content
      if (!el.tag || el.tag === '#root') continue;

      // --- Rule 1: ns without data-ns ---
      if (el.hasNs && !el.nsReason && config.ns.requireReason) {
        results.push({
          severity: 'error',
          code: 'NS_NO_REASON',
          message: `[ns] without data-ns — every deviation needs a reason`,
          file: el.file,
          line: el.line,
        });
      }

      // --- Rule 2: Non-x- classes without ns ---
      if (el.nonXClasses.length > 0 && el.xClasses.length > 0 && !el.hasNs) {
        // Element uses both x- and non-x- classes but isn't marked ns
        // Filter out common harmless classes (js hooks, state classes)
        const suspicious = el.nonXClasses.filter(c =>
          !c.startsWith('js-') &&
          !c.startsWith('is-') &&
          !c.startsWith('has-') &&
          c !== 'active' &&
          c !== 'disabled' &&
          c !== 'open' &&
          c !== 'closed'
        );

        if (suspicious.length > 0) {
          results.push({
            severity: 'warning',
            code: 'UNMARKED_NON_STANDARD',
            message: `Non-x- class "${suspicious.join('", "')}" on element with x- classes but no [ns] attribute`,
            file: el.file,
            line: el.line,
            classes: suspicious,
          });
        }
      }

      // --- Rule 3: Conflicting x- classes ---
      const conflicts = registry.findConflicts(el.classes);
      for (const conflict of conflicts) {
        results.push({
          severity: conflict.severity,
          code: 'CONFLICT',
          message: `${conflict.classes.join(' + ')} — ${conflict.reason}`,
          file: el.file,
          line: el.line,
          classes: conflict.classes,
        });
      }

      // --- Rule 4: Redundant x- classes ---
      const redundancies = registry.findRedundancies(el.classes);
      for (const r of redundancies) {
        results.push({
          severity: 'warning',
          code: 'REDUNDANT',
          message: `${r.classes.join(' + ')} — ${r.reason}`,
          file: el.file,
          line: el.line,
          classes: r.classes,
        });
      }

      // --- Rule 5: Unknown x- classes ---
      for (const cls of el.xClasses) {
        if (registry.isUnknownXClass(cls)) {
          results.push({
            severity: 'warning',
            code: 'UNKNOWN_CLASS',
            message: `Unknown x- class "${cls}" — not in the Xandra framework`,
            file: el.file,
            line: el.line,
            classes: [cls],
          });
        }
      }

      // --- Rule 6: Parent-child composition ---
      if (el.parentXClasses.length > 0 && el.xClasses.length > 0) {
        for (const parentCls of el.parentXClasses) {
          for (const childCls of el.xClasses) {
            const issue = registry.checkComposition(parentCls, childCls);
            if (issue) {
              results.push({
                severity: issue.severity,
                code: issue.code,
                message: `${parentCls} > ${childCls} — ${issue.reason}`,
                file: el.file,
                line: el.line,
                classes: [parentCls, childCls],
              });
            }
          }
        }
      }

      // --- Rule 7a: Double density ---
      if (el.xClasses.includes('x-dense') || el.xClasses.includes('x-spacious')) {
        const elDensity = el.xClasses.includes('x-dense') ? 'x-dense' : 'x-spacious';
        if (el.parentXClasses.includes('x-dense') || el.parentXClasses.includes('x-spacious')) {
          const parentDensity = el.parentXClasses.includes('x-dense') ? 'x-dense' : 'x-spacious';
          results.push({
            severity: 'warning',
            code: 'DOUBLE_DENSITY',
            message: `${elDensity} inside ${parentDensity} — inner overrides outer, may cause unexpectedly ${elDensity === 'x-dense' ? 'tight' : 'wide'} spacing`,
            file: el.file,
            line: el.line,
            classes: [parentDensity, elDensity],
          });
        }
      }

      // --- Rule 8: Excessive nesting depth ---
      if (el.xClasses.length > 0 && el.depth > config.depth.warn) {
        results.push({
          severity: 'warning',
          code: 'DEEP_NESTING',
          message: `Element at DOM depth ${el.depth} exceeds threshold ${config.depth.warn} — consider flattening`,
          file: el.file,
          line: el.line,
        });
      }
    }
  }

  return results;
}

/**
 * Summarize check results
 */
export function summarize(results, scanResults) {
  const errors = results.filter(r => r.severity === 'error');
  const warnings = results.filter(r => r.severity === 'warning');
  const infos = results.filter(r => r.severity === 'info');

  const totalFiles = scanResults.length;
  const parseErrors = scanResults.filter(s => s.error).length;

  // Count ns elements
  let nsTotal = 0;
  let nsWithReason = 0;
  let nsWithoutReason = 0;
  let nsBoundary = 0;

  for (const scan of scanResults) {
    for (const el of scan.elements) {
      if (el.hasNs) {
        nsTotal++;
        if (el.nsBoundary) nsBoundary++;
        if (el.nsReason) nsWithReason++;
        else nsWithoutReason++;
      }
    }
  }

  return {
    totalFiles,
    parseErrors,
    errors: errors.length,
    warnings: warnings.length,
    infos: infos.length,
    nsTotal,
    nsWithReason,
    nsWithoutReason,
    nsBoundary,
    exitCode: errors.length > 0 ? 1 : 0,
  };
}
