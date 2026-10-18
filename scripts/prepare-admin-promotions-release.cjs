// Gera artefatos revisáveis; NÃO conecta ao banco, faz commit ou publica.
const fs = require('node:fs');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const BASE = '8e5ef5430be8658d6852cf1c98832a9fbaea7ea9';
const versions = ['20261018153509', '20261018163002'];
const dir = 'supabase/migrations';
fs.mkdirSync('artifacts', { recursive: true });
const files = versions.map(version => {
  const names = fs.readdirSync(dir).filter(name => name.startsWith(version + '_'));
  assert.equal(names.length, 1); return `${dir}/${names[0]}`;
});
let sql = `-- EXCLUSIVO Comedoria da Tata. Gerado a partir das migrations versionadas.\n-- Revisar target kjxivrltvdiswpaxjowa antes de qualquer execução autorizada.\n-- Nunca executar apenas a primeira migration. As duas entram no MESMO COMMIT.\nbegin;\nset local lock_timeout = '5s';\nset local statement_timeout = '60s';\nselect pg_advisory_xact_lock(hashtext('comedoria_admin_promotions_expand'));\ndo $$ begin\n  if exists(select 1 from supabase_migrations.schema_migrations where version in ('${versions.join("','")}'))\n    or exists(select 1 from information_schema.columns where table_schema='public' and table_name='dishes' and column_name='promo_active') then\n    raise exception 'EXPAND_PREFLIGHT_MISMATCH';\n  end if;\nend $$;\n`;
files.forEach((file, index) => {
  const body = fs.readFileSync(file, 'utf8');
  const hash = crypto.createHash('sha256').update(body).digest('hex');
  const name = file.split('/').at(-1).replace(/^\d+_/, '').replace(/\.sql$/, '');
  sql += `\n-- SOURCE ${file} SHA256 ${hash}\n${body}\n`;
  // O mesmo registro de histórico que uma aplicação normal, dentro da transação.
  sql += `insert into supabase_migrations.schema_migrations(version,name,statements) values ('${versions[index]}','${name}',array[$migration_source$${body}$migration_source$]);\n`;
});
sql += "\ndo $$ begin\n  if to_regprocedure('public.create_order_with_stock_v2(uuid,text,jsonb,jsonb)') is null then raise exception 'EXPAND_INCOMPLETE'; end if;\nend $$;\nnotify pgrst, 'reload schema';\ncommit;\n";
fs.writeFileSync('artifacts/admin-promotions-expand.sql', sql);
let patch = '';
for (const file of ['src/lib/orderRoute.ts', 'src/app/api/orders/v2/route.ts']) {
  const result = cp.spawnSync('git', ['diff', '--no-index', '--', '/dev/null', file], { encoding: 'utf8' });
  assert.equal(result.status, 1); patch += result.stdout;
}
fs.writeFileSync('artifacts/admin-promotions-bridge.patch', patch);
fs.writeFileSync('artifacts/admin-promotions-release-manifest.json', JSON.stringify({ base: BASE, migrations: files,
  bridgeFiles: ['src/lib/orderRoute.ts', 'src/app/api/orders/v2/route.ts'],
  unchangedLegacyRouteSha256: crypto.createHash('sha256').update(cp.execFileSync('git', ['show', `${BASE}:src/app/api/orders/route.ts`])).digest('hex'),
  productionExecuted: false }, null, 2));
console.log('Gerados SQL atômico e patch da ponte para a main de referência; nenhuma publicação executada.');
