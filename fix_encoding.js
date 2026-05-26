const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client', 'src', 'features', 'nna', 'NnaCreatePage.tsx');
let text = fs.readFileSync(filePath, 'utf8');

const replacements = {
    'Ã¡': 'á', 'Ã©': 'é', 'Ã³': 'ó', 'Ãº': 'ú', 'Ã\xad': 'í', 'Ã-': 'í',
    'Ã±': 'ñ', 'Ã‘': 'Ñ', 'Â¿': '¿', 'Ãš': 'Ú', 'Ã“': 'Ó',
    'Ã‰': 'É', 'Ã ': 'Á', 'Â¡': '¡', 'Ã¼': 'ü'
};

for (const [k, v] of Object.entries(replacements)) {
    text = text.split(k).join(v);
}

fs.writeFileSync(filePath, text, 'utf8');
console.log('Fixed Mojibake with Node.js!');
