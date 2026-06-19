import esbuild from 'esbuild';
import fs from 'node:fs';

const isProd = process.argv.includes('--prod');

fs.rmSync('dist', { recursive: true, force: true });
fs.mkdirSync('dist', { recursive: true });

await esbuild.build({
  entryPoints: ['src/content/index.js'],
  bundle: true,
  format: 'iife',
  target: ['chrome114'],
  outfile: 'dist/content.js',
  sourcemap: !isProd,
  minify: isProd,
  legalComments: 'none',
});

fs.copyFileSync('src/styles/content.css', 'dist/content.css');
fs.copyFileSync('manifest.json', 'dist/manifest.json');