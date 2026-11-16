const fs = require('fs');
const { PGlite } = require('@electric-sql/pglite');

async function testStatements() {
  const db = new PGlite();
  const sql = fs.readFileSync('supabase/migration_decimal_quantities.sql', 'utf8');

  // Let's see what is around pos 4132
  console.log('Pos 4132 context:');
  console.log(sql.substring(4100, 4200));

  // Split by statements or test executing slices
  try {
    await db.exec(sql.substring(0, 4100));
    console.log('Slice 0 to 4100 executed successfully!');
  } catch (e) {
    console.error('Slice 0 to 4100 failed:', e.message);
  }

  try {
    await db.exec(sql.substring(4100, 4500));
    console.log('Slice 4100 to 4500 executed successfully!');
  } catch (e) {
    console.error('Slice 4100 to 4500 failed:', e.message);
  }
}

testStatements();
