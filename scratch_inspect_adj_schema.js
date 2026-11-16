const fs = require('fs');

const schema = fs.readFileSync('supabase/schema.sql', 'utf8');

// Find inventory_adjustments and inventory_adjustment_items definitions
const adjIdx = schema.indexOf('inventory_adjustments');
console.log('--- schema.sql: inventory_adjustments & items ---');
console.log(schema.substring(adjIdx, adjIdx + 2000));
