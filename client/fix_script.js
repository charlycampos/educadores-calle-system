const fs = require('fs');
const path = 'd:/Usuarios/ccampos/Documents/Python Scripts/Educadores_calle/educadores-calle-system/client/src/features/nna/components/Formato4Social.tsx';

try {
    let content = fs.readFileSync(path, 'utf8');

    // Marcador de inicio: cierre del bloque nuevo y apertura del viejo
    // En el diff vimos: </div>                    <div>
    const startRegex = /<\/div>\s+<div>\s+<h3/;

    // Marcador de fin: Inicio Sección IV
    const endString = '{/* IV. DATOS DE LA FAMILIA */}';

    const startMatch = content.match(startRegex);
    const endIndex = content.indexOf(endString);

    if (startMatch && endIndex !== -1 && endIndex > startMatch.index) {
        console.log('Duplicate block found.');

        // startMatch[0] es "</div>                    <div>... <h3"
        // Queremos mantener el primer "</div>" y borrar desde ahí hasta endString.

        const cutStart = startMatch.index + 6; // Longitud de "</div>" es 6.

        // Cortamos desde cutStart hasta endIndex
        const newContent = content.substring(0, cutStart) + '\n\n                    ' + content.substring(endIndex);

        fs.writeFileSync(path, newContent, 'utf8');
        console.log('Successfully removed duplicate block.');
    } else {
        console.log('Error: Could not locate the duplication block pattern.');
        if (!startMatch) console.log('Start pattern not found.');
        if (endIndex === -1) console.log('End pattern not found.');
    }
} catch (e) {
    console.error('Error:', e);
}
