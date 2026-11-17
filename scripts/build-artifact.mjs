// Builds the app and inlines JS + CSS into one HTML page that can be published as a claude.ai Artifact.
// Usage: npm run build:artifact  ->  artifact/paddock-press.html
import { build } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

const outDir = 'dist-artifact';
await build({ base: './', build: { outDir, emptyOutDir: true, assetsInlineLimit: 100000000, cssCodeSplit: false }, logLevel: 'warn' });

const html = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
const js = html.match(/<script type="module" crossorigin src="\.\/(assets\/[^"]+\.js)"><\/script>/);
const css = html.match(/<link rel="stylesheet" crossorigin href="\.\/(assets\/[^"]+\.css)">/);
if (!js) throw new Error('script tag not found');
const code = fs.readFileSync(path.join(outDir, js[1]), 'utf8').replace(/<\/script/gi, '<\\/script');
const style = css ? fs.readFileSync(path.join(outDir, css[1]), 'utf8') : '';
const fonts = html.match(/<link\s+href="https:\/\/fonts\.googleapis\.com[^"]+"\s+rel="stylesheet"\s*\/?>/)?.[0] || '';

// The Artifact publisher wraps the page in its own doctype/head/body skeleton.
const page = `<title>Paddock Press</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${fonts}
<style>
${style}
</style>
<div id="root"></div>
<script type="module">
${code}
</script>
`;
fs.mkdirSync('artifact', { recursive: true });
fs.writeFileSync('artifact/paddock-press.html', page);
console.log('artifact/paddock-press.html', (page.length / 1024).toFixed(0) + ' KB');
