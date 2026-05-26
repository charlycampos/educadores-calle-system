const fs = require('fs');
const readline = require('readline');
const path = require('path');

const logsPath = 'D:\\Usuarios\\ccampos\\.gemini\\antigravity-cli\\brain\\1bfa64e4-486d-4ba0-bf78-fc95ba0326b6\\.system_generated\\logs\\transcript_full.jsonl';
const outputPath = 'D:\\Usuarios\\ccampos\\Documents\\Python Scripts\\Educadores_calle\\educadores-calle-system\\recovered_nna_create.tsx';

async function processLineByLine() {
    const fileStream = fs.createReadStream(logsPath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
        try {
            const data = JSON.parse(line);
            const content = data.content || '';
            if (content.includes('Total Lines: 3634') && content.includes('NnaCreatePage.tsx')) {
                fs.writeFileSync(outputPath, content, 'utf8');
                console.log('Found and extracted the view_file block!');
                return;
            }
        } catch (e) {
            // ignore JSON parse errors
        }
    }
    console.log('Not found');
}

processLineByLine();
