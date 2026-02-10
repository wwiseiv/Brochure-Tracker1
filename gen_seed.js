const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const tables = [
    'auto_shops', 'auto_locations', 'auto_ro_sequences', 'auto_users', 'auto_bays',
    'auto_customers', 'auto_vehicles', 'auto_dvi_templates', 'auto_canned_services',
    'auto_canned_service_items', 'auto_repair_orders', 'auto_line_items',
    'auto_appointments', 'auto_payments', 'auto_dvi_inspections', 'auto_dvi_items',
    'auto_activity_log', 'auto_communication_log', 'auto_invitations', 'auto_integration_configs',
  ];

  async function getColumnInfo(table) {
    const res = await client.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns 
      WHERE table_name = $1 
      ORDER BY ordinal_position
    `, [table]);
    return res.rows;
  }

  function formatValue(val, dataType, udtName) {
    if (val === null || val === undefined) return 'NULL';

    // Array types
    if (dataType === 'ARRAY' || udtName.startsWith('_')) {
      if (Array.isArray(val)) {
        if (val.length === 0) return "ARRAY[]::text[]";
        const escaped = val.map(v => "'" + String(v).replace(/'/g, "''") + "'");
        return "ARRAY[" + escaped.join(",") + "]";
      }
      return "ARRAY[]::text[]";
    }

    // JSONB/JSON
    if (udtName === 'jsonb' || udtName === 'json' || dataType === 'jsonb' || dataType === 'json') {
      const jsonStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
      return "'" + jsonStr.replace(/'/g, "''") + "'::jsonb";
    }

    // Boolean
    if (dataType === 'boolean') return val ? 'true' : 'false';

    // Integer types
    if (['integer', 'bigint', 'smallint'].includes(dataType)) return String(val);

    // Numeric types
    if (['numeric', 'real', 'double precision'].includes(dataType)) {
      const s = String(val);
      if (s === 'NaN') return "'NaN'::numeric";
      return "'" + s + "'";
    }

    // Timestamp
    if (dataType.includes('timestamp') || val instanceof Date) {
      const d = val instanceof Date ? val.toISOString().replace('T', ' ').replace('Z', '') : String(val);
      return "'" + d + "'";
    }

    // Date
    if (dataType === 'date') return "'" + String(val) + "'";

    // Text/varchar
    return "'" + String(val).replace(/'/g, "''") + "'";
  }

  let output = [];
  output.push("-- PCB Auto Sample Data Seed");
  output.push("-- Run this AFTER creating tables with: npm run db:push");
  output.push("-- Execute with: psql $DATABASE_URL -f seed-data.sql");
  output.push("-- Or paste into Replit's Database SQL tool");
  output.push("");
  output.push("BEGIN;");
  output.push("");

  for (const table of tables) {
    const colsInfo = await getColumnInfo(table);
    const colNames = colsInfo.map(c => c.column_name);
    const colTypes = {};
    colsInfo.forEach(c => { colTypes[c.column_name] = { dataType: c.data_type, udtName: c.udt_name }; });

    const res = await client.query(`SELECT * FROM ${table} ORDER BY id`);
    const rows = res.rows;
    
    if (rows.length === 0) continue;

    output.push(`-- ${table} (${rows.length} rows)`);

    for (const row of rows) {
      const values = colNames.map(col => {
        const { dataType, udtName } = colTypes[col];
        return formatValue(row[col], dataType, udtName);
      });
      output.push(`INSERT INTO ${table} OVERRIDING SYSTEM VALUE VALUES (${values.join(', ')});`);
    }
    output.push("");
  }

  output.push("-- Reset sequences to continue after the highest ID");
  for (const table of tables) {
    output.push(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 0));`);
  }
  output.push("");
  output.push("COMMIT;");

  const fs = require('fs');
  fs.writeFileSync('/home/runner/workspace/pcb-auto-standalone/seed-data.sql', output.join('\n'));
  console.log(`Generated seed file with ${output.length} lines`);

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
