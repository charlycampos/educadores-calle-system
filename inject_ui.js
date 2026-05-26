const fs = require('fs');
const path = 'D:\\Usuarios\\ccampos\\Documents\\Python Scripts\\Educadores_calle\\educadores-calle-system\\client\\src\\features\\nna\\NnaCreatePage.tsx';
let content = fs.readFileSync(path, 'utf8');

const startMarker = '{/* Actividades de Calle Dinámicas */}';
const endMarker = '{/* Condicion - "Realizas la actividad:" */}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const replacement = '<ActividadesCalleSection control={control} />\n\n                                    ';
    content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Replaced successfully!');
} else {
    console.log('Markers not found!');
}
