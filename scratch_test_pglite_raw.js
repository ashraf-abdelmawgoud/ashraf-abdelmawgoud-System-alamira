const fs = require('fs');
const { PGlite } = require('@electric-sql/pglite');

async function testPostgresExecution() {
    console.log('--- Testing PostgreSQL Execution of combined_setup.sql ---');
    const db = new PGlite();
    
    // Auth environment
    await db.exec(`
        CREATE SCHEMA IF NOT EXISTS auth;
        CREATE TABLE IF NOT EXISTS auth.users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email TEXT UNIQUE,
            created_at TIMESTAMPTZ DEFAULT now()
        );
        CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
            SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
        $$ LANGUAGE sql STABLE;

        DO $$
        BEGIN
            IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
                CREATE ROLE anon;
            END IF;
            IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
                CREATE ROLE authenticated;
            END IF;
        END
        $$;
    `);

    let sql = fs.readFileSync('supabase/combined_setup.sql', 'utf8').replace(/^\uFEFF/, '');
    
    // Test what fails in the original combined_setup.sql
    try {
        await db.exec(sql);
        console.log('✅ combined_setup.sql executed without errors!');
    } catch (err) {
        console.log('❌ Original combined_setup.sql failed:', err.message);
        console.log('   Code:', err.code, 'Routine:', err.routine);
    }
}

testPostgresExecution();
