const fs = require('fs');
const path = 'd:/Usuarios/ccampos/Documents/Python Scripts/Educadores_calle/educadores-calle-system/client/src/features/nna/components/Formato4Social.tsx';

try {
    let content = fs.readFileSync(path, 'utf8');

    // Regex ajuste: busque '</div>' seguido de espacio y '<div>'
    const startRegex = /<\/div>\s+<div>/;
    const endString = '{/* IV. DATOS DE LA FAMILIA */}';

    const startMatch = content.match(startRegex);
    const endIndex = content.indexOf(endString);

    if (startMatch && endIndex !== -1 && endIndex > startMatch.index) {
        console.log('Duplicate block found.');

        // startMatch[0] es "</div>            <div>"
        // Cortamos después de "</div>" (index + 6)
        const cutStart = startMatch.index + 6;

        const newContent = content.substring(0, cutStart) + '\n\n                    ' + content.substring(endIndex);

        fs.writeFileSync(path, newContent, 'utf8');
        console.log('Successfully removed duplicate block.');
    } else {
        console.log('Error: Patterns not found.');
        // Debug
        if (!startMatch) console.log('Start regex failed.');
        else console.log('Start match index:', startMatch.index);
        console.log('End index:', endIndex);
    }
} catch (e) {
    console.error('Error:', e);
}
