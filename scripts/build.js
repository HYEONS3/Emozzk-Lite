import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = new Set(process.argv.slice(2));

const isProd = args.has('--prod');
const isBeta = args.has('--beta');
const shouldCreateZip =
  args.has('--zip') ||
  (isProd && !isBeta);

const DIST_DIR = isBeta ? 'dist-beta' : 'dist';
const PACKAGE_DIR = 'packages';

let crcTable = null;

const CONTENT_ENTRY = 'src/content/index.js';
const CONTENT_OUTFILE = path.join(DIST_DIR, 'content.js');

const INJECT_ENTRY = 'src/inject.js';
const INJECT_OUTFILE = path.join(DIST_DIR, 'inject.js');

const CONTENT_CSS_SOURCE = 'src/styles/content.css';
const CONTENT_CSS_OUTFILE = path.join(DIST_DIR, 'content.css');

const MANIFEST_SOURCE = 'manifest.json';
const MANIFEST_OUTFILE = path.join(DIST_DIR, 'manifest.json');

const POPUP_SOURCE_DIR = path.join('src', 'popup');
const POPUP_ENTRY = path.join(POPUP_SOURCE_DIR, 'popup.js');
const POPUP_OUTFILE = path.join(DIST_DIR, 'popup.js');

const POPUP_STATIC_FILES = [
  'popup.html',
  'popup.css',
];

const ICONS_SOURCE_DIR = 'icons';
const ICONS_OUT_DIR = path.join(DIST_DIR, 'icons');

cleanDist();

await buildContentScript();
await buildInjectScript();
await buildPopupScript();

copyStaticFiles();

const manifest = readDistManifest();

validateDistBuild(manifest);

console.log(`[build] created ${DIST_DIR}`);

if (shouldCreateZip) {
  const zipFile = createWebStoreZip(manifest);
  console.log(`[build] packaged ${zipFile}`);
}

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
  assertSourceFile(CONTENT_ENTRY);

  await esbuild.build({
    entryPoints: [CONTENT_ENTRY],
    bundle: true,
    format: 'iife',
    target: ['chrome114'],
    outfile: CONTENT_OUTFILE,
    sourcemap: !isProd,
    minify: isProd,
    legalComments: 'none',
    charset: 'utf8',
    treeShaking: true,
    drop: isProd ? ['debugger'] : [],
  });
}

async function buildInjectScript() {
  if (!fs.existsSync(INJECT_ENTRY)) {
    fail(`missing inject entry: ${INJECT_ENTRY}`);
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
    charset: 'utf8',
    treeShaking: true,
    drop: isProd ? ['debugger'] : [],
  });
}

async function buildPopupScript() {
  assertSourceFile(POPUP_ENTRY);

  await esbuild.build({
    entryPoints: [POPUP_ENTRY],
    bundle: true,
    format: 'iife',
    target: ['chrome114'],
    outfile: POPUP_OUTFILE,
    sourcemap: !isProd,
    minify: isProd,
    legalComments: 'none',
    charset: 'utf8',
    treeShaking: true,
    drop: isProd ? ['debugger'] : [],
  });
}

function copyStaticFiles() {
  copyFile({
    from: CONTENT_CSS_SOURCE,
    to: CONTENT_CSS_OUTFILE,
    required: true,
  });

  copyManifest();
  copyPopupFiles();
  copyIcons();
}

function copyManifest() {
  assertSourceFile(MANIFEST_SOURCE);

  const manifest = JSON.parse(
    fs.readFileSync(MANIFEST_SOURCE, 'utf8')
  );

  const nextManifest = normalizeManifestForBuild(manifest);

  fs.mkdirSync(path.dirname(MANIFEST_OUTFILE), {
    recursive: true,
  });

  fs.writeFileSync(
    MANIFEST_OUTFILE,
    `${JSON.stringify(nextManifest, null, 2)}\n`,
    'utf8'
  );
}

function normalizeManifestForBuild(manifest) {
  const nextManifest = JSON.parse(JSON.stringify(manifest));

  ensureInjectWebAccessibleResource(nextManifest);

  if (isBeta) {
    nextManifest.name = `${nextManifest.name} Beta`;
    nextManifest.description = `${nextManifest.description} - beta`;
    nextManifest.version_name = `${nextManifest.version}-beta.${getBuildDateStamp()}`;
  } else {
    delete nextManifest.version_name;
  }

  return nextManifest;
}

function ensureInjectWebAccessibleResource(manifest) {
  const resources = Array.isArray(manifest.web_accessible_resources)
    ? manifest.web_accessible_resources
    : [];

  let chzzkResource = resources.find((entry) => {
    return Array.isArray(entry?.matches) &&
      entry.matches.includes('https://chzzk.naver.com/*');
  });

  if (!chzzkResource) {
    chzzkResource = {
      resources: [],
      matches: [
        'https://chzzk.naver.com/*',
      ],
    };

    resources.push(chzzkResource);
  }

  if (!Array.isArray(chzzkResource.resources)) {
    chzzkResource.resources = [];
  }

  if (!chzzkResource.resources.includes('icons/*')) {
    chzzkResource.resources.unshift('icons/*');
  }

  if (!chzzkResource.resources.includes('inject.js')) {
    chzzkResource.resources.push('inject.js');
  }

  manifest.web_accessible_resources = resources;
}

function copyPopupFiles() {
  POPUP_STATIC_FILES.forEach((fileName) => {
    copyFile({
      from: path.join(POPUP_SOURCE_DIR, fileName),
      to: path.join(DIST_DIR, fileName),
      required: true,
    });
  });
}

function copyIcons() {
  if (!fs.existsSync(ICONS_SOURCE_DIR)) {
    fail(`missing icons directory: ${ICONS_SOURCE_DIR}`);
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
        required: true,
      });
    }
  });
}

function copyFile({
  from,
  to,
  required = false,
}) {
  if (!fs.existsSync(from)) {
    if (required) {
      fail(`missing file: ${from}`);
    }

    console.warn(`[build] skipped missing file: ${from}`);
    return;
  }

  fs.mkdirSync(path.dirname(to), {
    recursive: true,
  });

  fs.copyFileSync(from, to);
}

function readDistManifest() {
  assertDistFile('manifest.json');

  return JSON.parse(
    fs.readFileSync(MANIFEST_OUTFILE, 'utf8')
  );
}

function validateDistBuild(manifest) {
  validateManifest(manifest);
  validateManifestReferencedFiles(manifest);
  validateNoProdSourceMaps();
}

function validateManifest(manifest) {
  if (manifest.manifest_version !== 3) {
    fail('manifest_version must be 3');
  }

  if (!manifest.name) {
    fail('manifest.name is required');
  }

  if (!manifest.version) {
    fail('manifest.version is required');
  }

  if (!manifest.description) {
    fail('manifest.description is required');
  }

  if (manifest.description.length > 132) {
    fail(`manifest.description is too long: ${manifest.description.length}/132`);
  }

  if (isProd && isBeta) {
    console.warn('[build] prod beta build uses the same manifest.version. Increase version before uploading to the same Web Store item.');
  }
}

function validateManifestReferencedFiles(manifest) {
  assertDistFile('content.js');
  assertDistFile('content.css');
  assertDistFile('inject.js');
  assertDistFile('popup.js');

  validateContentScripts(manifest);
  validateActionFiles(manifest);
  validateIconFiles(manifest);
  validateWebAccessibleResources(manifest);
}

function validateContentScripts(manifest) {
  const contentScripts = Array.isArray(manifest.content_scripts)
    ? manifest.content_scripts
    : [];

  contentScripts.forEach((script) => {
    const jsFiles = Array.isArray(script.js) ? script.js : [];
    const cssFiles = Array.isArray(script.css) ? script.css : [];

    jsFiles.forEach(assertDistFile);
    cssFiles.forEach(assertDistFile);
  });
}

function validateActionFiles(manifest) {
  const action = manifest.action;

  if (!action) return;

  if (action.default_popup) {
    assertDistFile(action.default_popup);
  }

  collectIconPaths(action.default_icon).forEach(assertDistFile);
}

function validateIconFiles(manifest) {
  collectIconPaths(manifest.icons).forEach(assertDistFile);
}

function validateWebAccessibleResources(manifest) {
  const resources = Array.isArray(manifest.web_accessible_resources)
    ? manifest.web_accessible_resources
    : [];

  resources.forEach((entry) => {
    const files = Array.isArray(entry.resources)
      ? entry.resources
      : [];

    files.forEach((file) => {
      if (file.endsWith('/*')) {
        assertDistDirectory(file.slice(0, -2));
        return;
      }

      assertDistFile(file);
    });
  });
}

function validateNoProdSourceMaps() {
  if (!isProd) return;

  const mapFiles = collectFiles(DIST_DIR)
    .filter((file) => file.relativePath.endsWith('.map'));

  if (mapFiles.length > 0) {
    fail(`prod build contains source maps: ${mapFiles.map((file) => file.relativePath).join(', ')}`);
  }
}

function collectIconPaths(iconField) {
  if (!iconField) return [];

  if (typeof iconField === 'string') {
    return [iconField];
  }

  if (typeof iconField === 'object') {
    return Object.values(iconField)
      .filter((value) => typeof value === 'string');
  }

  return [];
}

function assertSourceFile(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`missing source file: ${filePath}`);
  }
}

function assertDistFile(relativePath) {
  const target = path.join(DIST_DIR, relativePath);

  if (!fs.existsSync(target)) {
    fail(`missing dist file: ${relativePath}`);
  }

  if (!fs.statSync(target).isFile()) {
    fail(`dist path is not a file: ${relativePath}`);
  }
}

function assertDistDirectory(relativePath) {
  const target = path.join(DIST_DIR, relativePath);

  if (!fs.existsSync(target)) {
    fail(`missing dist directory: ${relativePath}`);
  }

  if (!fs.statSync(target).isDirectory()) {
    fail(`dist path is not a directory: ${relativePath}`);
  }

  const files = fs.readdirSync(target);

  if (files.length === 0) {
    fail(`empty dist directory: ${relativePath}`);
  }
}

function createWebStoreZip(manifest) {
  const packageName = isBeta ? 'emozzk-lite-beta' : 'emozzk-lite';
  const versionLabel = sanitizeFileName(
    manifest.version_name || manifest.version || getBuildDateStamp()
  );

  const zipFileName = `${packageName}-${versionLabel}.zip`;
  const zipFile = path.join(PACKAGE_DIR, zipFileName);

  fs.mkdirSync(PACKAGE_DIR, {
    recursive: true,
  });

  fs.rmSync(zipFile, {
    force: true,
  });

  createZipFromDirectory({
    sourceDir: DIST_DIR,
    outFile: zipFile,
  });

  return zipFile;
}

function createZipFromDirectory({
  sourceDir,
  outFile,
}) {
  const files = collectFiles(sourceDir);

  if (files.length === 0) {
    fail(`nothing to package: ${sourceDir}`);
  }

  const localParts = [];
  const centralParts = [];

  let offset = 0;

  files.forEach((file) => {
    const data = fs.readFileSync(file.absolutePath);
    const nameBuffer = Buffer.from(file.relativePath, 'utf8');
    const checksum = crc32(data);
    const { dosTime, dosDate } = getDosDateTime(file.mtime);

    const localHeader = createLocalFileHeader({
      nameBuffer,
      checksum,
      size: data.length,
      dosTime,
      dosDate,
    });

    const centralHeader = createCentralDirectoryHeader({
      nameBuffer,
      checksum,
      size: data.length,
      dosTime,
      dosDate,
      offset,
    });

    localParts.push(localHeader, data);
    centralParts.push(centralHeader);

    offset += localHeader.length + data.length;
  });

  const centralDirectoryOffset = offset;
  const centralDirectory = Buffer.concat(centralParts);
  const endRecord = createEndOfCentralDirectoryRecord({
    entryCount: files.length,
    centralDirectorySize: centralDirectory.length,
    centralDirectoryOffset,
  });

  fs.writeFileSync(
    outFile,
    Buffer.concat([
      ...localParts,
      centralDirectory,
      endRecord,
    ])
  );
}

function collectFiles(sourceDir) {
  const result = [];

  walkDirectory(sourceDir, sourceDir, result);

  return result.sort((a, b) => {
    return a.relativePath.localeCompare(b.relativePath);
  });
}

function walkDirectory(rootDir, currentDir, result) {
  fs.readdirSync(currentDir, {
    withFileTypes: true,
  }).forEach((entry) => {
    const absolutePath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      walkDirectory(rootDir, absolutePath, result);
      return;
    }

    if (!entry.isFile()) return;

    const relativePath = normalizeZipPath(
      path.relative(rootDir, absolutePath)
    );

    if (isProd && relativePath.endsWith('.map')) {
      return;
    }

    const stat = fs.statSync(absolutePath);

    result.push({
      absolutePath,
      relativePath,
      mtime: stat.mtime,
    });
  });
}

function createLocalFileHeader({
  nameBuffer,
  checksum,
  size,
  dosTime,
  dosDate,
}) {
  const header = Buffer.alloc(30 + nameBuffer.length);

  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x0800, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(dosTime, 10);
  header.writeUInt16LE(dosDate, 12);
  header.writeUInt32LE(checksum, 14);
  header.writeUInt32LE(size, 18);
  header.writeUInt32LE(size, 22);
  header.writeUInt16LE(nameBuffer.length, 26);
  header.writeUInt16LE(0, 28);
  nameBuffer.copy(header, 30);

  return header;
}

function createCentralDirectoryHeader({
  nameBuffer,
  checksum,
  size,
  dosTime,
  dosDate,
  offset,
}) {
  const header = Buffer.alloc(46 + nameBuffer.length);

  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0x0800, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(dosTime, 12);
  header.writeUInt16LE(dosDate, 14);
  header.writeUInt32LE(checksum, 16);
  header.writeUInt32LE(size, 20);
  header.writeUInt32LE(size, 24);
  header.writeUInt16LE(nameBuffer.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE((0o100644 << 16) >>> 0, 38);
  header.writeUInt32LE(offset, 42);
  nameBuffer.copy(header, 46);

  return header;
}

function createEndOfCentralDirectoryRecord({
  entryCount,
  centralDirectorySize,
  centralDirectoryOffset,
}) {
  const header = Buffer.alloc(22);

  header.writeUInt32LE(0x06054b50, 0);
  header.writeUInt16LE(0, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(entryCount, 8);
  header.writeUInt16LE(entryCount, 10);
  header.writeUInt32LE(centralDirectorySize, 12);
  header.writeUInt32LE(centralDirectoryOffset, 16);
  header.writeUInt16LE(0, 20);

  return header;
}

function getDosDateTime(date) {
  const year = Math.max(1980, Math.min(2107, date.getFullYear()));
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = Math.floor(date.getSeconds() / 2);

  return {
    dosTime: (hour << 11) | (minute << 5) | second,
    dosDate: ((year - 1980) << 9) | (month << 5) | day,
  };
}


function crc32(buffer) {
  if (!crcTable) {
    crcTable = createCrcTable();
  }

  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function createCrcTable() {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index;

    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1)
        ? 0xedb88320 ^ (value >>> 1)
        : value >>> 1;
    }

    table[index] = value >>> 0;
  }

  return table;
}

function normalizeZipPath(filePath) {
  return filePath.split(path.sep).join('/');
}

function sanitizeFileName(value) {
  return String(value)
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getBuildDateStamp() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const date = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');

  return `${year}${month}${date}-${hour}${minute}`;
}

function fail(message) {
  throw new Error(`[build] ${message}`);
}