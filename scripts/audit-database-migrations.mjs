import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const migrationsDir = path.join('apps', 'api', 'migrations');
const files = readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .sort();

const failures = [];
const warnings = [];
const tableCreates = [];
const functionCreates = [];
const viewCreates = [];
const policyCreates = [];
const rlsTables = new Set();
const seenVersions = new Map();
let revokesExistingPublicFunctionExecute = false;
let revokesDefaultPublicFunctionExecute = false;

for (const file of files) {
  const version = file.split('_')[0];
  if (seenVersions.has(version)) {
    failures.push(`Duplicate migration version "${version}" in ${seenVersions.get(version)} and ${file}.`);
  }
  seenVersions.set(version, file);

  const sql = readFileSync(path.join(migrationsDir, file), 'utf8');
  const normalized = sql.replace(/\s+/g, ' ').toLowerCase();

  if (/create\s+table\s+(?!if\s+not\s+exists)/i.test(sql)) {
    failures.push(`${file}: CREATE TABLE should use IF NOT EXISTS for clone-safe replays.`);
  }

  if (/create\s+(unique\s+)?index\s+(?!if\s+not\s+exists)/i.test(sql)) {
    failures.push(`${file}: CREATE INDEX should use IF NOT EXISTS for clone-safe replays.`);
  }

  if (
    normalized.includes('revoke execute on function public.rls_auto_enable()') &&
    !normalized.includes("to_regprocedure('public.rls_auto_enable()')")
  ) {
    failures.push(`${file}: rls_auto_enable revoke must be guarded for fresh Supabase projects.`);
  }

  if (/\bgrant\b[\s\S]*\bto\s+(anon|authenticated)\b/i.test(sql)) {
    warnings.push(`${file}: grants to anon/authenticated found; confirm matching RLS policies before exposing Data API.`);
  }

  if (/security\s+definer/i.test(sql) && !/gestisac-allow-security-definer/i.test(sql)) {
    failures.push(
      `${file}: SECURITY DEFINER requires an explicit gestisac-allow-security-definer review marker and non-public exposure plan.`
    );
  }

  for (const match of sql.matchAll(/create\s+(?:or\s+replace\s+)?function\s+([a-z0-9_".]+)\s*\(/gi)) {
    functionCreates.push({ file, name: normalizeQualifiedName(match[1]) });
  }

  for (const match of sql.matchAll(/create\s+(?:or\s+replace\s+)?view\s+([a-z0-9_".]+)[\s\S]*?\bas\s+/gi)) {
    const viewName = normalizeQualifiedName(match[1]);
    viewCreates.push({ file, name: viewName });

    const viewDefinition = match[0].toLowerCase();
    if (!viewDefinition.includes('security_invoker = true') && !viewDefinition.includes('security_invoker=true')) {
      failures.push(`${file}: view ${viewName} must use WITH (security_invoker = true) or stay outside exposed schemas.`);
    }
  }

  for (const match of sql.matchAll(/create\s+policy\s+("[^"]+"|[a-z0-9_]+)\s+on\s+([a-z0-9_".]+)/gi)) {
    policyCreates.push({
      file,
      name: match[1].replace(/"/g, ''),
      table: normalizeQualifiedName(match[2])
    });
  }

  if (/revoke\s+execute\s+on\s+all\s+functions\s+in\s+schema\s+public\s+from\s+public/i.test(sql)) {
    revokesExistingPublicFunctionExecute = true;
  }

  if (/alter\s+default\s+privileges\s+revoke\s+execute\s+on\s+functions\s+from\s+public/i.test(sql)) {
    revokesDefaultPublicFunctionExecute = true;
  }

  for (const match of sql.matchAll(/create\s+table\s+if\s+not\s+exists\s+([a-z0-9_".]+)\s*\(/gi)) {
    tableCreates.push({ file, table: normalizeTableName(match[1]) });
  }

  for (const match of sql.matchAll(/alter\s+table\s+(?:if\s+exists\s+)?([a-z0-9_".]+)\s+enable\s+row\s+level\s+security/gi)) {
    rlsTables.add(normalizeTableName(match[1]));
  }
}

const tablesWithoutExplicitRls = tableCreates
  .filter(({ table }) => !table.startsWith('_') && !rlsTables.has(table))
  .map(({ table }) => table);

if (tablesWithoutExplicitRls.length) {
  warnings.push(
    `${tablesWithoutExplicitRls.length} table(s) are created without explicit RLS in local migrations. ` +
      'This is acceptable only while the browser uses the Rust API exclusively and public Data API grants stay revoked.'
  );
}

if (!revokesExistingPublicFunctionExecute) {
  warnings.push('Existing public functions are not globally revoked from PUBLIC in local migrations.');
}

if (!revokesDefaultPublicFunctionExecute) {
  warnings.push('Future functions are not protected with ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC.');
}

const hardenMigrationIndex = files.indexOf('20260604174426_harden_public_data_api_grants.sql');
const fileObjectsMigrationIndex = files.indexOf('20260604203000_init_persistent_file_objects.sql');
if (fileObjectsMigrationIndex === -1) {
  warnings.push('file_objects migration is missing; document uploads may fall back to non-persistent storage.');
} else if (hardenMigrationIndex === -1 || hardenMigrationIndex > fileObjectsMigrationIndex) {
  warnings.push('file_objects is not preceded by the public Data API grants hardening migration.');
}

const apiBuildScriptPath = path.join('apps', 'api', 'build.rs');
if (!existsSync(apiBuildScriptPath)) {
  failures.push('apps/api/build.rs is missing; sqlx::migrate! may not rebuild the API binary when SQL migrations change.');
} else {
  const apiBuildScript = readFileSync(apiBuildScriptPath, 'utf8');
  if (
    !apiBuildScript.includes('cargo:rerun-if-changed') ||
    !apiBuildScript.includes('migrations') ||
    !apiBuildScript.includes('sql')
  ) {
    failures.push('apps/api/build.rs must emit cargo:rerun-if-changed for SQL migrations embedded by sqlx::migrate!.');
  }
}

console.log(`Audited ${files.length} migration file(s).`);
console.log(`Tables created in migrations: ${tableCreates.length}.`);
console.log(`Tables with explicit RLS in migrations: ${rlsTables.size}.`);
console.log(`Functions created in migrations: ${functionCreates.length}.`);
console.log(`Views created in migrations: ${viewCreates.length}.`);
console.log(`Policies created in migrations: ${policyCreates.length}.`);
console.log(`Existing public function execute revoked: ${revokesExistingPublicFunctionExecute}.`);
console.log(`Default public function execute revoked: ${revokesDefaultPublicFunctionExecute}.`);

if (warnings.length) {
  console.log('\nWarnings:');
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

if (failures.length) {
  console.error('\nFailures:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('\nMigration audit completed without blocking failures.');

function normalizeTableName(value) {
  return normalizeQualifiedName(value);
}

function normalizeQualifiedName(value) {
  return value
    .replace(/"/g, '')
    .split('.')
    .pop()
    .trim()
    .toLowerCase();
}
