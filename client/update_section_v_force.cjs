const fs = require('fs');
const path = 'd:/Usuarios/ccampos/Documents/Python Scripts/Educadores_calle/educadores-calle-system/client/src/features/nna/components/Formato4Social.tsx';

try {
    let content = fs.readFileSync(path, 'utf8');

    const marker = '{/* V. DATOS DE LA VIVIENDA */}';

    // Contenido Nuevo Sección V
    const newSectionV = `                    {/* V. DATOS DE LA VIVIENDA */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-6">
                        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
                            <h2 className="text-sm font-black text-gray-900 uppercase">
                                V. DATOS DE LA VIVIENDA
                            </h2>
                        </div>
                        <div className="p-4 grid grid-cols-12 gap-x-6 gap-y-4 text-xs">
                            
                            {/* Fila 1: Material */}
                            <div className="col-span-12 md:col-span-4 p-2 border border-gray-100 rounded">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 text-center">MATERIAL (X)</label>
                                <div className="flex justify-center gap-4">
                                    <label className="flex items-center gap-1"><input type="radio" name="material" value="CONCRETO" checked={formData.materialVivienda === 'CONCRETO'} onChange={(e) => setFormData({...formData, materialVivienda: e.target.value})} /> Concreto</label>
                                    <label className="flex items-center gap-1"><input type="radio" name="material" value="PRECARIO" checked={formData.materialVivienda === 'PRECARIO'} onChange={(e) => setFormData({...formData, materialVivienda: e.target.value})} /> Precario</label>
                                </div>
                            </div>
                            
                            {/* Fila 1: Ambientes */}
                            <div className="col-span-12 md:col-span-4 p-2 border border-gray-100 rounded">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 text-center">NÚMERO DE AMBIENTES (X)</label>
                                <div className="flex justify-center gap-6">
                                    <label className="flex items-center gap-1"><input type="radio" name="ambientes" value="1" checked={formData.numeroAmbientes === '1'} onChange={(e) => setFormData({...formData, numeroAmbientes: e.target.value})} /> 1</label>
                                    <label className="flex items-center gap-1"><input type="radio" name="ambientes" value="2" checked={formData.numeroAmbientes === '2'} onChange={(e) => setFormData({...formData, numeroAmbientes: e.target.value})} /> 2</label>
                                    <label className="flex items-center gap-1"><input type="radio" name="ambientes" value="3" checked={formData.numeroAmbientes === '3'} onChange={(e) => setFormData({...formData, numeroAmbientes: e.target.value})} /> 3</label>
                                </div>
                            </div>

                            {/* Fila 1: Propiedad */}
                            <div className="col-span-12 md:col-span-4 p-2 border border-gray-100 rounded">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 text-center">PROPIEDAD DE LA VIVIENDA (X)</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <label className="flex items-center gap-1"><input type="radio" name="propiedad" value="OTROS" checked={formData.propiedadVivienda === 'OTROS'} onChange={(e) => setFormData({...formData, propiedadVivienda: e.target.value})} /> Otros</label>
                                    <label className="flex items-center gap-1"><input type="radio" name="propiedad" value="PROPIA" checked={formData.propiedadVivienda === 'PROPIA'} onChange={(e) => setFormData({...formData, propiedadVivienda: e.target.value})} /> Propia</label>
                                    <label className="flex items-center gap-1"><input type="radio" name="propiedad" value="ALQUILADA" checked={formData.propiedadVivienda === 'ALQUILADA'} onChange={(e) => setFormData({...formData, propiedadVivienda: e.target.value})} /> Alquilada</label>
                                    <label className="flex items-center gap-1"><input type="radio" name="propiedad" value="ALOJADO" checked={formData.propiedadVivienda === 'ALOJADO'} onChange={(e) => setFormData({...formData, propiedadVivienda: e.target.value})} /> Alojado/Inv.</label>
                                </div>
                            </div>

                            {/* Fila 2: SISFOH */}
                            <div className="col-span-12 md:col-span-4 p-2 border border-gray-100 rounded bg-gray-50">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 text-center">VIVIENDA INSCRITA EN SISFOH (X)</label>
                                <div className="flex justify-center gap-6">
                                    <label className="flex items-center gap-1"><input type="radio" name="sisfoh" value="SI" checked={formData.viviendaSisfoh === 'SI'} onChange={(e) => setFormData({...formData, viviendaSisfoh: e.target.value})} /> SI</label>
                                    <label className="flex items-center gap-1"><input type="radio" name="sisfoh" value="NO" checked={formData.viviendaSisfoh === 'NO'} onChange={(e) => setFormData({...formData, viviendaSisfoh: e.target.value})} /> NO</label>
                                </div>
                            </div>

                            {/* Fila 2: Cama */}
                            <div className="col-span-12 md:col-span-4 p-2 border border-gray-100 rounded bg-gray-50">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 text-center">DUERME EN UNA CAMA (X)</label>
                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-center gap-6">
                                        <label className="flex items-center gap-1"><input type="radio" name="cama" value="SI" checked={formData.duermeCama === 'SI'} onChange={(e) => setFormData({...formData, duermeCama: e.target.value})} /> SI</label>
                                        <label className="flex items-center gap-1"><input type="radio" name="cama" value="NO" checked={formData.duermeCama === 'NO'} onChange={(e) => setFormData({...formData, duermeCama: e.target.value})} /> NO</label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px]">¿Con quién?</span>
                                        <input type="text" className="flex-1 border-b border-gray-300 bg-transparent text-xs p-1" value={formData.duermeConQuien} onChange={(e) => setFormData({...formData, duermeConQuien: e.target.value})} />
                                    </div>
                                    <div className="flex justify-center gap-6 mt-1">
                                        <label className="flex items-center gap-1 text-[9px]"><input type="radio" name="solo" value="SOLO" checked={formData.duermeSoloAcompanado === 'SOLO'} onChange={(e) => setFormData({...formData, duermeSoloAcompanado: e.target.value})} /> SOLO</label>
                                        <label className="flex items-center gap-1 text-[9px]"><input type="radio" name="solo" value="ACOMPAÑADO" checked={formData.duermeSoloAcompanado === 'ACOMPAÑADO'} onChange={(e) => setFormData({...formData, duermeSoloAcompanado: e.target.value})} /> ACOMPAÑADO</label>
                                    </div>
                                </div>
                            </div>

                            {/* Fila 2: Servicios */}
                            <div className="col-span-12 md:col-span-4 p-2 border border-gray-100 rounded">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 text-center">SERVICIOS BÁSICOS (X)</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <label className="flex items-center gap-1"><input type="checkbox" checked={formData.serviciosBasicos.agua} onChange={(e) => setFormData({...formData, serviciosBasicos: {...formData.serviciosBasicos, agua: e.target.checked}})} /> AGUA</label>
                                    <label className="flex items-center gap-1"><input type="checkbox" checked={formData.serviciosBasicos.luz} onChange={(e) => setFormData({...formData, serviciosBasicos: {...formData.serviciosBasicos, luz: e.target.checked}})} /> LUZ</label>
                                    <label className="flex items-center gap-1"><input type="checkbox" checked={formData.serviciosBasicos.desague} onChange={(e) => setFormData({...formData, serviciosBasicos: {...formData.serviciosBasicos, desague: e.target.checked}})} /> DESAGÜE</label>
                                    <label className="flex items-center gap-1"><input type="checkbox" checked={formData.serviciosBasicos.otros} onChange={(e) => setFormData({...formData, serviciosBasicos: {...formData.serviciosBasicos, otros: e.target.checked}})} /> OTROS</label>
                                </div>
                            </div>

                            {/* Fila 3: Higiene */}
                            <div className="col-span-12 md:col-span-6 p-2 border border-gray-100 rounded">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 text-center">LA HIGIENE EN EL DOMICILIO SE ENCUENTRA: (X)</label>
                                <div className="flex justify-between px-4">
                                    {['BUENO', 'REGULAR', 'MALO', 'PESIMO'].map(opt => (
                                        <label key={opt} className="flex items-center gap-1 text-[10px]">
                                            <input type="radio" name="higiene" value={opt} checked={formData.higieneDomicilio === opt} onChange={(e) => setFormData({...formData, higieneDomicilio: e.target.value})} /> {opt}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Fila 3: Albergue */}
                            <div className="col-span-12 md:col-span-6 p-2 border border-gray-100 rounded bg-gray-50">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 text-center">ESTUVO EN: CAR/ALBERGUE</label>
                                <div className="grid grid-cols-12 gap-2 items-center">
                                    <div className="col-span-4 flex justify-center gap-4">
                                        <span className="font-bold">SI [{nna?.tieneAntecedenteAlbergue ? 'X' : ' '}]</span>
                                        <span className="font-bold">NO [{!nna?.tieneAntecedenteAlbergue ? 'X' : ' '}]</span>
                                    </div>
                                    <div className="col-span-8 flex flex-col gap-1">
                                         <div className="flex items-center gap-2">
                                            <span className="text-[9px]">¿Cuánto Tiempo?</span>
                                            <input type="text" className="flex-1 border-b border-gray-300 bg-transparent text-xs p-1" value={formData.tiempoAlbergue} onChange={(e) => setFormData({...formData, tiempoAlbergue: e.target.value})} />
                                         </div>
                                         <div className="flex items-center gap-2">
                                            <span className="text-[9px]">Motivo:</span>
                                            <span className="text-[10px]">{nna?.detalleAntecedenteAlbergue || '---'}</span>
                                         </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
`;

    const startIdx = content.indexOf(marker);
    if (startIdx !== -1) {
        // Find End
        const endIdx = content.indexOf('{/* VI.', startIdx);
        if (endIdx !== -1) {
            // Check context: ensure it's input block (has className)
            // Or just assume it is because debug showed only one like this.
            // Using lastIdxOf might be unsafe if there are multiple.
            // The debug script found one at 83645.

            // To be super safe: check if content between startIdx and endIdx contains formData
            const block = content.substring(startIdx, endIdx);
            if (block.includes('formData')) {
                const head = content.substring(0, startIdx);
                const tail = content.substring(endIdx);

                const finalContent = head + newSectionV + '\n\n                    ' + tail;
                fs.writeFileSync(path, finalContent, 'utf8');
                console.log('Force update success');
            } else {
                console.log('Block does not look like form data inputs (no formData found)');
            }
        } else { console.log('VI marker not found'); }
    } else { console.log('V marker not found'); }

} catch (e) { console.log(e); }
