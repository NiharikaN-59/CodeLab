/**
 * Language detection utility based on file extension and content patterns
 */
const EXTENSION_MAP = {
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  h: 'c',
  hpp: 'cpp',
  cs: 'csharp',
  go: 'go',
  rb: 'ruby',
  php: 'php',
  rs: 'rust',
  swift: 'swift',
  kt: 'kotlin',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'sass',
  less: 'less',
  json: 'json',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
  md: 'markdown',
  sh: 'bash',
  bash: 'bash',
  sql: 'sql',
  r: 'r',
  dart: 'dart',
  vue: 'vue',
  svelte: 'svelte',
  txt: 'plaintext',
};

const UNSAFE_EXTENSIONS = [
  'exe', 'dll', 'bat', 'cmd', 'ps1', 'vbs', 'reg', 'msi',
  'bin', 'com', 'scr', 'pif', 'jar', 'app', 'dmg', 'pkg',
];

const detectLanguage = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  return EXTENSION_MAP[ext] || 'plaintext';
};

const isUnsafeFile = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  return UNSAFE_EXTENSIONS.includes(ext);
};

const isSafeToUpload = (filename) => !isUnsafeFile(filename);

module.exports = { detectLanguage, isUnsafeFile, isSafeToUpload, EXTENSION_MAP };
