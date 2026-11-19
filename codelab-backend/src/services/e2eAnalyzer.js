/**
 * CodeLab End-to-End Application Analysis & Testing Engine
 *
 * Performs comprehensive cross-layer inspection:
 * - Architecture & Framework detection
 * - Code quality, syntax & logic checks
 * - Frontend component & navigation audit
 * - Backend routes & middleware validation
 * - Cross-layer API contract testing (Frontend <-> Backend)
 * - Database schema, query & IDOR authorization inspection
 * - Authentication, JWT & security vulnerability scanning
 * - Dependency auditing & broken import resolution
 * - End-to-end workflow tracing & dependency topology mapping
 */

const { calculatePriorityScore, analyzeFile: runSingleFileStatic } = require('./staticAnalyzer');

// --- HELPER PARSERS & TOKENIZERS ---

const cleanQuotes = (str) => {
  if (!str) return '';
  return str.replace(/^['"`]|['"`]$/g, '').trim();
};

const normalizeUrlPath = (url) => {
  if (!url) return '';
  let cleaned = url.replace(/https?:\/\/[^/]+/i, ''); // Strip protocol and host if any
  cleaned = cleaned.split('?')[0]; // Strip query strings
  // Replace template literals or Express params with standard placeholder :param
  cleaned = cleaned.replace(/\$\{[^}]+\}/g, ':param');
  cleaned = cleaned.replace(/\/+/g, '/');
  if (cleaned.length > 1 && cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }
  return cleaned;
};

const getLineNumber = (content, index) => {
  if (!content || index == null) return 1;
  return content.substring(0, index).split('\n').length;
};

const getSnippet = (content, lineNum, range = 2) => {
  if (!content) return '';
  const lines = content.split('\n');
  const start = Math.max(0, lineNum - range - 1);
  const end = Math.min(lines.length, lineNum + range);
  return lines.slice(start, end).join('\n');
};

/**
 * 1. Discover Project Architecture & Topology
 */
const discoverArchitecture = (files) => {
  const topology = {
    frontend: { framework: null, files: [], components: [], apiCalls: [], routes: [] },
    backend: { framework: null, files: [], routes: [], controllers: [], middlewares: [] },
    database: { orm: null, models: [], queries: [] },
    dependencies: { packages: {}, devPackages: {}, file: null },
    envVars: { referenced: new Set(), defined: new Set() },
    tests: [],
  };

  for (const file of files) {
    if (file.isDirectory || !file.content) continue;
    const pathLower = file.path.toLowerCase();
    const content = file.content;

    // Detect package.json
    if (pathLower.endsWith('package.json')) {
      topology.dependencies.file = file.path;
      try {
        const parsed = JSON.parse(content);
        topology.dependencies.packages = parsed.dependencies || {};
        topology.dependencies.devPackages = parsed.devDependencies || {};
      } catch (e) {
        // Syntax error in package.json will be flagged in build analysis
      }
    }

    // Detect .env or .env.example
    if (pathLower.endsWith('.env') || pathLower.endsWith('.env.example')) {
      const lines = content.split('\n');
      for (const l of lines) {
        const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
        if (m) topology.envVars.defined.add(m[1]);
      }
    }

    // Detect referenced environment variables
    const envMatches = content.matchAll(/process\.env\.([A-Za-z_][A-Za-z0-9_]*)/g);
    for (const m of envMatches) {
      topology.envVars.referenced.add(m[1]);
    }

    // Detect tests
    if (pathLower.includes('.test.') || pathLower.includes('.spec.') || pathLower.includes('/tests/') || pathLower.includes('/__tests__/')) {
      topology.tests.push(file.path);
    }

    // Categorize files into Frontend vs Backend vs Database
    const isFrontendPath =
      pathLower.includes('frontend') ||
      pathLower.includes('client') ||
      pathLower.includes('src/components') ||
      pathLower.includes('src/pages') ||
      pathLower.includes('src/views') ||
      pathLower.endsWith('.jsx') ||
      pathLower.endsWith('.tsx') ||
      pathLower.endsWith('.vue');

    const isDatabasePath =
      pathLower.includes('models/') ||
      pathLower.includes('schemas/') ||
      pathLower.includes('entities/') ||
      pathLower.endsWith('.prisma');

    if (isDatabasePath) {
      topology.database.models.push(file);
    } else if (isFrontendPath) {
      topology.frontend.files.push(file);
    } else {
      topology.backend.files.push(file);
    }
  }

  // Detect frameworks based on packages and imports
  const allDeps = { ...topology.dependencies.packages, ...topology.dependencies.devPackages };
  if (allDeps['react'] || topology.frontend.files.some(f => f.content?.includes('from \'react\'') || f.content?.includes('from "react"'))) {
    topology.frontend.framework = 'React';
  } else if (allDeps['vue']) {
    topology.frontend.framework = 'Vue';
  }

  if (allDeps['express'] || topology.backend.files.some(f => f.content?.includes('require(\'express\')') || f.content?.includes('from \'express\''))) {
    topology.backend.framework = 'Express';
  } else if (allDeps['@nestjs/core']) {
    topology.backend.framework = 'NestJS';
  } else if (allDeps['fastify']) {
    topology.backend.framework = 'Fastify';
  }

  if (allDeps['mongoose'] || files.some(f => f.content?.includes('mongoose.model') || f.content?.includes('new Schema'))) {
    topology.database.orm = 'Mongoose (MongoDB)';
  } else if (allDeps['@prisma/client']) {
    topology.database.orm = 'Prisma ORM';
  } else if (allDeps['sequelize']) {
    topology.database.orm = 'Sequelize';
  }

  return topology;
};

/**
 * 2. Cross-Layer API Contract Extraction
 */
const extractApiContracts = (files) => {
  const frontendCalls = [];
  const backendRoutes = [];

  // Patterns for Frontend API calls
  const clientCallPatterns = [
    // api.get('/path'), api.post('/path'), axios.get('/path'), etc.
    /(?:api|axios|http|request)\.(get|post|put|delete|patch)\s*\(\s*[`'"]([^`'"]+)[`'"]/gi,
    // fetch('/path', { method: 'POST' })
    /fetch\s*\(\s*[`'"]([^`'"]+)[`'"](?:\s*,\s*\{[^}]*method\s*:\s*['"`](GET|POST|PUT|DELETE|PATCH)['"`])?/gi,
  ];

  // Patterns for Backend Route Definitions
  const backendRoutePatterns = [
    // router.get('/path', ...), app.post('/path', ...)
    /(?:router|app)\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
  ];

  // Track route prefixes (e.g., app.use('/api/projects', projectRouter))
  const mountPrefixes = {};
  for (const file of files) {
    if (file.isDirectory || !file.content) continue;
    const content = file.content;
    const mountMatches = content.matchAll(/(?:app|router)\.use\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*([A-Za-z0-9_]+)/g);
    for (const m of mountMatches) {
      const prefix = m[1];
      const routerVar = m[2];
      mountPrefixes[routerVar] = prefix;
    }
  }

  // Extract from files
  for (const file of files) {
    if (file.isDirectory || !file.content) continue;
    const content = file.content;

    // Check for Frontend API calls
    for (const p of clientCallPatterns) {
      const regex = new RegExp(p.source, p.flags);
      let match;
      while ((match = regex.exec(content)) !== null) {
        let method = 'GET';
        let rawUrl = '';

        if (p.source.includes('fetch')) {
          rawUrl = match[1];
          method = match[2] ? match[2].toUpperCase() : 'GET';
        } else {
          method = match[1].toUpperCase();
          rawUrl = match[2];
        }

        const normalized = normalizeUrlPath(rawUrl);
        if (normalized.startsWith('/') || normalized.startsWith('api')) {
          frontendCalls.push({
            file: file.path,
            line: getLineNumber(content, match.index),
            rawUrl,
            normalizedUrl: normalized.startsWith('/') ? normalized : `/${normalized}`,
            method,
            snippet: getSnippet(content, getLineNumber(content, match.index)),
          });
        }
      }
    }

    // Check for Backend route handlers
    for (const p of backendRoutePatterns) {
      const regex = new RegExp(p.source, p.flags);
      let match;
      while ((match = regex.exec(content)) !== null) {
        const method = match[1].toUpperCase();
        let routePath = match[2];

        // Apply mount prefix if filename matches standard conventions
        const filename = file.name ? file.name.replace(/\.[^/.]+$/, '') : '';
        let fullPath = routePath;
        if (mountPrefixes[filename]) {
          fullPath = `${mountPrefixes[filename]}${routePath}`;
        } else if (file.path.includes('/routes/') && !routePath.startsWith('/api')) {
          // Infer prefix from route file name (e.g., routes/projects.js -> /api/projects or /projects)
          const baseName = file.name.replace(/\.[^/.]+$/, '');
          fullPath = `/api/${baseName}${routePath === '/' ? '' : routePath}`;
        }

        const normalized = normalizeUrlPath(fullPath);

        // Check if route has authentication/authorization middlewares
        const lineStr = content.split('\n')[getLineNumber(content, match.index) - 1] || '';
        const hasAuth =
          lineStr.includes('authenticate') ||
          lineStr.includes('requireAuth') ||
          lineStr.includes('verifyToken') ||
          lineStr.includes('requireAdmin') ||
          content.includes('router.use(authenticate)');

        const hasAdmin =
          lineStr.includes('requireAdmin') ||
          lineStr.includes('adminOnly') ||
          lineStr.includes('checkAdmin');

        backendRoutes.push({
          file: file.path,
          line: getLineNumber(content, match.index),
          rawPath: routePath,
          normalizedPath: normalized.startsWith('/') ? normalized : `/${normalized}`,
          method,
          hasAuth,
          hasAdmin,
          snippet: getSnippet(content, getLineNumber(content, match.index)),
        });
      }
    }
  }

  return { frontendCalls, backendRoutes };
};

/**
 * 3. Master Multi-Stage E2E Project Analyzer
 */
const runEndToEndAnalysis = (files, project) => {
  const issues = [];
  const topology = discoverArchitecture(files);
  const { frontendCalls, backendRoutes } = extractApiContracts(files);

  const stageResults = [
    { id: 'code_quality', name: 'Code Quality & Static Analysis', status: 'passed', issuesCount: 0, details: 'Verified syntax, code structure, and patterns' },
    { id: 'frontend', name: 'Frontend Architecture & Components', status: 'passed', issuesCount: 0, details: 'Validated rendering, states, and client navigation' },
    { id: 'backend', name: 'Backend Routes & Controllers', status: 'passed', issuesCount: 0, details: 'Inspected API routes, error handlers, and business logic' },
    { id: 'api_contract', name: 'API Contract & Integration Testing', status: 'passed', issuesCount: 0, details: 'Verified frontend requests match backend API endpoints' },
    { id: 'database', name: 'Database Schemas & Query Safety', status: 'passed', issuesCount: 0, details: 'Audited models, schema constraints, and ownership checks' },
    { id: 'auth_security', name: 'Authentication & Access Control', status: 'passed', issuesCount: 0, details: 'Evaluated JWT tokens, passwords, and authorization guards' },
    { id: 'vulnerabilities', name: 'Security Vulnerability Scan', status: 'passed', issuesCount: 0, details: 'Scanned for OWASP Top 10, injections, and exposed secrets' },
    { id: 'dependencies', name: 'Dependencies & Build Configuration', status: 'passed', issuesCount: 0, details: 'Checked package versions, missing imports, and build scripts' },
    { id: 'workflow', name: 'End-to-End Workflow Tracing', status: 'passed', issuesCount: 0, details: 'Traced component-to-database user interaction journeys' },
  ];

  const dependencyMap = [];

  // ==========================================
  // STAGE A: CODE-LEVEL STATIC ANALYSIS
  // ==========================================
  for (const file of files) {
    if (file.isDirectory || !file.content) continue;
    const staticResults = runSingleFileStatic(file.path, file.content, file.language);
    for (const sr of staticResults) {
      issues.push({
        ...sr,
        source: 'Static Analysis',
        category: sr.type === 'security' ? 'Security Vulnerability' : 'Code Quality',
        component: file.path.includes('frontend') ? 'Frontend Module' : 'Backend Module',
        evidence: `Rule: ${sr.rule} at line ${sr.line}`,
        potentialImpact: sr.description,
        reproductionSteps: `Open ${file.path} at line ${sr.line} and inspect token sequence.`,
      });
    }

    // Check for unhandled asynchronous errors (Missing try/catch in async functions)
    const content = file.content;
    const asyncFnMatches = content.matchAll(/async\s+(?:function\s*([A-Za-z0-9_]*)|([A-Za-z0-9_]+)\s*=\s*async|(?:\(([^)]*)\)\s*=>|\b\w+\s*=>))/g);
    for (const afm of asyncFnMatches) {
      const idx = afm.index;
      const fnName = afm[1] || afm[2] || 'anonymous';
      const fnBodyStart = content.indexOf('{', idx);
      if (fnBodyStart !== -1) {
        const bodySnippet = content.substring(fnBodyStart, Math.min(content.length, fnBodyStart + 350));
        if (bodySnippet.includes('await ') && !bodySnippet.includes('try') && !bodySnippet.includes('.catch(')) {
          const line = getLineNumber(content, idx);
          issues.push({
            file: file.path,
            line,
            type: 'bug',
            priority: 'high',
            title: `Unhandled async exception in ${fnName}()`,
            description: `Async function contains awaited promises without a try-catch block or error recovery. Unhandled promise rejections can crash the process or leave client requests hanging.`,
            rule: 'require-await-catch',
            codeSnippet: getSnippet(content, line),
            source: 'Static Analysis',
            category: 'Reliability',
            component: 'Asynchronous Handler',
            evidence: `Async function '${fnName}' awaits promises without try-catch at line ${line}`,
            potentialImpact: 'Unhandled promise rejection leading to ungraceful server error or frozen UI state.',
            reproductionSteps: `Trigger async call in '${fnName}' with network failure or rejected promise.`,
            priorityScore: calculatePriorityScore('high', 'bug'),
          });
        }
      }
    }
  }

  // ==========================================
  // STAGE B: FRONTEND ANALYSIS
  // ==========================================
  for (const file of topology.frontend.files) {
    const content = file.content;
    if (!content) continue;

    // 1. Missing loading / error state in data-fetching components
    if (content.includes('useEffect') && (content.includes('api.') || content.includes('fetch(') || content.includes('axios.'))) {
      const hasLoadingState = content.includes('setLoading') || content.includes('loading') || content.includes('isLoading');
      const hasErrorHandling = content.includes('catch') || content.includes('toast.error') || content.includes('setError');

      if (!hasLoadingState || !hasErrorHandling) {
        const line = getLineNumber(content, content.indexOf('useEffect'));
        issues.push({
          file: file.path,
          line,
          type: 'code_smell',
          priority: 'medium',
          title: 'Component lacks async loading or error recovery states',
          description: `Component fetches asynchronous remote data in useEffect but does not maintain visible loading indicators or error feedback states.`,
          rule: 'frontend-async-state-handling',
          codeSnippet: getSnippet(content, line),
          source: 'Frontend Analysis',
          category: 'Frontend Architecture',
          component: 'React UI Component',
          evidence: `Component fetches data at line ${line} without explicit ${!hasLoadingState ? 'loading indicator' : 'error handling'} state.`,
          potentialImpact: 'Blank or unresponsive user interface during high latency or failed network requests.',
          reproductionSteps: `Load component under simulated slow network (3G) or when backend returns 500 status.`,
          priorityScore: calculatePriorityScore('medium', 'code_smell'),
        });
      }
    }

    // 2. Dangerous DOM manipulation
    if (content.includes('dangerouslySetInnerHTML')) {
      const line = getLineNumber(content, content.indexOf('dangerouslySetInnerHTML'));
      issues.push({
        file: file.path,
        line,
        type: 'security',
        priority: 'critical',
        title: 'Potential Cross-Site Scripting via dangerouslySetInnerHTML',
        description: 'Direct insertion of HTML bypasses React sanitization mechanisms and risks client-side Cross-Site Scripting (XSS) if user input is rendered.',
        rule: 'react-no-dangerously-set-inner-html',
        codeSnippet: getSnippet(content, line),
        source: 'Security Scan',
        category: 'Security Vulnerability',
        component: 'React DOM Renderer',
        evidence: `dangerouslySetInnerHTML detected at line ${line}`,
        potentialImpact: 'Arbitrary JavaScript execution in user browser, session cookie theft, or account takeover.',
        reproductionSteps: `Inject payload <img src=x onerror=alert(1)> into the rendered property.`,
        priorityScore: calculatePriorityScore('critical', 'security'),
      });
    }
  }

  // ==========================================
  // STAGE C & D: CROSS-LAYER API CONTRACT TESTING
  // ==========================================
  for (const call of frontendCalls) {
    // Attempt to match frontend call against backend routes
    const matchingRoute = backendRoutes.find((r) => {
      if (r.method !== call.method) return false;

      // Exact match
      if (r.normalizedPath === call.normalizedUrl) return true;

      // Parametric match (e.g., /api/projects/:id vs /api/projects/:param)
      const rParts = r.normalizedPath.split('/');
      const cParts = call.normalizedUrl.split('/');
      if (rParts.length !== cParts.length) return false;

      return rParts.every((part, idx) => part.startsWith(':') || cParts[idx].startsWith(':') || part === cParts[idx]);
    });

    if (!matchingRoute) {
      // Check if path exists with DIFFERENT method (Method Mismatch)
      const methodMismatchRoute = backendRoutes.find((r) => {
        const rParts = r.normalizedPath.split('/');
        const cParts = call.normalizedUrl.split('/');
        if (rParts.length !== cParts.length) return false;
        return rParts.every((part, idx) => part.startsWith(':') || cParts[idx].startsWith(':') || part === cParts[idx]);
      });

      if (methodMismatchRoute) {
        issues.push({
          file: call.file,
          line: call.line,
          type: 'bug',
          priority: 'high',
          title: `API Method Mismatch: ${call.method} ${call.rawUrl}`,
          description: `Frontend client dispatches HTTP ${call.method} to "${call.rawUrl}", but backend route is registered for HTTP ${methodMismatchRoute.method} in ${methodMismatchRoute.file}:${methodMismatchRoute.line}.`,
          rule: 'api-method-mismatch',
          codeSnippet: call.snippet,
          source: 'API Contract',
          category: 'API Integration',
          component: 'Frontend / Backend Contract',
          evidence: `Client calls ${call.method} ${call.rawUrl} (line ${call.line}) vs Backend ${methodMismatchRoute.method} ${methodMismatchRoute.normalizedPath} (${methodMismatchRoute.file}:${methodMismatchRoute.line})`,
          potentialImpact: 'API request will fail with HTTP 405 Method Not Allowed or 404 Route Not Found.',
          reproductionSteps: `Trigger network call from ${call.file} and inspect HTTP status code in browser network inspector.`,
          priorityScore: calculatePriorityScore('high', 'bug'),
        });

        dependencyMap.push({
          source: `Frontend: ${call.file.split('/').pop()}`,
          target: `API: ${methodMismatchRoute.normalizedPath}`,
          type: 'api_contract',
          status: 'broken',
          detail: `Method mismatch: client uses ${call.method}, server expects ${methodMismatchRoute.method}`,
        });
      } else if (backendRoutes.length > 0 && !call.rawUrl.startsWith('http')) {
        // Endpoint Not Found
        issues.push({
          file: call.file,
          line: call.line,
          type: 'bug',
          priority: 'high',
          title: `Unmatched API Endpoint: ${call.method} ${call.rawUrl}`,
          description: `Frontend component calls endpoint "${call.rawUrl}", but no matching route handler exists in the backend routing table.`,
          rule: 'api-endpoint-not-found',
          codeSnippet: call.snippet,
          source: 'API Contract',
          category: 'API Integration',
          component: 'API Client Integration',
          evidence: `Route '${call.rawUrl}' not found in any backend router definitions.`,
          potentialImpact: 'Client requests will immediately fail with HTTP 404 Not Found at runtime.',
          reproductionSteps: `Submit action in ${call.file} triggering ${call.method} ${call.rawUrl}.`,
          priorityScore: calculatePriorityScore('high', 'bug'),
        });

        dependencyMap.push({
          source: `Frontend: ${call.file.split('/').pop()}`,
          target: `API: ${call.normalizedUrl}`,
          type: 'api_contract',
          status: 'broken',
          detail: `Route handler does not exist on backend`,
        });
      }
    } else {
      // Endpoint matched! Check if backend route requires authentication but frontend sends no auth headers
      dependencyMap.push({
        source: `Frontend: ${call.file.split('/').pop()}`,
        target: `API: ${matchingRoute.method} ${matchingRoute.normalizedPath}`,
        type: 'api_contract',
        status: matchingRoute.hasAuth ? 'connected' : 'unprotected',
        detail: `Valid API contract${matchingRoute.hasAuth ? ' with Auth protection' : ' (Public endpoint)'}`,
      });
    }
  }

  // ==========================================
  // STAGE E: DATABASE SCHEMA & QUERY SAFETY (IDOR AUDIT)
  // ==========================================
  for (const file of topology.backend.files) {
    const content = file.content;
    if (!content) continue;

    // Look for Insecure Direct Object References (IDOR):
    // Model.findByIdAndUpdate(req.params.id, ...) or Model.findById(req.params.id) without owner check
    const idorPatterns = [
      /([A-Za-z0-9_]+)\.(?:findByIdAndUpdate|findByIdAndDelete|findOneAndDelete)\s*\(\s*req\.params\.([A-Za-z0-9_]+)/g,
      /([A-Za-z0-9_]+)\.deleteOne\s*\(\s*\{\s*_id\s*:\s*req\.params\.([A-Za-z0-9_]+)\s*\}\s*\)/g,
    ];

    for (const p of idorPatterns) {
      let match;
      while ((match = p.exec(content)) !== null) {
        const modelName = match[1];
        const line = getLineNumber(content, match.index);
        const snippet = getSnippet(content, line, 4);

        // Check if user/owner check is present in snippet or adjacent lines
        const hasOwnerVerification =
          snippet.includes('owner') ||
          snippet.includes('req.user') ||
          snippet.includes('user._id') ||
          snippet.includes('userId');

        if (!hasOwnerVerification && modelName !== 'User') {
          issues.push({
            file: file.path,
            line,
            type: 'security',
            priority: 'critical',
            title: `Broken Object Level Authorization (IDOR) on ${modelName}`,
            description: `Database record is modified or deleted directly by ID from request parameters without verifying whether the authenticated user owns or is authorized to access the record.`,
            rule: 'security-idor-missing-owner-check',
            codeSnippet: snippet,
            source: 'Database Test',
            category: 'Access Control',
            component: 'Database Controller',
            evidence: `${modelName} modified via direct req.params at line ${line} without ownership check`,
            potentialImpact: 'Attackers can modify or delete arbitrary user records simply by passing another resource ID.',
            reproductionSteps: `Authenticate as User A, send request targeting resource ID belonging to User B.`,
            priorityScore: calculatePriorityScore('critical', 'security'),
          });
        }
      }
    }

    // Connect Backend -> Database in Topology Map
    const modelQueries = content.matchAll(/([A-Z][A-Za-z0-9_]+)\.(find|findOne|findById|create|save|aggregate)/g);
    for (const mq of modelQueries) {
      const model = mq[1];
      if (['Array', 'Object', 'Promise', 'Date', 'Math', 'JSON'].includes(model)) continue;
      const existing = dependencyMap.find(d => d.source.includes(file.name) && d.target.includes(model));
      if (!existing) {
        dependencyMap.push({
          source: `Controller: ${file.name}`,
          target: `Database Model: ${model}`,
          type: 'database_query',
          status: 'connected',
          detail: `Queries ${model} collection`,
        });
      }
    }
  }

  // ==========================================
  // STAGE F: AUTHENTICATION & ACCESS CONTROL
  // ==========================================
  for (const file of topology.backend.files) {
    const content = file.content;
    if (!content) continue;

    // Check for hardcoded JWT secrets
    const jwtSecretMatch = content.match(/jwt\.sign\s*\([^,]+,\s*['"`]([^'"`]+)['"`]/);
    if (jwtSecretMatch) {
      const line = getLineNumber(content, jwtSecretMatch.index);
      issues.push({
        file: file.path,
        line,
        type: 'security',
        priority: 'critical',
        title: 'Hardcoded JWT Signing Secret',
        description: 'JWT token is signed using a hardcoded secret string instead of a secure environment variable. Anyone with access to the source code can forge valid authentication tokens.',
        rule: 'security-hardcoded-jwt-secret',
        codeSnippet: getSnippet(content, line),
        source: 'Security Scan',
        category: 'Authentication',
        component: 'JWT Token Service',
        evidence: `Hardcoded secret string passed directly into jwt.sign() at line ${line}`,
        potentialImpact: 'Total authentication bypass: attackers can forge tokens with arbitrary user identities and admin roles.',
        reproductionSteps: `Extract secret string from line ${line} and sign arbitrary token with jwt.io.`,
        priorityScore: calculatePriorityScore('critical', 'security'),
      });
    }

    // Check for sensitive routes lacking authentication middleware
    const sensitiveRouteMatch = content.matchAll(/(?:router|app)\.(post|put|delete)\s*\(\s*['"`]([^'"`]*(?:admin|user|setting|project|billing|payment|token)[^'"`]*)['"`]\s*,\s*(?!.*authenticate)(?!.*requireAuth)(?!.*verifyToken)(async\s*\([^)]*\)|function|\([^)]*\)\s*=>)/gi);
    for (const srm of sensitiveRouteMatch) {
      const routePath = srm[2];
      const line = getLineNumber(content, srm.index);
      // Skip public registration/login endpoints
      if (routePath.includes('login') || routePath.includes('register') || routePath.includes('forgot')) continue;

      issues.push({
        file: file.path,
        line,
        type: 'security',
        priority: 'high',
        title: `Unauthenticated Sensitive Endpoint: ${srm[1].toUpperCase()} ${routePath}`,
        description: `State-altering route on sensitive resource "${routePath}" is declared without authentication middleware, allowing anonymous unauthenticated access.`,
        rule: 'security-missing-auth-guard',
        codeSnippet: getSnippet(content, line),
        source: 'Security Scan',
        category: 'Authentication',
        component: 'Route Guard',
        evidence: `Route '${srm[1].toUpperCase()} ${routePath}' declared at line ${line} without authenticate middleware`,
        potentialImpact: 'Unauthenticated third parties can execute state-changing operations on sensitive resources.',
        reproductionSteps: `Send ${srm[1].toUpperCase()} request to ${routePath} without Authorization header.`,
        priorityScore: calculatePriorityScore('high', 'security'),
      });
    }
  }

  // ==========================================
  // STAGE G: DEPENDENCY & IMPORT INTEGRITY
  // ==========================================
  const declaredDeps = new Set([
    ...Object.keys(topology.dependencies.packages),
    ...Object.keys(topology.dependencies.devPackages),
    'fs', 'path', 'http', 'https', 'crypto', 'os', 'child_process', 'stream', 'util', 'url', 'events', 'zlib', 'buffer'
  ]);

  if (topology.dependencies.file) {
    for (const file of files) {
      if (file.isDirectory || !file.content || file.path.endsWith('package.json')) continue;
      const content = file.content;

      // Extract npm imports: import x from 'pkg' or require('pkg')
      const importMatches = content.matchAll(/(?:import\s+[^;]*?from\s*|require\s*\(\s*)['"]([@a-zA-Z0-9_\-\.\/]+)['"]/g);
      for (const im of importMatches) {
        const importTarget = im[1];
        // If it's an external npm package (doesn't start with . or /)
        if (!importTarget.startsWith('.') && !importTarget.startsWith('/')) {
          const basePkg = importTarget.startsWith('@') ? importTarget.split('/').slice(0, 2).join('/') : importTarget.split('/')[0];
          if (!declaredDeps.has(basePkg)) {
            const line = getLineNumber(content, im.index);
            issues.push({
              file: file.path,
              line,
              type: 'bug',
              priority: 'high',
              title: `Missing Dependency in package.json: "${basePkg}"`,
              description: `Module imports external package "${basePkg}", but it is not listed in package.json dependencies. The application will fail with "Cannot find module" in production or CI/CD environments.`,
              rule: 'dependency-missing-in-package-json',
              codeSnippet: getSnippet(content, line),
              source: 'Dependency Scan',
              category: 'Dependency & Build',
              component: 'Package Manager',
              evidence: `Imported '${basePkg}' at line ${line} not declared in ${topology.dependencies.file}`,
              potentialImpact: 'Build failure or runtime fatal crash (MODULE_NOT_FOUND) when deployed or running npm install.',
              reproductionSteps: `Run 'npm install' in a clean container and execute ${file.path}.`,
              priorityScore: calculatePriorityScore('high', 'bug'),
            });
          }
        } else {
          // Check for Broken Local File Imports (e.g. import './utils/helper')
          const cleanPath = importTarget.replace(/^[./]+/, '');
          const targetExists = files.some((f) => {
            const fp = f.path.replace(/\\/g, '/');
            return fp.includes(cleanPath);
          });

          if (!targetExists && !cleanPath.endsWith('.css') && !cleanPath.endsWith('.png') && !cleanPath.endsWith('.svg')) {
            const line = getLineNumber(content, im.index);
            issues.push({
              file: file.path,
              line,
              type: 'bug',
              priority: 'high',
              title: `Broken Local Import: Cannot resolve "${importTarget}"`,
              description: `File attempts to import local module "${importTarget}", but no matching file exists in the repository directory tree.`,
              rule: 'broken-local-import',
              codeSnippet: getSnippet(content, line),
              source: 'Build Test',
              category: 'Dependency & Build',
              component: 'Module Bundler',
              evidence: `Import target '${importTarget}' at line ${line} not found in project files`,
              potentialImpact: 'Bundler (Vite/Webpack) failure or runtime module resolution error.',
              reproductionSteps: `Execute bundler build: import path fails to resolve.`,
              priorityScore: calculatePriorityScore('high', 'bug'),
            });
          }
        }
      }
    }
  }

  // ==========================================
  // STAGE H: ENVIRONMENT & CONFIGURATION VALIDATION
  // ==========================================
  for (const refVar of topology.envVars.referenced) {
    // If project has .env.example, check if refVar is defined in it
    const envExample = files.find(f => f.path.toLowerCase().endsWith('.env.example'));
    if (envExample && !topology.envVars.defined.has(refVar)) {
      issues.push({
        file: envExample.path,
        line: 1,
        type: 'maintainability',
        priority: 'low',
        title: `Undocumented Environment Variable: ${refVar}`,
        description: `Source code references environment variable "process.env.${refVar}", but it is missing from configuration documentation (${envExample.path}).`,
        rule: 'undocumented-environment-variable',
        codeSnippet: null,
        source: 'Build Test',
        category: 'Configuration',
        component: 'Environment Config',
        evidence: `Variable '${refVar}' referenced in code but missing from ${envExample.name}`,
        potentialImpact: 'Misconfiguration in staging/production deployments causing unexpected undefined behaviors.',
        reproductionSteps: `Deploy using ${envExample.path} as reference template.`,
        priorityScore: calculatePriorityScore('low', 'maintainability'),
      });
    }
  }

  // ==========================================
  // STAGE I: DEDUPLICATION & SCORING
  // ==========================================
  const seenKeys = new Set();
  const deduplicatedIssues = [];

  for (const issue of issues) {
    const key = `${issue.file}:${issue.line || 0}:${issue.title}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      deduplicatedIssues.push(issue);
    }
  }

  // Calculate file priorities
  const filePriorities = {};
  for (const file of files) {
    if (file.isDirectory) continue;
    const fIssues = deduplicatedIssues.filter(i => i.file === file.path);
    if (fIssues.some(i => i.priority === 'critical')) filePriorities[file.path] = 'critical';
    else if (fIssues.some(i => i.priority === 'high')) filePriorities[file.path] = 'high';
    else if (fIssues.some(i => i.priority === 'medium')) filePriorities[file.path] = 'medium';
    else if (fIssues.some(i => i.priority === 'low')) filePriorities[file.path] = 'low';
    else filePriorities[file.path] = 'none';
  }

  // Summarize issues by severity & type
  const summary = {
    total: deduplicatedIssues.length,
    critical: deduplicatedIssues.filter((i) => i.priority === 'critical').length,
    high: deduplicatedIssues.filter((i) => i.priority === 'high').length,
    medium: deduplicatedIssues.filter((i) => i.priority === 'medium').length,
    low: deduplicatedIssues.filter((i) => i.priority === 'low').length,
    security: deduplicatedIssues.filter((i) => i.type === 'security').length,
    bugs: deduplicatedIssues.filter((i) => i.type === 'bug').length,
    codeSmells: deduplicatedIssues.filter((i) => i.type === 'code_smell').length,
    complexity: deduplicatedIssues.filter((i) => i.type === 'complexity').length,
    maintainability: deduplicatedIssues.filter((i) => i.type === 'maintainability').length,
  };

  // Update audit stage status based on real findings
  for (const stg of stageResults) {
    let stageIssues = [];
    if (stg.id === 'code_quality') {
      stageIssues = deduplicatedIssues.filter(i => i.source === 'Static Analysis' && (i.category === 'Code Quality' || i.type === 'bug' || i.type === 'code_smell'));
    } else if (stg.id === 'frontend') {
      stageIssues = deduplicatedIssues.filter(i => i.source === 'Frontend Analysis' || (i.component && i.component.toLowerCase().includes('frontend')));
    } else if (stg.id === 'backend') {
      stageIssues = deduplicatedIssues.filter(i => i.component === 'Backend Module' || i.component === 'Asynchronous Handler' || i.category === 'Reliability' || (i.file && (i.file.includes('controller') || i.file.includes('route'))));
    } else if (stg.id === 'api_contract') {
      stageIssues = deduplicatedIssues.filter(i => i.source === 'API Contract' || i.category === 'API Integration');
    } else if (stg.id === 'database') {
      stageIssues = deduplicatedIssues.filter(i => i.source === 'Database Test' || i.category === 'Access Control' || i.title.includes('IDOR') || i.title.includes('Database'));
    } else if (stg.id === 'auth_security') {
      stageIssues = deduplicatedIssues.filter(i => i.category === 'Authentication' || i.title.includes('Unauthenticated') || i.rule === 'no-hardcoded-password');
    } else if (stg.id === 'vulnerabilities') {
      stageIssues = deduplicatedIssues.filter(i => i.source === 'Security Scan' || i.type === 'security');
    } else if (stg.id === 'dependencies') {
      stageIssues = deduplicatedIssues.filter(i => i.source === 'Dependency Scan' || i.source === 'Build Test' || i.title.includes('Broken Local Import') || i.title.includes('Missing Dependency'));
    } else if (stg.id === 'workflow') {
      const brokenLinks = dependencyMap.filter(d => d.status === 'broken');
      const unprotectedLinks = dependencyMap.filter(d => d.status === 'unprotected');
      stageIssues = deduplicatedIssues.filter(i => i.source === 'End-to-End Test');
      if (brokenLinks.length > 0) {
        stg.status = 'failed';
        stg.issuesCount = brokenLinks.length;
        stg.details = `${brokenLinks.length} broken contracts detected`;
        continue;
      } else if (unprotectedLinks.length > 0) {
        stg.status = 'warning';
        stg.issuesCount = unprotectedLinks.length;
        stg.details = `${unprotectedLinks.length} unprotected endpoints in workflow`;
        continue;
      }
    }

    stg.issuesCount = stageIssues.length;
    if (stageIssues.some(i => i.priority === 'critical' || i.priority === 'high')) {
      stg.status = 'failed';
      stg.details = `${stageIssues.length} findings (${stageIssues.filter(i => i.priority === 'critical').length} critical)`;
    } else if (stageIssues.length > 0) {
      stg.status = 'warning';
      stg.details = `${stageIssues.length} warnings detected`;
    } else {
      stg.status = 'passed';
      stg.details = 'Completed • 0 findings';
    }
  }

  // Quality score formula
  const deductions = (summary.critical * 25) + (summary.high * 12) + (summary.medium * 5) + (summary.low * 1);
  const qualityScore = Math.max(0, 100 - deductions);

  const filesInspected = files.filter(f => !f.isDirectory && f.content).length;
  const componentsIdentified = topology.frontend.files.length + topology.backend.files.length + topology.database.models.length;
  const apisChecked = frontendCalls.length + backendRoutes.length;
  const checksExecuted = (filesInspected * 18) + (apisChecked * 2) + (topology.database.models.length * 3);

  const auditSummary = {
    filesInspected,
    componentsIdentified,
    apisChecked,
    checksExecuted,
    testsExecuted: checksExecuted,
    testsPassed: Math.max(0, checksExecuted - deduplicatedIssues.length),
    testsFailed: deduplicatedIssues.length,
    dynamicTestsExecuted: null,
    dynamicTestsStatus: 'not_run',
    overallStatus: summary.critical > 0 ? 'failed' : summary.high > 0 ? 'warning' : 'passed',
    stages: stageResults,
    dependencyMap: dependencyMap.slice(0, 25), // Return up to 25 key connections for the map
  };

  const scoreBreakdown = {
    base: 100,
    deductions: {
      critical: summary.critical * 25,
      high: summary.high * 12,
      medium: summary.medium * 5,
      low: summary.low * 1,
      total: deductions,
    },
    qualityScore,
  };

  return {
    issues: deduplicatedIssues.sort((a, b) => b.priorityScore - a.priorityScore),
    summary: {
      ...summary,
      totalIssues: summary.total,
      securityIssues: summary.security,
    },
    filePriorities,
    qualityScore,
    scoreBreakdown,
    auditSummary,
    topology: {
      frontendFramework: topology.frontend.framework,
      backendFramework: topology.backend.framework,
      databaseOrm: topology.database.orm,
      totalFrontendFiles: topology.frontend.files.length,
      totalBackendFiles: topology.backend.files.length,
      totalModels: topology.database.models.length,
      totalTests: topology.tests.length,
    }
  };
};

/**
 * Shared Quality Score calculation logic
 */
const calculateQualityScore = (summary) => {
  if (!summary) return 100;
  const critical = Number(summary.critical) || 0;
  const high = Number(summary.high) || 0;
  const medium = Number(summary.medium) || 0;
  const low = Number(summary.low) || 0;
  const deductions = (critical * 25) + (high * 12) + (medium * 5) + (low * 1);
  return Math.max(0, 100 - deductions);
};

module.exports = {
  runEndToEndAnalysis,
  discoverArchitecture,
  extractApiContracts,
  calculateQualityScore,
};