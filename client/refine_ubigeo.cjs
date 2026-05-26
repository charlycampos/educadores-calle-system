const fs = require('fs');
const path = 'd:/Usuarios/ccampos/Documents/Python Scripts/Educadores_calle/educadores-calle-system/client/src/features/nna/components/Formato4Social.tsx';

try {
    let content = fs.readFileSync(path, 'utf8');

    // 1. ADD IMPORT
    if (!content.includes('UbigeoSelectorSimple')) {
        content = content.replace(
            "import { Printer, Save, Plus, Edit2, Trash2, X, ArrowLeft } from 'lucide-react';",
            "import { Printer, Save, Plus, Edit2, Trash2, X, ArrowLeft } from 'lucide-react';\nimport { UbigeoSelectorSimple } from './UbigeoSelectorSimple';"
        );
    }

    // 2. UPDATE STATE (formData)
    // Find: lugarNacimientoProvincia: nna?.provinciaNacimiento || '',
    // Add: lugarNacimientoDistrito
    if (!content.includes('lugarNacimientoDistrito:')) {
        content = content.replace(
            "lugarNacimientoProvincia: nna?.provinciaNacimiento || '',",
            "lugarNacimientoProvincia: nna?.provinciaNacimiento || '',\n        lugarNacimientoDistrito: nna?.distritoNacimiento || '',"
        );
    }

    // Find: direccionActual: nna?.direccionDomicilio || '',
    // Add: domicilioDepartamento, domicilioProvincia, domicilioDistrito
    if (!content.includes('domicilioDepartamento:')) {
        content = content.replace(
            "direccionActual: nna?.direccionDomicilio || '',",
            `direccionActual: nna?.direccionDomicilio || '',
        domicilioDepartamento: nna?.departamentoDomicilio || '',
        domicilioProvincia: nna?.provinciaDomicilio || '',
        domicilioDistrito: nna?.distritoDomicilio || '',`
        );
    }

    // 3. UPDATE LOAD EFFECT
    // We need to update the useEffect that loads initialData too.
    const loadEffectStart = "if (initialData) {";
    if (content.includes(loadEffectStart)) {
        // Just generic replace inside the effect if possible, but regex is risky.
        // Let's assume user fills them. If we edit, we should load them.
        // We will simple append them after a known line in the useEffect block.
        // "lugarNacimientoProvincia: initialData.lugarNacimientoProvincia || prev.lugarNacimientoProvincia,"

        if (!content.includes('lugarNacimientoDistrito: initialData.lugarNacimientoDistrito')) {
            content = content.replace(
                "lugarNacimientoProvincia: initialData.lugarNacimientoProvincia || prev.lugarNacimientoProvincia,",
                "lugarNacimientoProvincia: initialData.lugarNacimientoProvincia || prev.lugarNacimientoProvincia,\n                lugarNacimientoDistrito: initialData.lugarNacimientoDistrito || prev.lugarNacimientoDistrito,"
            );
        }

        if (!content.includes('domicilioDepartamento: initialData.domicilioDepartamento')) {
            content = content.replace(
                "direccionActual: initialData.direccionActual || prev.direccionActual,",
                `direccionActual: initialData.direccionActual || prev.direccionActual,
                domicilioDepartamento: initialData.domicilioDepartamento || prev.domicilioDepartamento,
                domicilioProvincia: initialData.domicilioProvincia || prev.domicilioProvincia,
                domicilioDistrito: initialData.domicilioDistrito || prev.domicilioDistrito,`
            );
        }
    }

    // 4. UPDATE SAVE PAYLOAD
    // "lugarNacimientoProvincia: formData.lugarNacimientoProvincia,"

    if (!content.includes('lugarNacimientoDistrito: formData.lugarNacimientoDistrito')) {
        content = content.replace(
            "lugarNacimientoProvincia: formData.lugarNacimientoProvincia,",
            "lugarNacimientoProvincia: formData.lugarNacimientoProvincia,\n                lugarNacimientoDistrito: formData.lugarNacimientoDistrito,"
        );
    }

    if (!content.includes('domicilioDepartamento: formData.domicilioDepartamento')) {
        content = content.replace(
            "direccionActual: formData.direccionActual,",
            `direccionActual: formData.direccionActual,
                domicilioDepartamento: formData.domicilioDepartamento,
                domicilioProvincia: formData.domicilioProvincia,
                domicilioDistrito: formData.domicilioDistrito,`
        );
    }

    // 5. REPLACE LUGAR NACIMIENTO JSX
    // This is the tricky part.
    /*
                            <div className="col-span-12 md:col-span-4">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Lugar de Nacimiento</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <input ... />
                                    <input ... />
                                </div>
                            </div>
    */
    // Regex replace to swap inner content
    const nacRegex = /<div className="col-span-12 md:col-span-4">\s*<label className="block text-\[10px\] font-bold text-gray-400 uppercase mb-1">Lugar de Nacimiento<\/label>\s*<div className="grid grid-cols-2 gap-2">[\s\S]*?<\/div>\s*<\/div>/;

    const newNacJSX = `<div className="col-span-12 md:col-span-8 bg-gray-50/50 p-2 rounded-lg border border-gray-100">
                                <label className="block text-[10px] font-bold text-indigo-800 uppercase mb-2 border-b border-gray-200 pb-1">Lugar de Nacimiento</label>
                                <UbigeoSelectorSimple
                                    departamento={formData.lugarNacimientoDepartamento}
                                    provincia={formData.lugarNacimientoProvincia}
                                    distrito={formData.lugarNacimientoDistrito}
                                    onChange={(field, value) => {
                                        if (field === 'departamento') setFormData(prev => ({...prev, lugarNacimientoDepartamento: value, lugarNacimientoProvincia: '', lugarNacimientoDistrito: ''}));
                                        else if (field === 'provincia') setFormData(prev => ({...prev, lugarNacimientoProvincia: value, lugarNacimientoDistrito: ''}));
                                        else if (field === 'distrito') setFormData(prev => ({...prev, lugarNacimientoDistrito: value}));
                                    }}
                                />
                            </div>`;

    content = content.replace(nacRegex, newNacJSX);

    // 6. REPLACE DIRECCION ACTUAL JSX
    // "Dirección Actual" div
    // We want to insert Ubigeo Selector BEFORE the address input field.
    const dirRegex = /<div className="col-span-12">\s*<label className="block text-\[10px\] font-bold text-gray-400 uppercase mb-1">Dirección Actual<\/label>\s*<input([\s\S]*?)\/>\s*<\/div>/;

    // We capture the input part to keep it, but wrapped.
    // Actually, let's rewrite the whole block.

    // We need to find the specific block for "Dirección Actual"
    const targetDirStart = '<label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Dirección Actual</label>';
    const dirIdx = content.indexOf(targetDirStart);

    if (dirIdx !== -1) {
        // Find the start of the div wrapping this label
        const divStart = content.lastIndexOf('<div className="col-span-12">', dirIdx);
        // Find end of this div
        const divEnd = content.indexOf('</div>', dirIdx) + 6;

        const oldDirBlock = content.substring(divStart, divEnd);

        const newDirBlock = `<div className="col-span-12 bg-blue-50/30 p-3 rounded-xl border border-blue-100 space-y-3">
                                <h3 className="text-[10px] font-black text-blue-800 uppercase border-b border-blue-100 pb-1">Domicilio Actual</h3>
                                
                                <UbigeoSelectorSimple
                                    departamento={formData.domicilioDepartamento}
                                    provincia={formData.domicilioProvincia}
                                    distrito={formData.domicilioDistrito}
                                    onChange={(field, value) => {
                                        if (field === 'departamento') setFormData(prev => ({...prev, domicilioDepartamento: value, domicilioProvincia: '', domicilioDistrito: ''}));
                                        else if (field === 'provincia') setFormData(prev => ({...prev, domicilioProvincia: value, domicilioDistrito: ''}));
                                        else if (field === 'distrito') setFormData(prev => ({...prev, domicilioDistrito: value}));
                                    }}
                                />
                                
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Dirección (Av/Jr/Calle/Psje, Nro, Mz, Lte)</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-blue-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500"
                                        placeholder="Especifique dirección exacta..."
                                        value={formData.direccionActual}
                                        onChange={(e) => setFormData({ ...formData, direccionActual: e.target.value })}
                                    />
                                </div>
                            </div>`;

        content = content.replace(oldDirBlock, newDirBlock);
    }

    fs.writeFileSync(path, content, 'utf8');
    console.log('Formato4Social updated with Ubigeo Selectors');

} catch (e) {
    console.error(e);
}
