const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
let html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(rootDir, 'styles.css'), 'utf8');
const benchmarks = fs.readFileSync(path.join(rootDir, 'data', 'benchmarks.js'), 'utf8');
const firms = fs.readFileSync(path.join(rootDir, 'data', 'firmsData.js'), 'utf8');
const probEngine = fs.readFileSync(path.join(rootDir, 'engine', 'probabilityEngine.js'), 'utf8');
const clipboard = fs.readFileSync(path.join(rootDir, 'engine', 'clipboardAndEvaluator.js'), 'utf8');
const app = fs.readFileSync(path.join(rootDir, 'app.js'), 'utf8');

// Replace stylesheet link with inline <style>
html = html.replace('<link rel="stylesheet" href="styles.css">', '<style>\n' + css + '\n</style>');

// Replace external script tags with inlined scripts
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

const outputPath = path.join(rootDir, 'prop_terminal_standalone.html');
fs.writeFileSync(outputPath, html, 'utf8');

console.log('Standalone single-file terminal generated successfully!');
console.log('File path:', outputPath);
console.log('File size:', (fs.statSync(outputPath).size / 1024).toFixed(1), 'KB');
