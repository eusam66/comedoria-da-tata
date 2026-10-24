// Prepara arquivos revisáveis. Não faz commit, push, merge, deploy ou SQL remoto.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const git = (args) => execFileSync('git', args);
const root = git(['rev-parse', '--show-toplevel']).toString().trim();
process.chdir(root);
const base = '86d3a7beeb026ead43481ec9dc52734a93105a13';
assert.equal(
  git(['rev-parse', 'HEAD']).toString().trim(),
  base,
  'HEAD mudou: revisar o baseline antes de preparar a release'
);
assert.equal(
  git(['branch', '--show-current']).toString().trim(),
  'feat/etapa-c-evolucao-comercial'
);
assert.ok(
  git(['remote', 'get-url', 'origin']).toString().trim().endsWith('eusam66/comedoria-da-tata.git')
);
fs.mkdirSync('artifacts', { recursive: true });
const ignored = new Set(['docs/admin-ux-promocoes-pratos.md']);
const migration = 'supabase/migrations/20261024153801_etapa_c_commercial.sql';
const allowed = (p) =>
  !ignored.has(p) &&
  (/^(src\/|scripts\/|docs\/|supabase\/migrations\/|public\/)/.test(p) ||
    ['next.config.js', 'package.json', 'package-lock.json'].includes(p));
const tracked = git(['diff', '--name-only', base]).toString().trim().split('\n').filter(allowed);
const fresh = git(['ls-files', '--others', '--exclude-standard'])
  .toString()
  .trim()
  .split('\n')
  .filter(allowed);
const patch = (files) => {
  const old = files.filter((p) => tracked.includes(p));
  const added = files.filter((p) => fresh.includes(p));
  let output = old.length ? git(['diff', '--binary', base, '--', ...old]).toString() : '';
  for (const file of added) {
    const r = spawnSync('git', ['diff', '--no-index', '--binary', '--', '/dev/null', file], {
      encoding: 'utf8',
    });
    assert.equal(r.status, 1);
    output += r.stdout;
  }
  return output;
};
const all = [...new Set([...tracked, ...fresh])].sort();
// A ponte e o rollback também mantêm as correções de segurança.
const bridgeFiles = [
  'src/lib/storageAdmin.ts',
  'package.json',
  'package-lock.json',
  'public/icons/icon-192.png',
  'public/icons/icon-512.png',
  'public/sw.js',
];
const bridge = patch(bridgeFiles);
const feature = patch(all.filter((p) => !bridgeFiles.includes(p)));
fs.writeFileSync('artifacts/etapa-c-storage-bridge.patch', bridge);
fs.writeFileSync('artifacts/etapa-c-feature.patch', feature);
fs.writeFileSync('artifacts/etapa-c-evolucao-comercial.patch', bridge + feature);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'comedoria-etapa-c-review-'));
const archive = path.join(temp, 'base.tar');
execFileSync('git', ['archive', '--output=' + archive, base]);
execFileSync('tar', ['-xf', archive, '-C', temp]);
fs.unlinkSync(archive);
execFileSync('git', ['apply', path.join(root, 'artifacts/etapa-c-storage-bridge.patch')], {
  cwd: temp,
});
execFileSync('git', ['apply', '--check', path.join(root, 'artifacts/etapa-c-feature.patch')], {
  cwd: temp,
});
// diff reverso por arquivo, sem índice e sem alterar arquivos da branch.
let rollback = '';
for (const file of all.filter((p) => !bridgeFiles.includes(p) && p !== migration)) {
  const original = path.join(temp, file);
  const current = path.join(root, file);
  const r = spawnSync(
    'git',
    [
      'diff',
      '--no-index',
      '--binary',
      '--',
      fs.existsSync(current) ? current : '/dev/null',
      fs.existsSync(original) ? original : '/dev/null',
    ],
    { encoding: 'utf8' }
  );
  assert.ok([0, 1].includes(r.status));
  rollback += r.stdout
    .replaceAll('a' + root + '/', 'a/')
    .replaceAll('b' + temp + '/', 'b/')
    .replaceAll('a' + temp + '/', 'a/')
    .replaceAll('b' + root + '/', 'b/');
}
fs.writeFileSync('artifacts/etapa-c-rollback-to-storage-bridge.patch', rollback);
execFileSync('git', ['apply', path.join(root, 'artifacts/etapa-c-feature.patch')], { cwd: temp });
execFileSync(
  'git',
  ['apply', '--check', path.join(root, 'artifacts/etapa-c-rollback-to-storage-bridge.patch')],
  { cwd: temp }
);
execFileSync(
  'git',
  ['apply', '--reverse', '--whitespace=nowarn', path.join(root, 'artifacts/etapa-c-feature.patch')],
  {
    cwd: temp,
  }
);
const sql = fs.readFileSync(migration, 'utf8'),
  literal = (v) => "'" + v.replaceAll("'", "''") + "'";
fs.writeFileSync(
  'artifacts/etapa-c-expand.sql',
  `-- SOMENTE após autorização e confirmação externa da conexão COMEDORIA DA TATA / kjxivrltvdiswpaxjowa.\nBEGIN;\nSET LOCAL lock_timeout='5s';\nSET LOCAL statement_timeout='60s';\nDO $guard$ BEGIN\n IF EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20261024153801') OR EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='dishes' AND column_name='gallery') THEN RAISE EXCEPTION 'Estado inesperado: interromper e reconciliar histórico/schema'; END IF;\nEND $guard$;\n${sql}\nINSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('20261024153801','etapa_c_commercial',ARRAY[${literal(
    sql
  )}]::text[]);\nCOMMIT;\n`
);
const previousManifest = fs.existsSync('artifacts/etapa-c-release-manifest.json')
  ? JSON.parse(fs.readFileSync('artifacts/etapa-c-release-manifest.json', 'utf8'))
  : {};
let bridgeDirectory = previousManifest.bridgeDirectory || null;
if (
  bridgeDirectory &&
  bridgeFiles.some(
    (file) =>
      !fs.existsSync(path.join(bridgeDirectory, file)) ||
      !fs.readFileSync(path.join(bridgeDirectory, file)).equals(fs.readFileSync(file))
  )
)
  bridgeDirectory = null;
if (process.argv.includes('--prepare-bridge')) {
  bridgeDirectory = temp;
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(temp, 'node_modules'), 'dir');
  if (fs.existsSync('.env.local')) {
    fs.copyFileSync('.env.local', path.join(temp, '.env.local'));
    fs.chmodSync(path.join(temp, '.env.local'), 0o600);
  }
} else fs.rmSync(temp, { recursive: true, force: true });
const hashes = {};
for (const file of all)
  if (fs.existsSync(file))
    hashes[file] = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
for (const file of [
  'etapa-c-storage-bridge.patch',
  'etapa-c-feature.patch',
  'etapa-c-rollback-to-storage-bridge.patch',
  'etapa-c-expand.sql',
])
  hashes['artifacts/' + file] = createHash('sha256')
    .update(fs.readFileSync('artifacts/' + file))
    .digest('hex');
fs.writeFileSync(
  'artifacts/etapa-c-release-manifest.json',
  JSON.stringify(
    {
      base,
      branch: 'feat/etapa-c-evolucao-comercial',
      migration: '20261024153801',
      bridgeDirectory,
      files: all,
      hashes,
      productionWrites: false,
    },
    null,
    2
  )
);
console.log(
  'Artefatos locais preparados; feature aplicada com --check em árvore isolada. Nenhuma publicação.'
);
