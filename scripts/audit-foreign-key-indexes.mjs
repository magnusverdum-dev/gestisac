import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const args = parseArgs(process.argv.slice(2));
const migrationsDir = path.join('apps', 'api', 'migrations');
const sql = readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .sort()
  .map((file) => readFileSync(path.join(migrationsDir, file), 'utf8'))
  .join('\n');

const tables = parseTables(sql);
const foreignKeys = parseForeignKeys(tables, sql);
const indexes = parseIndexes(tables, sql);
const missing = foreignKeys.filter(
  (foreignKey) =>
    !indexes.some((index) => index.table === foreignKey.table && index.firstColumn === foreignKey.column)
);

if (args.json) {
  console.log(
    JSON.stringify(
      {
        foreignKeys: foreignKeys.length,
        indexes: indexes.length,
        missing: missing.length,
        missingIndexes: missing
      },
      null,
      2
    )
  );
} else {
  console.log(`Foreign keys found: ${foreignKeys.length}.`);
  console.log(`Indexes found: ${indexes.length}.`);
  console.log(`Foreign keys without leading-column index: ${missing.length}.`);

  if (missing.length) {
    console.log('\nMissing leading-column FK indexes:');
    for (const item of missing) {
      console.log(`- ${item.table}.${item.column} -> ${item.referencesTable}`);
    }
  }
}

if (args.strict && missing.length) {
  process.exit(1);
}

function parseTables(contents) {
  const parsed = [];
  for (const match of contents.matchAll(
    /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+([a-z0-9_".]+)\s*\(([\s\S]*?)\);/gi
  )) {
    parsed.push({
      table: normalizeIdentifier(match[1]),
      body: match[2]
    });
  }

  return parsed;
}

function parseForeignKeys(tableDefinitions, contents) {
  const foreignKeys = [];

  for (const { table, body } of tableDefinitions) {
    for (const line of splitSqlList(body)) {
      const inline = line.match(/^"?([a-z0-9_]+)"?\s+[^,]*?\bREFERENCES\s+([a-z0-9_".]+)\s*\(/i);
      if (inline) {
        foreignKeys.push({
          table,
          column: normalizeIdentifier(inline[1]),
          referencesTable: normalizeIdentifier(inline[2])
        });
      }

      const tableConstraint = line.match(
        /FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+([a-z0-9_".]+)\s*\(/i
      );
      if (tableConstraint) {
        for (const column of splitColumns(tableConstraint[1])) {
          foreignKeys.push({
            table,
            column,
            referencesTable: normalizeIdentifier(tableConstraint[2])
          });
        }
      }
    }
  }

  for (const match of contents.matchAll(
    /ALTER\s+TABLE\s+([a-z0-9_".]+)\s+ADD\s+CONSTRAINT\s+[a-z0-9_".]+\s+FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+([a-z0-9_".]+)\s*\(/gi
  )) {
    const table = normalizeIdentifier(match[1]);
    for (const column of splitColumns(match[2])) {
      foreignKeys.push({
        table,
        column,
        referencesTable: normalizeIdentifier(match[3])
      });
    }
  }

  return uniqueBy(foreignKeys, (item) => `${item.table}.${item.column}.${item.referencesTable}`);
}

function parseIndexes(tableDefinitions, contents) {
  const indexes = [];

  for (const match of contents.matchAll(
    /CREATE\s+(?:UNIQUE\s+)?INDEX\s+IF\s+NOT\s+EXISTS\s+([a-z0-9_".]+)\s+ON\s+([a-z0-9_".]+)\s*\(([^)]+)\)/gi
  )) {
    indexes.push({
      name: normalizeIdentifier(match[1]),
      table: normalizeIdentifier(match[2]),
      firstColumn: splitColumns(match[3])[0]
    });
  }

  for (const { table, body } of tableDefinitions) {
    for (const match of body.matchAll(/PRIMARY\s+KEY\s*\(([^)]+)\)/gi)) {
      indexes.push({
        name: `${table}_pkey`,
        table,
        firstColumn: splitColumns(match[1])[0]
      });
    }

    for (const line of splitSqlList(body)) {
      const inlinePrimaryKey = line.match(/^"?([a-z0-9_]+)"?\s+[^,]*PRIMARY\s+KEY/i);
      if (inlinePrimaryKey) {
        indexes.push({
          name: `${table}_pkey`,
          table,
          firstColumn: normalizeIdentifier(inlinePrimaryKey[1])
        });
      }
    }
  }

  return uniqueBy(indexes, (item) => `${item.table}.${item.firstColumn}.${item.name}`);
}

function splitSqlList(body) {
  return body
    .split(/,\s*\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function splitColumns(value) {
  return value
    .split(',')
    .map((column) => normalizeIdentifier(column.replace(/\s+(ASC|DESC).*$/i, '')))
    .filter(Boolean);
}

function normalizeIdentifier(value) {
  return value.replace(/"/g, '').split('.').pop().trim().toLowerCase();
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }
  return result;
}

function parseArgs(items) {
  return {
    json: items.includes('--json'),
    strict: items.includes('--strict')
  };
}
