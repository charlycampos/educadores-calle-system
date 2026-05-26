const fs = require('fs');
const { execSync } = require('child_process');

const baselinePath = 'D:\\Usuarios\\ccampos\\.gemini\\antigravity-cli\\scratch\\NnaCreatePage_perfect_baseline.tsx';
const outputPath = 'D:\\Usuarios\\ccampos\\Documents\\Python Scripts\\Educadores_calle\\educadores-calle-system\\client\\src\\features\\nna\\NnaCreatePage.tsx';
const clientDir = 'D:\\Usuarios\\ccampos\\Documents\\Python Scripts\\Educadores_calle\\educadores-calle-system\\client';

console.log('Reading baseline file...');
let content = fs.readFileSync(baselinePath, 'utf8');

// Normalize line endings to LF to prevent CR/LF mismatches
content = content.replace(/\r\n/g, '\n');

const fixes = [
    {
        name: 'Fix 1 (Extra closing brace in normalizeCertDiscap)',
        target: `        if (num === '3') return '3. No, no tiene Certificado de Discapacidad.';\n        if (num === '99') return '99. No aplica';\n    }\n    }\n\n    return v;\n};`,
        replacement: `        if (num === '3') return '3. No, no tiene Certificado de Discapacidad.';\n        if (num === '99') return '99. No aplica';\n    }\n\n    return v;\n};`
    },
    {
        name: 'Fix 2 (Duplicate part in guardarLibreEnForm)',
        target: `        const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];\n        const jornadasActivas: DiaActividad[] = [];\n        DIAS.forEach(d => {\n            const j = modalLibreJornadaSemanal[d];\n            if (j?.activo) {\n                jornadasActivas.push({\n                    dia: d,\n                    inicio: j.inicio || '08:00',\n                    fin: j.fin || '12:00',\n                    tieneTurno2: !!j.tieneTurno2,\n                    inicio2: j.tieneTurno2 ? (j.inicio2 || '14:00') : undefined,\n                    fin2: j.tieneTurno2 ? (j.fin2 || '18:00') : undefined\n                });\n            }\n        });\n        \n                jornadasActivas.push({\n                    dia: d,\n                    inicio: j.inicio || '08:00',\n                    fin: j.fin || '12:00',\n                    tieneTurno2: !!j.tieneTurno2,\n                    inicio2: j.tieneTurno2 ? (j.inicio2 || '14:00') : undefined,\n                    fin2: j.tieneTurno2 ? (j.fin2 || '18:00') : undefined\n                });\n            }\n        });`,
        replacement: `        const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];\n        const jornadasActivas: DiaActividad[] = [];\n        DIAS.forEach(d => {\n            const j = modalLibreJornadaSemanal[d];\n            if (j?.activo) {\n                jornadasActivas.push({\n                    dia: d,\n                    inicio: j.inicio || '08:00',\n                    fin: j.fin || '12:00',\n                    tieneTurno2: !!j.tieneTurno2,\n                    inicio2: j.tieneTurno2 ? (j.inicio2 || '14:00') : undefined,\n                    fin2: j.tieneTurno2 ? (j.fin2 || '18:00') : undefined\n                });\n            }\n        });`
    },
    {
        name: 'Fix 3 (Duplicate/cut-off in checkDuplicadoNna)',
        target: `        setNnaBuscando(prev => ({ ...prev, [index]: true }));\n        try {\n            const token = useAuthStore.getState().token || '';\n            const url = \`\${NNA_API_URL}/nna/verificar-duplicados\`;\n\n            const res = await fetch(url, {\n                method: 'POST',\n                headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${token}\` },\n            numero_doc: tieneDni ? doc : null,\n            tipo_doc:   tipoDoc,\n        };\n\n        setNnaBuscando(prev => ({ ...prev, [index]: true }));\n        try {\n            const token = useAuthStore.getState().token || '';\n            const url = \`\${NNA_API_URL}/nna/verificar-duplicados\`;\n\n            const res = await fetch(url, {\n                method: 'POST',\n                headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${token}\` },\n                body: JSON.stringify(payload),\n            });`,
        replacement: `        setNnaBuscando(prev => ({ ...prev, [index]: true }));\n        try {\n            const token = useAuthStore.getState().token || '';\n            const url = \`\${NNA_API_URL}/nna/verificar-duplicados\`;\n\n            const res = await fetch(url, {\n                method: 'POST',\n                headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${token}\` },\n                body: JSON.stringify(payload),\n            });`
    },
    {
        name: 'Fix 4 (Duplicate withBlurCheck)',
        target: `    };\n\n    // Fusiona el onBlur de react-hook-form con nuestra verificación\n    const withBlurCheck = (regResult: any, index: number) => ({\n    };\n\n    // Fusiona el onBlur de react-hook-form con nuestra verificación\n    const withBlurCheck = (regResult: any, index: number) => ({\n        ...regResult,\n        onBlur: (e: any) => {\n            regResult.onBlur?.(e);\n            checkDuplicadoNna(index);\n        },\n    });`,
        replacement: `    };\n\n    // Fusiona el onBlur de react-hook-form con nuestra verificación\n    const withBlurCheck = (regResult: any, index: number) => ({\n        ...regResult,\n        onBlur: (e: any) => {\n            regResult.onBlur?.(e);\n            checkDuplicadoNna(index);\n        },\n    });`
    },
    {
        name: 'Fix 5 (Truncated parentescoVal IIFE)',
        target: `                            if (clean === 'Otro familiar') return '5: Otro familiar';\n                        );`,
        replacement: `                            if (clean === 'Otro familiar') return '5: Otro familiar';\n                            return '';\n                        })();`
    },
    {
        name: 'Fix 6 (Spliced/cut-off primeraJornada block in mapToBackend)',
        target: `        const totalSemanal = actividades.reduce((acc, act) => {\n            let actHours = 0;\n            if (act.jornada) {\n                act.jornada.forEach(j => {\n                    actHours += calcularHorasDia(j.inicio, j.fin);\n                    if (j.tieneTurno2 && j.inicio2 && j.fin2) {\n                        actHours += calcularHorasDia(j.inicio2, j.fin2);\n                    }\n                });\n            }\n            return acc + actHours;\n        }, 0);\n\n            horarioFin = primeraJornada.fin || null;\n            horarioInicio2 = (primeraJornada.tieneTurno2 && primeraJornada.inicio2) ? primeraJornada.inicio2 : null;`,
        replacement: `        const totalSemanal = actividades.reduce((acc, act) => {\n            let actHours = 0;\n            if (act.jornada) {\n                act.jornada.forEach(j => {\n                    actHours += calcularHorasDia(j.inicio, j.fin);\n                    if (j.tieneTurno2 && j.inicio2 && j.fin2) {\n                        actHours += calcularHorasDia(j.inicio2, j.fin2);\n                    }\n                });\n            }\n            return acc + actHours;\n        }, 0);\n\n        let horarioInicio = null;\n        let horarioFin = null;\n        let horarioInicio2 = null;\n        let horarioFin2 = null;\n\n        const primeraJornada = actividades.find(act => act.jornada && act.jornada.length > 0)?.jornada[0];\n        if (primeraJornada) {\n            horarioInicio = primeraJornada.inicio || null;\n            horarioFin = primeraJornada.fin || null;\n            horarioInicio2 = (primeraJornada.tieneTurno2 && primeraJornada.inicio2) ? primeraJornada.inicio2 : null;\n            horarioFin2 = (primeraJornada.tieneTurno2 && primeraJornada.fin2) ? primeraJornada.fin2 : null;\n        }\n\n        // 6. Generar una jornada consolidada aplanada por retrocompatibilidad de datos_f03\n        const jornadaSemanalConsolidada: any = {};\n        DIAS.forEach(d => {\n            const jornadasDia = actividades.flatMap(act => act.jornada || []).filter(j => j.dia === d);\n            if (jornadasDia.length > 0) {\n                const j1 = jornadasDia[0];\n                jornadaSemanalConsolidada[d] = {\n                    activo: true,\n                    inicio: j1.inicio || '08:00',\n                    fin: j1.fin || '12:00',\n                    inicio2: j1.inicio2 || '',\n                    fin2: j1.fin2 || '',\n                    tieneTurno2: !!j1.tieneTurno2\n                };\n            } else {\n                jornadaSemanalConsolidada[d] = {\n                    activo: false,\n                    inicio: '08:00',\n                    fin: '12:00',\n                    inicio2: '',\n                    fin2: '',\n                    tieneTurno2: false\n                };\n            }\n        });`
    },
    {
        name: 'Fix 7 (Duplicate tail of jornadaSemanalConsolidada)',
        target: `            horarioFin2 = (primeraJornada.tieneTurno2 && primeraJornada.fin2) ? primeraJornada.fin2 : null;\n        }\n\n        // 6. Generar una jornada consolidada aplanada por retrocompatibilidad de datos_f03\n        const jornadaSemanalConsolidada: any = {};\n        DIAS.forEach(d => {\n            const jornadasDia = actividades.flatMap(act => act.jornada || []).filter(j => j.dia === d);\n            if (jornadasDia.length > 0) {\n                const j1 = jornadasDia[0];\n                jornadaSemanalConsolidada[d] = {\n                    activo: true,\n                    inicio: j1.inicio || '08:00',\n                    fin: j1.fin || '12:00',\n                    inicio2: j1.inicio2 || '',\n                    fin2: j1.fin2 || '',\n                    tieneTurno2: !!j1.tieneTurno2\n                };\n            } else {\n                jornadaSemanalConsolidada[d] = {\n                    activo: false,\n                    inicio: '08:00',\n                    fin: '12:00',\n                    inicio2: '',\n                    fin2: '',\n                    tieneTurno2: false\n                };\n            }\n        });\n`,
        replacement: ''
    },
    {
        name: 'Fix 8 (Orphan duplicate payload.carpeta_id block)',
        target: `            payload.carpeta_id = id ? parseInt(id, 10) : undefined;\n        }\n\n            payload.carpeta_id = id ? parseInt(id, 10) : undefined;\n        }`,
        replacement: `            payload.carpeta_id = id ? parseInt(id, 10) : undefined;\n        }`
    }
];

for (const fix of fixes) {
    if (content.includes(fix.target)) {
        console.log(`Applying ${fix.name}...`);
        content = content.replace(fix.target, fix.replacement);
    } else {
        console.log(`WARNING: ${fix.name} target NOT found in file!`);
    }
}

// Convert back to CRLF for Windows compatibility
content = content.replace(/\n/g, '\r\n');

fs.writeFileSync(outputPath, content, 'utf8');
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
