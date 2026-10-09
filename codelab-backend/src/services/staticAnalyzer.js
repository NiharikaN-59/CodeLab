/**
 * Static code analysis engine
 * Performs pattern-based analysis on source code for common issues
 */

const SECURITY_PATTERNS = [
  {
    pattern: /eval\s*\(/g,
    type: 'security',
    priority: 'critical',
    title: 'Use of eval()',
    description: 'eval() can execute arbitrary code and is a major security risk.',
    rule: 'no-eval',
  },
  {
    pattern: /innerHTML\s*=/g,
    type: 'security',
    priority: 'high',
    title: 'Direct innerHTML assignment',
    description: 'Direct innerHTML assignment can lead to XSS vulnerabilities.',
    rule: 'no-inner-html',
  },
  {
    pattern: /document\.write\s*\(/g,
    type: 'security',
    priority: 'high',
    title: 'Use of document.write()',
    description: 'document.write() is deprecated and can lead to XSS attacks.',
    rule: 'no-document-write',
  },
  {
    pattern: /password\s*=\s*['"][^'"]+['"]/gi,
    type: 'security',
    priority: 'critical',
    title: 'Hardcoded password detected',
    description: 'Hardcoded passwords are a serious security vulnerability.',
    rule: 'no-hardcoded-password',
  },
  {
    pattern: /api[_-]?key\s*=\s*['"][^'"]+['"]/gi,
    type: 'security',
    priority: 'critical',
    title: 'Hardcoded API key detected',
    description: 'API keys should never be hardcoded in source code.',
    rule: 'no-hardcoded-api-key',
  },
  {
    pattern: /token\s*=\s*['"][A-Za-z0-9\-._~+/]{20,}['"]/gi,
    type: 'security',
    priority: 'critical',
    title: 'Hardcoded token detected',
    description: 'Tokens should not be hardcoded in source code.',
    rule: 'no-hardcoded-token',
  },
  {
    pattern: /exec\s*\(\s*(?:req\.|request\.|params\.|query\.)/g,
    type: 'security',
    priority: 'critical',
    title: 'Command injection risk',
    description: 'Executing commands with user-supplied input is extremely dangerous.',
    rule: 'no-command-injection',
  },
  {
    pattern: /Math\.random\(\)/g,
    type: 'security',
    priority: 'medium',
    title: 'Insecure random number generation',
    description: 'Math.random() is not cryptographically secure. Use crypto.getRandomValues() instead.',
    rule: 'no-insecure-random',
  },
  {
    pattern: /http:\/\//g,
    type: 'security',
    priority: 'medium',
    title: 'Insecure HTTP connection',
    description: 'Use HTTPS instead of HTTP for secure communication.',
    rule: 'no-http',
  },
];

const BUG_PATTERNS = [
  {
    pattern: /===\s*null\s*&&\s*===\s*undefined|==\s*null/g,
    type: 'bug',
    priority: 'medium',
    title: 'Loose null check',
    description: 'Use strict equality (=== null) or nullish coalescing for null checks.',
    rule: 'strict-null-check',
  },
  {
    pattern: /catch\s*\([^)]*\)\s*\{\s*\}/g,
    type: 'bug',
    priority: 'high',
    title: 'Empty catch block',
    description: 'Empty catch blocks silently swallow errors, making debugging difficult.',
    rule: 'no-empty-catch',
  },
  {
    pattern: /console\.(log|debug|info|warn|error)\s*\(/g,
    type: 'code_smell',
    priority: 'low',
    title: 'Console statement left in code',
    description: 'Console statements should be removed before production deployment.',
    rule: 'no-console',
  },
  {
    pattern: /TODO|FIXME|HACK|XXX/g,
    type: 'maintainability',
    priority: 'low',
    title: 'TODO/FIXME comment',
    description: 'Unresolved TODO or FIXME comments indicate incomplete implementation.',
    rule: 'no-todos',
  },
  {
    pattern: /var\s+/g,
    type: 'code_smell',
    priority: 'low',
    title: 'Use of var declaration',
    description: 'Prefer const or let over var for better scoping and predictability.',
    rule: 'no-var',
  },
  {
    pattern: /==\s|!=\s/g,
    type: 'bug',
    priority: 'medium',
    title: 'Loose equality comparison',
    description: 'Use === and !== for strict equality comparisons to avoid type coercion bugs.',
    rule: 'eqeqeq',
  },
  {
    pattern: /new Array\(\d+\)/g,
    type: 'code_smell',
    priority: 'low',
    title: 'Array constructor usage',
    description: 'Use array literals [] instead of new Array() for clarity.',
    rule: 'no-array-constructor',
  },
  {
    pattern: /\.then\s*\(\s*function|\.then\s*\(\s*\(/g,
    type: 'maintainability',
    priority: 'low',
    title: 'Promise chaining could use async/await',
    description: 'Consider using async/await for cleaner asynchronous code.',
    rule: 'prefer-async-await',
  },
];

const COMPLEXITY_PATTERNS = [
  {
    pattern: /if\s*\(.*\)\s*\{[\s\S]*?if\s*\(.*\)\s*\{[\s\S]*?if\s*\(.*\)\s*\{/g,
    type: 'complexity',
    priority: 'high',
    title: 'Deep nesting detected',
    description: 'Deeply nested conditionals increase complexity and reduce readability.',
    rule: 'max-depth',
  },
];

const PYTHON_PATTERNS = [
  {
    pattern: /import \*/g,
    type: 'code_smell',
    priority: 'medium',
    title: 'Wildcard import',
    description: 'Wildcard imports can cause namespace pollution. Import specific names instead.',
    rule: 'no-wildcard-import',
  },
  {
    pattern: /except:/g,
    type: 'bug',
    priority: 'high',
    title: 'Bare except clause',
    description: 'Bare except catches all exceptions including SystemExit. Use specific exception types.',
    rule: 'no-bare-except',
  },
  {
    pattern: /print\s*\(/g,
    type: 'code_smell',
    priority: 'low',
    title: 'Print statement in production code',
    description: 'Use logging module instead of print statements.',
    rule: 'no-print',
  },
];

const JAVA_PATTERNS = [
  {
    pattern: /System\.out\.print/g,
    type: 'code_smell',
    priority: 'low',
    title: 'System.out.println in code',
    description: 'Use a proper logging framework (Log4j, SLF4J) instead of System.out.',
    rule: 'no-system-out',
  },
  {
    pattern: /e\.printStackTrace\(\)/g,
    type: 'code_smell',
    priority: 'medium',
    title: 'Stack trace printed to console',
    description: 'Log exceptions properly instead of printing stack traces.',
    rule: 'no-stack-trace-print',
  },
  {
    pattern: /catch\s*\(\s*Exception\s+/g,
    type: 'code_smell',
    priority: 'medium',
    title: 'Catching generic Exception',
    description: 'Catch specific exceptions rather than the generic Exception class.',
    rule: 'no-generic-exception-catch',
  },
];

/**
 * Calculate priority score for sorting
 */
const PRIORITY_SCORES = { critical: 100, high: 75, medium: 50, low: 25 };
const TYPE_SCORES = { security: 30, bug: 20, complexity: 15, code_smell: 5, maintainability: 5, performance: 10, syntax: 25 };

const calculatePriorityScore = (priority, type) => {
  return (PRIORITY_SCORES[priority] || 0) + (TYPE_SCORES[type] || 0);
};

/**
 * Find line number for a match in content
 */
const getLineNumber = (content, index) => {
  const lines = content.substring(0, index).split('\n');
  return lines.length;
};

const getCodeSnippet = (content, lineNum, range = 2) => {
  const lines = content.split('\n');
  const start = Math.max(0, lineNum - range - 1);
  const end = Math.min(lines.length, lineNum + range);
  return lines.slice(start, end).join('\n');
};

/**
 * Run static analysis on a file
 */
const stripComments = (content, language) => {
  let cleaned = content;
  // Replace block comments with spaces (preserves newlines and lengths)
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, (match) => {
    return match.split('\n').map(line => ' '.repeat(line.length)).join('\n');
  });
  // Replace single line comments
  if (['python', 'ruby', 'bash'].includes(language)) {
    cleaned = cleaned.replace(/#.*$/gm, (match) => ' '.repeat(match.length));
  } else {
    cleaned = cleaned.replace(/\/\/.*$/gm, (match) => ' '.repeat(match.length));
  }
  return cleaned;
};

const analyzeFile = (filename, content, language) => {
  const issues = [];
  const cleanContent = stripComments(content, language);
  const patternsToRun = [...SECURITY_PATTERNS, ...BUG_PATTERNS, ...COMPLEXITY_PATTERNS];

  if (['python'].includes(language)) patternsToRun.push(...PYTHON_PATTERNS);
  if (['java'].includes(language)) patternsToRun.push(...JAVA_PATTERNS);

  for (const def of patternsToRun) {
    const regex = new RegExp(def.pattern.source, def.pattern.flags.replace('g', '') + 'g');
    let match;
    while ((match = regex.exec(cleanContent)) !== null) {
      const line = getLineNumber(content, match.index);
      const snippet = getCodeSnippet(content, line);
      issues.push({
        file: filename,
        type: def.type,
        priority: def.priority,
        title: def.title,
        description: def.description,
        rule: def.rule,
        line,
        codeSnippet: snippet,
        source: 'static',
        priorityScore: calculatePriorityScore(def.priority, def.type),
      });
      // Limit matches per pattern per file
      if (issues.filter((i) => i.rule === def.rule).length >= 5) break;
    }
  }

  // Check for long functions (complexity)
  const lines = content.split('\n');
  if (lines.length > 500) {
    issues.push({
      file: filename,
      type: 'complexity',
      priority: 'medium',
      title: 'Large file detected',
      description: `This file has ${lines.length} lines. Consider splitting it into smaller modules.`,
      rule: 'max-file-length',
      line: 1,
      codeSnippet: null,
      source: 'static',
      priorityScore: calculatePriorityScore('medium', 'complexity'),
    });
  }

  // Sort by priority score descending
  return issues.sort((a, b) => b.priorityScore - a.priorityScore);
};

/**
 * Aggregate analysis across all files
 */
const analyzeProject = (files) => {
  const allIssues = [];
  const filePriorities = {};

  for (const file of files) {
    if (file.isDirectory || !file.content) continue;
    const fileIssues = analyzeFile(file.path, file.content, file.language);
    allIssues.push(...fileIssues);

    // Determine file priority
    const hasCritical = fileIssues.some((i) => i.priority === 'critical');
    const hasHigh = fileIssues.some((i) => i.priority === 'high');
    const hasMedium = fileIssues.some((i) => i.priority === 'medium');
    const hasLow = fileIssues.some((i) => i.priority === 'low');

    filePriorities[file.path] = hasCritical
      ? 'critical'
      : hasHigh
      ? 'high'
      : hasMedium
      ? 'medium'
      : hasLow
      ? 'low'
      : 'none';
  }

  const summary = {
    total: allIssues.length,
    critical: allIssues.filter((i) => i.priority === 'critical').length,
    high: allIssues.filter((i) => i.priority === 'high').length,
    medium: allIssues.filter((i) => i.priority === 'medium').length,
    low: allIssues.filter((i) => i.priority === 'low').length,
    security: allIssues.filter((i) => i.type === 'security').length,
    bugs: allIssues.filter((i) => i.type === 'bug').length,
    codeSmells: allIssues.filter((i) => i.type === 'code_smell').length,
    complexity: allIssues.filter((i) => i.type === 'complexity').length,
    maintainability: allIssues.filter((i) => i.type === 'maintainability').length,
  };

  // Quality score: starts at 100, deduct points per issue
  const deductions =
    summary.critical * 20 +
    summary.high * 10 +
    summary.medium * 5 +
    summary.low * 1;
  const qualityScore = Math.max(0, 100 - deductions);

  return { issues: allIssues, summary, filePriorities, qualityScore };
};

module.exports = { analyzeFile, analyzeProject, calculatePriorityScore };
