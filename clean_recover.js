const fs = require('fs');
const path = 'D:\\Usuarios\\ccampos\\Documents\\Python Scripts\\Educadores_calle\\educadores-calle-system\\recovered_nna_create.tsx';
let content = fs.readFileSync(path, 'utf8');

const lines = content.split('\n');
let cleanedLines = [];
let capture = false;

for (const line of lines) {
    if (line.includes('The following code has been modified to include a line number')) {
        capture = true;
        continue;
    }
    if (line.includes('The above content shows the entire, complete file contents') || 
        line.includes('The above content does NOT show the entire file contents')) {
        break;
    }
    
    if (capture) {
        // Strip out the leading line number like "123: "
        const match = line.match(/^\d+:\s(.*)/);
        if (match) {
            cleanedLines.push(match[1]);
        } else {
            cleanedLines.push(line); // Fallback
        }
    }
}

fs.writeFileSync(path, cleanedLines.join('\n'), 'utf8');
console.log('Cleaned file!');
