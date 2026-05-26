import { useRef } from 'react';

interface Formato3Props {
    nna: any; // Main NNA (el primero del expediente)
    expediente: any[]; // Todos los hermanos
    caso: any; // Caso activo
}

export const Formato3Print = ({ nna, expediente, caso }: Formato3Props) => {
    // Estilos inline para asegurar impresión exacta
    const tableStyle = { borderCollapse: 'collapse', width: '100%', fontSize: '10px', fontFamily: 'Arial, sans-serif' } as const;
    const thStyle = { border: '1px solid black', backgroundColor: '#f3f4f6', padding: '3px', textAlign: 'center', fontWeight: 'bold' } as const;
    const tdStyle = { border: '1px solid black', padding: '3px 4px', verticalAlign: 'middle' } as const;
    const labelStyle = { fontSize: '8px', textTransform: 'uppercase', color: '#444', display: 'block', marginBottom: '1px' } as const;
    const valueStyle = { fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase' } as const;
    const sectionTitle = {
        backgroundColor: '#e5e7eb',
        color: '#000',
        padding: '4px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        fontSize: '11px',
        marginTop: '8px',
        border: '1px solid black',
        borderBottom: 'none'
    } as const;

    // Helper para fechas
    const formatDate = (dateStr: string) => dateStr ? new Date(dateStr).toLocaleDateString() : '---';
    const formatBool = (val: boolean) => val ? 'SÍ' : 'NO';
    const formatObs = (val: string | null | undefined) => (val && val !== 'null') ? val : '---';

    // Helper: parsear DATOS_F03 CLOB de cada NNA del expediente
    const parseDatosF03 = (child: any) => {
        try { return child.datosF03 ? JSON.parse(child.datosF03) : {}; }
        catch { return {}; }
    };

    return (
        <div className="hidden print:block w-full text-black">
            {/* ENCABEZADO OFICIAL */}
            <table style={{ width: '100%', marginBottom: '5px' }}>
                <tbody>
                    <tr>
                        <td width="20%"><img src="/logo-min.png" alt="MIMP" style={{ height: '35px', filter: 'grayscale(100%)' }} /></td>
                        <td width="60%" style={{ textAlign: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>FICHA DE INSCRIPCIÓN Y COMPROMISO - EDUCADORES DE CALLE</h2>
                        </td>
                        <td width="20%" style={{ border: '1px solid black', textAlign: 'center', padding: '5px' }}>
                            <div style={{ fontSize: '9px' }}>N° EXPEDIENTE</div>
                            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{nna.carpeta?.codigo}</div>
                            <div style={{ fontSize: '9px', marginTop: '4px', borderTop: '1px dotted black', paddingTop: '2px' }}>FICHA N°</div>
                            <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{nna.codigoFicha03 || '---'}</div>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* SECCION I: DATOS GENERALES (CASO) */}
            <div style={sectionTitle as any}>I. DATOS GENERALES (INTERVENCIÓN)</div>
            <table style={tableStyle as any}>
                <tbody>
                    <tr>
                        <td style={tdStyle} width="33%">
                            <span style={labelStyle as any}>Distrito Intervención</span>
                            <div style={valueStyle as any}>{caso?.zonaIntervencion}</div>
                        </td>
                        <td style={tdStyle} width="33%">
                            <span style={labelStyle as any}>Provincia / Región Dom.</span>
                            <div style={valueStyle as any}>{nna.provinciaDom || 'LIMA'} / {nna.departamentoDom || 'LIMA'}</div>
                        </td>
                        <td style={tdStyle} width="33%">
                            <span style={labelStyle as any}>Modalidad Permanencia</span>
                            <div style={valueStyle as any}>{caso?.situacionCalle?.replace(/_/g, ' ')}</div>
                        </td>
                    </tr>
                    <tr>
                        <td colSpan={3} style={{ padding: 0, border: 'none' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <tbody>
                                    <tr>
                                        <td style={{ ...tdStyle, width: '20%', backgroundColor: '#f9fafb' }}><strong>Perfil del NNA:</strong></td>
                                        <td style={tdStyle}><span style={labelStyle as any}>Trabajo en Calle</span> {caso?.perfil === 'TRABAJO_EN_CALLE' ? 'X' : ''}</td>
                                        <td style={tdStyle}><span style={labelStyle as any}>Mendicidad</span> {caso?.perfil === 'MENDICIDAD' ? 'X' : ''}</td>
                                        <td style={tdStyle}><span style={labelStyle as any}>Vida en Calle</span> {caso?.perfil === 'VIDA_EN_CALLE' ? 'X' : ''}</td>
                                        <td style={tdStyle}><span style={labelStyle as any}>Explo. Sexual</span> {caso?.perfil === 'EXPLOTACION_SEXUAL' ? 'X' : ''}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td colSpan={3} style={{ padding: 0, border: 'none' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <tbody>
                                    <tr>
                                        <td style={tdStyle} width="20%">
                                            <span style={labelStyle as any}>F. Abordaje</span>
                                            <div style={valueStyle as any}>{formatDate(caso?.fechaAbordaje)}</div>
                                        </td>
                                        <td style={tdStyle} width="20%">
                                            <span style={labelStyle as any}>F. Ingreso</span>
                                            <div style={valueStyle as any}>{formatDate(caso?.fechaIngreso)}</div>
                                        </td>
                                        <td style={tdStyle} width="20%">
                                            <span style={labelStyle as any}>F. Reingreso</span>
                                            <div style={valueStyle as any}>{formatDate(caso?.fechaReingreso)}</div>
                                        </td>
                                        <td style={tdStyle} width="40%">
                                            <span style={labelStyle as any}>Horario / Días</span>
                                            <div style={valueStyle as any}>
                                                {caso?.horarioInicio} - {caso?.horarioFin}
                                                {caso?.horarioInicio2 ? ` / ${caso?.horarioInicio2} - ${caso?.horarioFin2}` : ''}
                                                <br />
                                                <span style={{ fontSize: '9px', fontWeight: 'normal' }}>({caso?.diasTrabajo})</span>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* SECCION II: DATOS PERSONALES DEL NNA (ITERAR SI HAY HERMANOS) */}
            {expediente.map((child: any, idx: number) => {
                const f03 = parseDatosF03(child); // Datos extra del CLOB
                return (
                <div key={child.id} style={{ marginTop: idx > 0 ? '15px' : '0', borderTop: idx > 0 ? '2px dashed black' : 'none', paddingTop: idx > 0 ? '10px' : '0' }}>
                    {idx > 0 && <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '5px' }}>BENEFICIARIO {idx + 1} (HERMANO)</div>}

                    <div style={sectionTitle as any}>II. DATOS PERSONALES DEL NNA {idx > 0 ? `(${child.nombres})` : ''}</div>
                    <table style={tableStyle as any}>
                        <tbody>
                            <tr>
                                <td style={{ ...tdStyle, width: '20%' }}>Apellidos</td>
                                <td style={{ ...tdStyle, width: '80%' }} colSpan={3}>
                                    <div style={valueStyle as any}>{child.apellidoPaterno} {child.apellidoMaterno}</div>
                                </td>
                            </tr>
                            <tr>
                                <td style={tdStyle}>Nombres</td>
                                <td style={tdStyle} colSpan={3}>
                                    <div style={valueStyle as any}>{child.nombres}</div>
                                </td>
                            </tr>
                            <tr>
                                <td style={tdStyle}>Sexo</td>
                                <td style={tdStyle}>
                                    M [{child.sexo === 'M' ? 'X' : ' '}]  F [{child.sexo === 'F' ? 'X' : ' '}]
                                </td>
                                <td style={tdStyle}>Lugar Nacimiento</td>
                                <td style={tdStyle}>{f03.departamentoNac || '---'} / {f03.provinciaNac || '---'} / {f03.distritoNac || '---'}</td>
                            </tr>
                            <tr>
                                <td style={tdStyle}>Fecha Nacimiento</td>
                                <td style={tdStyle}>
                                    {formatDate(child.fechaNacimiento)}
                                    {child.edad ? ` (${child.edad} ${child.unidadEdad === 'ANIOS' ? 'años' : child.unidadEdad === 'MESES' ? 'meses' : 'días'})` : ''}
                                </td>
                                <td style={tdStyle}>DNI / Doc</td>
                                <td style={tdStyle}>
                                    {child.tipoDoc}: {child.numeroDoc || 'S/D'}
                                    <span style={{ marginLeft: '8px', fontSize: '9px' }}>(Partida: {f03.tienePartidaNacimiento ? 'SI' : 'NO'})</span>
                                </td>
                            </tr>
                            <tr>
                                <td style={tdStyle}>Domicilio Actual</td>
                                <td style={tdStyle} colSpan={3}>
                                    {child.domicilioActual}
                                    {f03.referenciaDomicilio ? ` (Ref: ${f03.referenciaDomicilio})` : ''}
                                    {f03.telefonoContacto ? <span style={{ marginLeft: '12px' }}>Tel: {f03.telefonoContacto}</span> : null}
                                </td>
                            </tr>
                            {f03.detalleSinDoc && (
                                <tr>
                                    <td style={tdStyle}>Motivo Sin Doc.</td>
                                    <td style={tdStyle} colSpan={3}>{f03.detalleSinDoc}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* SECCION III y IV: ACTIVIDAD Y EDUCACION */}
                    <table style={{ ...tableStyle, marginTop: '8px' } as any}>
                        <tbody>
                            <tr>
                                <td style={{ ...tdStyle, backgroundColor: '#e5e7eb', fontWeight: 'bold' }} width="50%">III. DATOS ACTIVIDAD</td>
                                <td style={{ ...tdStyle, backgroundColor: '#e5e7eb', fontWeight: 'bold' }} width="50%">IV. EDUCACIÓN</td>
                            </tr>
                            <tr>
                                <td style={{ ...tdStyle, verticalAlign: 'top' }}>
                                    <div style={{ marginBottom: '4px' }}><span style={labelStyle as any}>Actividad:</span> {caso?.actividadRealizada}</div>
                                    <div style={{ marginBottom: '4px' }}><span style={labelStyle as any}>Tiempo en calle:</span> {caso?.tiempoEnCalle}</div>
                                    <div><span style={labelStyle as any}>Condición:</span> {caso?.condicion === 'SOLO' ? 'Solo' : 'Acompañado'}</div>
                                </td>
                                <td style={{ ...tdStyle, verticalAlign: 'top' }}>
                                    <div style={{ marginBottom: '4px' }}>
                                        <span style={labelStyle as any}>¿Estudia?:</span>
                                        <b>{child.estudiaActualmente ? 'SÍ' : 'NO'}</b>
                                        {!child.estudiaActualmente && f03.detalleNoEstudia && <span style={{ fontSize: '9px' }}> ({f03.detalleNoEstudia})</span>}
                                    </div>
                                    {child.estudiaActualmente && (
                                        <>
                                            <div style={{ marginBottom: '4px' }}><span style={labelStyle as any}>Nivel/Grado:</span> {child.nivelEducativo} {f03.gradoEstudio ? `- ${f03.gradoEstudio}` : ''}</div>
                                            <div style={{ marginBottom: '4px' }}><span style={labelStyle as any}>I.E.:</span> {f03.institucionEducativa || '---'}</div>
                                            {f03.modalidadEstudio && <div><span style={labelStyle as any}>Modalidad:</span> {f03.modalidadEstudio}</div>}
                                        </>
                                    )}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* SECCION V: SALUD */}
                    <div style={sectionTitle as any}>V. SALUD Y DISCAPACIDAD</div>
                    <table style={tableStyle as any}>
                        <tbody>
                            <tr>
                                <td style={tdStyle} width="25%">
                                    <span style={labelStyle as any}>Afiliado SIS</span>
                                    <b>{f03.afiliadoSIS === 'SI' ? 'SÍ' : (f03.afiliadoSIS || 'NO')}</b>
                                </td>
                                <td style={tdStyle} width="25%">
                                    <span style={labelStyle as any}>Otro Seguro</span>
                                    {f03.afiliadoOtroSeguro === 'SI' ? `SÍ (${f03.detalleOtroSeguro || ''})` : 'NO'}
                                </td>
                                <td style={tdStyle} width="50%" colSpan={2}>
                                    <span style={labelStyle as any}>¿Tiene Discapacidad?</span>
                                    {child.tieneDiscapacidad ? (
                                        <span>SÍ - {f03.tipoDiscapacidad?.replace(/_/g, ' ')} {f03.detalleDiscapacidad ? `(${f03.detalleDiscapacidad})` : ''}</span>
                                    ) : 'NO'}
                                </td>
                            </tr>
                            <tr>
                                <td style={tdStyle} colSpan={4}>
                                    <span style={labelStyle as any}>¿Sufre Enfermedad Actual?</span>
                                    {child.sufreEnfermedad ? (
                                        <span>SÍ: {f03.detalleEnfermedad || '---'}</span>
                                    ) : 'NO'}
                                    {f03.observacionesSalud && <span style={{ marginLeft: '10px', fontStyle: 'italic' }}>Obs: {f03.observacionesSalud}</span>}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* SECCION VI: FAMILIA */}
                    <div style={sectionTitle as any}>VI. FAMILIA Y VIVIENDA</div>
                    <table style={tableStyle as any}>
                        <tbody>
                            <tr>
                                <td style={tdStyle} width="33%">
                                    <span style={labelStyle as any}>Con quién vive</span>
                                    <div style={valueStyle as any}>
                                        {child.viveCon === 'OTRO' ? `OTRO: ${f03.detalleViveCon || ''}` : child.viveCon?.replace(/_/g, ' ')}
                                    </div>
                                </td>
                                <td style={tdStyle} width="33%">
                                    <span style={labelStyle as any}>Lugar Pernocte</span>
                                    <div style={valueStyle as any}>
                                        {child.lugarPernocte === 'OTRO' ? `OTRO: ${f03.detalleLugarPernocte || ''}` : child.lugarPernocte?.replace(/_/g, ' ')}
                                    </div>
                                </td>
                                <td style={tdStyle} width="33%">
                                    <span style={labelStyle as any}>Responsable Principal</span>
                                    <div style={valueStyle as any}>{child.nombreTutor || '---'}</div>
                                </td>
                            </tr>
                            <tr>
                                <td style={tdStyle} colSpan={3}>
                                    <span style={labelStyle as any}>Antecedente Institucional (Albergue/Hogar)</span>
                                    {f03.tieneAntecedenteAlbergue ? (
                                        <span><b>SÍ</b> - {f03.detalleAntecedenteAlbergue || ''}</span>
                                    ) : 'NO'}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Tabla de familiares registrados */}
                    {f03.familiares && f03.familiares.length > 0 && (
                        <table style={{ ...tableStyle, marginTop: '4px' } as any}>
                            <thead>
                                <tr style={{ backgroundColor: '#f3f4f6' }}>
                                    <th style={{ ...thStyle, width: '5%' }}>#</th>
                                    <th style={{ ...thStyle, width: '30%' }}>Nombres y Apellidos</th>
                                    <th style={{ ...thStyle, width: '15%' }}>Parentesco</th>
                                    <th style={{ ...thStyle, width: '12%' }}>DNI</th>
                                    <th style={{ ...thStyle, width: '13%' }}>Teléfono</th>
                                    <th style={{ ...thStyle, width: '15%' }}>Ocupación</th>
                                    <th style={{ ...thStyle, width: '10%' }}>¿Vive c/NNA?</th>
                                </tr>
                            </thead>
                            <tbody>
                                {f03.familiares.map((fam: any, fi: number) => (
                                    <tr key={fi} style={{ backgroundColor: fi % 2 === 0 ? '#fff' : '#f9fafb' }}>
                                        <td style={{ ...tdStyle, textAlign: 'center' }}>{fi + 1}</td>
                                        <td style={{ ...tdStyle, fontWeight: 'bold' }}>{fam.nombres || '---'}</td>
                                        <td style={tdStyle}>{fam.parentesco || '---'}</td>
                                        <td style={tdStyle}>{fam.dni || '---'}</td>
                                        <td style={tdStyle}>{fam.telefono || '---'}</td>
                                        <td style={tdStyle}>{fam.ocupacion || '---'}</td>
                                        <td style={{ ...tdStyle, textAlign: 'center' }}>{fam.viveCon === 'SI' ? 'SÍ' : 'NO'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {/* SECCION VII: TIEMPO LIBRE */}
                    <table style={{ ...tableStyle, marginTop: '5px' } as any}>
                        <tbody>
                            <tr>
                                <td style={{ ...tdStyle, width: '50%' }}>
                                    <span style={labelStyle as any}>VII. ACTIVIDADES TIEMPO LIBRE</span>
                                    {formatObs(child.actividadesTiempoLibre)}
                                </td>
                                <td style={{ ...tdStyle, width: '50%' }}>
                                    <span style={labelStyle as any}>VIII. OBSERVACIONES GENERALES</span>
                                    {formatObs(child.caracteristicas)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                );
            })}

            {/* FIRMAS */}
            <table style={{ width: '100%', marginTop: '40px', borderCollapse: 'collapse' }}>
                <tbody>
                    <tr>
                        <td width="10%"></td>
                        <td width="35%" style={{ borderTop: '1px solid black', textAlign: 'center', paddingTop: '5px' }}>
                            <div style={{ fontSize: '10px', fontWeight: 'bold' }}>RESPONSABLE / TUTOR</div>
                            <div style={{ fontSize: '9px' }}>DNI: ______________</div>
                        </td>
                        <td width="10%"></td>
                        <td width="35%" style={{ borderTop: '1px solid black', textAlign: 'center', paddingTop: '5px' }}>
                            <div style={{ fontSize: '10px', fontWeight: 'bold' }}>EDUCADOR DE CALLE</div>
                            <div style={{ fontSize: '9px' }}>{caso?.responsable?.nombreCompleto || 'Educador Responsable'}</div>
                        </td>
                        <td width="10%"></td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};
