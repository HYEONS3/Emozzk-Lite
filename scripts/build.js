import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const isProd = process.argv.includes('--prod');

const DIST_DIR = 'dist';

const CONTENT_ENTRY = 'src/content/index.js';
const CONTENT_OUTFILE = path.join(DIST_DIR, 'content.js');

const INJECT_ENTRY = 'src/inject.js';
const INJECT_OUTFILE = path.join(DIST_DIR, 'inject.js');

const CONTENT_CSS_SOURCE = 'src/styles/content.css';
const CONTENT_CSS_OUTFILE = path.join(DIST_DIR, 'content.css');

const MANIFEST_SOURCE = 'manifest.json';
const MANIFEST_OUTFILE = path.join(DIST_DIR, 'manifest.json');

const POPUP_SOURCE_DIR = path.join('src', 'popup');
const POPUP_FILES = [
  'popup.html',
  'popup.css',
  'popup.js',
];

const ICONS_SOURCE_DIR = 'icons';
const ICONS_OUT_DIR = path.join(DIST_DIR, 'icons');

cleanDist();
await buildContentScript();
await buildInjectScript();
copyStaticFiles();

function cleanDist() {
  fs.rmSync(DIST_DIR, {
    recursive: true,
    force: true,
  });

  fs.mkdirSync(DIST_DIR, {
    recursive: true,
  });
}

async function buildContentScript() {
  await esbuild.build({
    entryPoints: [CONTENT_ENTRY],
    bundle: true,
    format: 'iife',
    target: ['chrome114'],
    outfile: CONTENT_OUTFILE,
    sourcemap: !isProd,
    minify: isProd,
    legalComments: 'none',
  });
}

async function buildInjectScript() {
  if (!fs.existsSync(INJECT_ENTRY)) {
    console.warn(`[build] skipped missing inject entry: ${INJECT_ENTRY}`);
    return;
  }

  await esbuild.build({
    entryPoints: [INJECT_ENTRY],
    bundle: true,
    format: 'iife',
    target: ['chrome114'],
    outfile: INJECT_OUTFILE,
    sourcemap: !isProd,
    minify: isProd,
    legalComments: 'none',
  });
}

function copyStaticFiles() {
  copyFile({
    from: CONTENT_CSS_SOURCE,
    to: CONTENT_CSS_OUTFILE,
  });

  copyFile({
    from: MANIFEST_SOURCE,
    to: MANIFEST_OUTFILE,
  });

  copyPopupFiles();
  copyIcons();
}

function copyPopupFiles() {
  POPUP_FILES.forEach((fileName) => {
    const source = path.join(POPUP_SOURCE_DIR, fileName);

    if (!fs.existsSync(source)) {
      console.warn(`[build] skipped missing popup file: ${source}`);
      return;
    }

    copyFile({
      from: source,
      to: path.join(DIST_DIR, fileName),
    });
  });
}

function copyIcons() {
  if (!fs.existsSync(ICONS_SOURCE_DIR)) {
    console.warn(`[build] skipped missing icons directory: ${ICONS_SOURCE_DIR}`);
    return;
  }

  copyDirectory({
    from: ICONS_SOURCE_DIR,
    to: ICONS_OUT_DIR,
  });
}

function copyDirectory({
  from,
  to,
}) {
  fs.mkdirSync(to, {
    recursive: true,
  });

  fs.readdirSync(from, {
    withFileTypes: true,
  }).forEach((entry) => {
    const sourcePath = path.join(from, entry.name);
    const targetPath = path.join(to, entry.name);

    if (entry.isDirectory()) {
      copyDirectory({
        from: sourcePath,
        to: targetPath,
      });

      return;
    }

    if (entry.isFile()) {
      copyFile({
        from: sourcePath,
        to: targetPath,
      });
    }
  });
}

function copyFile({
  from,
  to,
}) {
  fs.mkdirSync(path.dirname(to), {
    recursive: true,
  });

  fs.copyFileSync(from, to);
}