const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const bundleDir = path.join(rootDir, 'single_file_bundle');

if (!fs.existsSync(bundleDir)) {
  fs.mkdirSync(bundleDir, { recursive: true });
}

let html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(rootDir, 'styles.css'), 'utf8');
const benchmarks = fs.readFileSync(path.join(rootDir, 'data', 'benchmarks.js'), 'utf8');
const firms = fs.readFileSync(path.join(rootDir, 'data', 'firmsData.js'), 'utf8');
const probEngine = fs.readFileSync(path.join(rootDir, 'engine', 'probabilityEngine.js'), 'utf8');
const clipboard = fs.readFileSync(path.join(rootDir, 'engine', 'clipboardAndEvaluator.js'), 'utf8');
const app = fs.readFileSync(path.join(rootDir, 'app.js'), 'utf8');

// Inline CSS
html = html.replace('<link rel="stylesheet" href="styles.css">', '<style>\n' + css + '\n</style>');

// Inline all JavaScript data and engines
const scriptBundle = [
  '<script>',
  benchmarks,
  '</script>',
  '<script>',
  firms,
  '</script>',
  '<script>',
  probEngine,
  '</script>',
  '<script>',
  clipboard,
  '</script>',
  '<script>',
  app,
  '</script>'
].join('\n');

html = html.replace(/<script src="data\/benchmarks\.js"><\/script>[\s\S]*?<script src="app\.js"><\/script>/, scriptBundle);

const bundleHtmlPath = path.join(bundleDir, 'prop_terminal_standalone.html');
fs.writeFileSync(bundleHtmlPath, html, 'utf8');

const readmeContent = `# Standalone Single-File Terminal

This folder contains \`prop_terminal_standalone.html\`.

- **100% Self-Contained:** All CSS styling, rule datasets, probability engine, and UI scripts are bundled into this single HTML file.
- **Zero Dependencies:** No local web server, no Python, no Node.js required.
- **Easy Sharing:** You can email or send just this single \`.html\` file via WhatsApp, Telegram, or Discord. Anyone can simply double-click it to open and run the complete terminal offline in any browser (Chrome, Edge, Safari, Firefox).
`;
fs.writeFileSync(path.join(bundleDir, 'README.md'), readmeContent, 'utf8');

console.log('Successfully generated standalone bundle in folder: single_file_bundle/');
console.log('File:', bundleHtmlPath, 'Size:', (fs.statSync(bundleHtmlPath).size / 1024).toFixed(1), 'KB');
