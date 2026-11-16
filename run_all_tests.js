const { execSync } = require('child_process');

const tests = [
  'test_customers_suppliers_ui.js',
  'test_decimal_and_print.js',
  'test_final_production_ui_polish.js',
  'test_login_simplification_and_icons.js',
  'test_official_logo_integration.js',
  'test_phase5_polish_settings_mobile.js',
  'test_premium_emerald_sidebar.js',
  'test_product_lifecycle.js',
  'test_reports_print_excel.js',
  'test_sales_invoices_ui.js',
  'test_scenario.js',
  'test_simplified_product_registration.js',
  'test_ui_redesign.js',
  'test_real_postgresql_integration.js',
  'test_audit_critical_remediation.js',
  'test_pglite_migrations_validation.js'
];

let allPassed = true;
const results = [];

for (const test of tests) {
  process.stdout.write(`Running ${test}... `);
  try {
    const output = execSync(`node ${test}`, { stdio: 'pipe' }).toString();
    console.log('✅ PASSED');
    results.push({ test, passed: true });
  } catch (err) {
    console.log('❌ FAILED');
    console.error(err.stdout ? err.stdout.toString() : err.message);
    results.push({ test, passed: false, error: err.message });
    allPassed = false;
  }
}

console.log('\n=======================================');
console.log(`Summary: ${results.filter(r => r.passed).length}/${results.length} tests passed.`);
console.log('=======================================');

if (!allPassed) {
  process.exit(1);
}
