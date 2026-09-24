const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'src');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const files = walk(src);
const failures = [];
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: file,
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics || []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
  if (errors.length) {
    failures.push(`${path.relative(root, file)}: ${errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, ' ')).join(' | ')}`);
  }
}

try {
  const appJson = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
  if (!appJson.expo?.extra?.cloudinary?.cloudName) failures.push('app.json: cloudinary.cloudName');
  if (!appJson.expo?.extra?.cloudinary?.uploadPresets?.image) failures.push('app.json: cloudinary.uploadPresets.image');
  if (!appJson.expo?.extra?.cloudinary?.uploadPresets?.video) failures.push('app.json: cloudinary.uploadPresets.video');
} catch (error) {
  failures.push(`app.json: ${error instanceof Error ? error.message : String(error)}`);
}

if (failures.length) {
  console.error('Phase 2 static check FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Phase 2 static check OK: ${files.length} TS/TSX files transpiled.`);
