const fs = require('fs');
const path = 'd:/Usuarios/ccampos/Documents/Python Scripts/Educadores_calle/educadores-calle-system/client/src/features/nna/components/Formato4Social.tsx';
const content = fs.readFileSync(path, 'utf8');
const marker = '{/* V. DATOS DE LA VIVIENDA */}';
let idx = content.indexOf(marker);
while (idx !== -1) {
    console.log('--- MATCH AT ' + idx + ' ---');
    console.log(content.substring(idx, idx + 300));
    idx = content.indexOf(marker, idx + 1);
}
