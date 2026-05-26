const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const scratchDir = 'D:\\Usuarios\\ccampos\\.gemini\\antigravity-cli\\scratch';
const activeFile = 'D:\\Usuarios\\ccampos\\Documents\\Python Scripts\\Educadores_calle\\educadores-calle-system\\client\\src\\features\\nna\\NnaCreatePage.tsx';
const clientDir = 'D:\\Usuarios\\ccampos\\Documents\\Python Scripts\\Educadores_calle\\educadores-calle-system\\client';

const files = fs.readdirSync(scratchDir).filter(f => f.startsWith('NnaCreatePage_') && f.endsWith('.tsx'));

console.log(`Found ${files.length} baseline files:`);
for (const file of files) {
    const filePath = path.join(scratchDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    console.log(`- ${file}: ${lines.length} lines, ${fs.statSync(filePath).size} bytes`);
}

console.log('\nTesting each file against tsc -p tsconfig.app.json...');
for (const file of files) {
    const filePath = path.join(scratchDir, file);
    console.log(`\n========================================`);
    console.log(`Testing ${file}...`);
    
    // Copy file
    fs.copyFileSync(filePath, activeFile);
    
    try {
        console.log(`Running tsc...`);
        execSync('npx tsc -p tsconfig.app.json --noEmit', { cwd: clientDir, stdio: 'pipe' });
        console.log(`SUCCESS! ${file} compiled with 0 errors!`);
    } catch (err) {
        const stderr = err.stderr ? err.stderr.toString() : '';
        const stdout = err.stdout ? err.stdout.toString() : '';
        const combined = stdout + '\n' + stderr;
        const errorLines = combined.split('\n').filter(l => l.includes('NnaCreatePage.tsx'));
        console.log(`FAILED with ${errorLines.length} errors.`);
        if (errorLines.length > 0) {
            console.log(`First 10 errors:`);
            errorLines.slice(0, 10).forEach(l => console.log('  ' + l.trim()));
        } else {
            console.log(`No direct errors in NnaCreatePage.tsx, but build failed. Other files or general errors:`);
            combined.split('\n').slice(0, 10).forEach(l => console.log('  ' + l.trim()));
        }
    }
}
