import fs from 'fs';
import { execSync } from 'child_process';
try {
    const sql = fs.readFileSync('test_geo.sql', 'utf8');
    const out = execSync(`docker exec -i supabase_db_Zone-Conqueror psql -U postgres -d postgres`, { input: sql, encoding: 'utf8' });
    fs.writeFileSync('stdout.txt', out);
} catch (e) {
    fs.writeFileSync('stdout.txt', "STDOUT: " + e.stdout + "\nSTDERR: " + e.stderr);
}
