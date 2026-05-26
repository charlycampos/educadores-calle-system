const fs = require('fs');
const { execSync } = require('child_process');

const baselinePath = 'D:\\Usuarios\\ccampos\\.gemini\\antigravity-cli\\scratch\\NnaCreatePage_perfect_baseline.tsx';
const outputPath = 'D:\\Usuarios\\ccampos\\Documents\\Python Scripts\\Educadores_calle\\educadores-calle-system\\client\\src\\features\\nna\\NnaCreatePage.tsx';
const clientDir = 'D:\\Usuarios\\ccampos\\Documents\\Python Scripts\\Educadores_calle\\educadores-calle-system\\client';

console.log('Reading baseline file...');
let lines = fs.readFileSync(baselinePath, 'utf8').split('\n');
console.log(`Original lines count: ${lines.length}`);

// Fix 1: Remove line 340 (which is index 339, 0-indexed)
// Let's verify line content
console.log(`Line 340 content: "${lines[339]}"`);
console.log(`Line 341 content: "${lines[340]}"`);
if (lines[339].trim() === '}' && lines[340].trim() === '}') {
    console.log('Applying Fix 1: Removing extra closing brace at line 340...');
    lines.splice(339, 1);
}

// Fix 2: Remove duplicated lines 545 to 554 (indices 544 to 553 after Fix 1, but let's re-verify)
// Since we spliced 1 line, original line 545 is now line 544.
// Let's print lines around 544 to be safe
console.log('Lines around 544:');
for (let i = 540; i < 560; i++) {
    console.log(`  ${i+1}: ${lines[i]}`);
}

// Let's find the duplicate pattern:
// 545:                 jornadasActivas.push({
// 546:                     dia: d,
// 547:                     inicio: j.inicio || '08:00',
// 548:                     fin: j.fin || '12:00',
// 549:                     tieneTurno2: !!j.tieneTurno2,
// 550:                     inicio2: j.tieneTurno2 ? (j.inicio2 || '14:00') : undefined,
// 551:                     fin2: j.tieneTurno2 ? (j.fin2 || '18:00') : undefined
// 552:                 });
// 553:             }
// 554:         });
let duplicateIndex = -1;
for (let i = 500; i < 600; i++) {
    if (lines[i].includes('jornadasActivas.push({') && lines[i-1].trim() === '') {
        // This is the duplicate block starting after empty line 544 (original)
        // Since we removed line 340, original 544 is index 543.
        if (i === 543) {
            duplicateIndex = i;
            break;
        }
    }
}
if (duplicateIndex !== -1) {
    console.log(`Applying Fix 2: Removing 10 duplicate lines starting at index ${duplicateIndex}...`);
    lines.splice(duplicateIndex, 10);
}

// Fix 3: Remove duplicate checkDuplicadoNna head at lines 932 to 943 (original line numbers)
// Let's find the exact indices by scanning
console.log('Scanning for checkDuplicadoNna duplicate...');
let dupCheckIndex = -1;
for (let i = 850; i < 950; i++) {
    if (lines[i].includes('setNnaBuscando(prev => ({ ...prev, [index]: true }));') &&
        lines[i+1].includes('try {') &&
        lines[i+5].includes('headers: { \'Content-Type\': \'application/json\', Authorization: `Bearer ${token}` },') &&
        lines[i+6].includes('numero_doc: tieneDni ? doc : null,')) {
        dupCheckIndex = i;
        break;
    }
}
if (dupCheckIndex !== -1) {
    console.log(`Applying Fix 3: Removing 12 duplicate/cut-off lines starting at index ${dupCheckIndex}...`);
    lines.splice(dupCheckIndex, 12);
}

// Fix 4: Remove duplicate withBlurCheck at lines 996 to 1001 (original line numbers)
console.log('Scanning for withBlurCheck duplicate...');
let dupBlurIndex = -1;
for (let i = 900; i < 1000; i++) {
    if (lines[i].trim() === '};' &&
        lines[i+2].includes('// Fusiona el onBlur de react-hook-form con nuestra') &&
        lines[i+3].includes('const withBlurCheck = (regResult: any, index: number) => ({') &&
        lines[i+4].trim() === '};') {
        dupBlurIndex = i;
        break;
    }
}
if (dupBlurIndex !== -1) {
    console.log(`Applying Fix 4: Removing 6 duplicate lines starting at index ${dupBlurIndex}...`);
    lines.splice(dupBlurIndex, 6);
}

// Fix 5: Fix parentescoVal truncation at line 1321 (original line numbers)
console.log('Scanning for parentescoVal truncation...');
let parentescoIndex = -1;
for (let i = 1200; i < 1400; i++) {
    if (lines[i].includes("if (clean === 'Otro familiar') return '5: Otro familiar';") &&
        lines[i+1].trim() === ');') {
        parentescoIndex = i + 1;
        break;
    }
}
if (parentescoIndex !== -1) {
    console.log(`Applying Fix 5: Replacing index ${parentescoIndex} with proper IIFE closing...`);
    lines[parentescoIndex] = '                            return \'\';\n                        })();';
}

console.log(`Fixed lines count: ${lines.length}`);
fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
console.log(`Saved fixed file to: ${outputPath}`);

console.log('Running direct tsc verification...');
try {
    execSync('npx tsc -p tsconfig.app.json --noEmit', { cwd: clientDir, stdio: 'pipe' });
    console.log('CONGRATULATIONS! FIXED BASELINE COMPILED WITH ZERO ERRORS!');
} catch (err) {
    const stderr = err.stderr ? err.stderr.toString() : '';
    const stdout = err.stdout ? err.stdout.toString() : '';
    const combined = stdout + '\n' + stderr;
    const errorLines = combined.split('\n').filter(l => l.includes('NnaCreatePage.tsx'));
    console.log(`FAILED with ${errorLines.length} errors.`);
    errorLines.slice(0, 30).forEach(l => console.log('  ' + l.trim()));
}
