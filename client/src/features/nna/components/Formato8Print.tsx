interface Formato8Props {
    taller: any;
    nna: any;
    id?: string;
}

export const Formato8Print = ({ taller, nna, id = 'formato-8-print' }: Formato8Props) => {
    if (!taller || !nna) return null;

    // Obtener datos de evaluación individual (del participante actual en el taller)
    const evalData = taller.participantes?.find((p: any) => p.nnaId === nna.id) || {};

    const cellStyle = {
        border: '1px solid black',
        padding: '8px',
        fontSize: '11px',
        fontFamily: 'Arial, Helvetica, sans-serif',
        lineHeight: '1.4'
    } as const;

    const headerStyle = {
        ...cellStyle,
        backgroundColor: '#f3f4f6',
        fontWeight: 'bold',
        textTransform: 'uppercase' as const,
        fontSize: '10px'
    } as const;

    const checkboxBox = {
        border: '1px solid black',
        width: '30px',
        height: '18px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: '8px',
        fontWeight: 'bold',
        fontSize: '14px'
    } as const;

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '---';
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    return (
        <div id={id} style={{
            width: '210mm',
            minHeight: '297mm',
            padding: '20mm',
            backgroundColor: 'white',
            color: 'black',
            boxSizing: 'border-box'
        }}>
            {/* Cabecera Oficial */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '12px' }}>FORMATO 8</div>
                <img src="/logo-mimp.png" alt="Logo MIMP" style={{ height: '45px' }} />
            </div>

            <div style={{
                border: '1.5px solid black',
                textAlign: 'center',
                padding: '10px',
                fontWeight: '900',
                fontSize: '14px',
                marginBottom: '-1px'
            }}>
                FORMATO DE EVALUACIÓN DE TALLERES SOCIOEDUCATIVOS
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <tbody>
                    {/* 1. SECCIÓN TALLER */}
                    <tr>
                        <td colSpan={3} style={cellStyle}>
                            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>1. TALLER:</div>
                            <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{taller.nombre}</div>
                            <div style={{ fontSize: '9px', fontStyle: 'italic', marginTop: '4px', color: '#444' }}>(Señalar el nombre del taller)</div>
                        </td>
                    </tr>

                    {/* 2. DIRIGIDO A */}
                    <tr>
                        <td colSpan={3} style={{ ...cellStyle, padding: 0 }}>
                            <div style={{ ...headerStyle, border: 'none', borderBottom: '1px solid black' }}>2. DIRIGIDO A:</div>
                            <div style={{ display: 'flex', padding: '10px' }}>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                                    <span style={checkboxBox}>{taller.dirigidoA === 'Niños y niñas' ? 'X' : ''}</span> Niños y niñas
                                </div>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                                    <span style={checkboxBox}>{taller.dirigidoA === 'Adolescentes' ? 'X' : ''}</span> Adolescentes
                                </div>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                                    <span style={checkboxBox}>{taller.dirigidoA === 'Padres de Familia' ? 'X' : ''}</span> Padres de Familia
                                </div>
                            </div>
                        </td>
                    </tr>

                    {/* 3. OBJETIVO */}
                    <tr>
                        <td colSpan={3} style={cellStyle}>
                            <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>3. OBJETIVO:</div>
                            <div style={{ fontSize: '10px', fontStyle: 'italic', marginBottom: '8px' }}>
                                (Describir cuáles son los resultados que esperamos obtener en la actividad, para después evaluar el logro de metas).
                            </div>
                            <div style={{ minHeight: '40px', whiteSpace: 'pre-wrap' }}>{taller.objetivo || '---'}</div>
                        </td>
                    </tr>

                    {/* 4. PERSONAS ASISTENTES */}
                    <tr>
                        <td colSpan={3} style={cellStyle}>
                            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>4. PERSONAS ASISTENTES:</div>
                            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
                                {nna.apellidoPaterno} {nna.apellidoMaterno}, {nna.nombres}
                                <span style={{ fontWeight: 'normal', fontStyle: 'italic', marginLeft: '10px', fontSize: '11px' }}>
                                    (Expediente: {nna.carpeta?.codigo || '---'})
                                </span>
                            </div>
                        </td>
                    </tr>

                    {/* 5. LOGROS */}
                    <tr>
                        <td colSpan={3} style={cellStyle}>
                            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>5. LOGROS:</div>
                            <div style={{ fontSize: '9px', fontStyle: 'italic', marginBottom: '6px' }}>(Indicar los cambios obtenidos luego de recibir el taller)</div>
                            <div style={{ minHeight: '80px', whiteSpace: 'pre-wrap' }}>{evalData.logros || '---'}</div>
                        </td>
                    </tr>

                    {/* 6. LIMITACIONES */}
                    <tr>
                        <td colSpan={3} style={cellStyle}>
                            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>6. LIMITACIONES ENCONTRADAS:</div>
                            <div style={{ fontSize: '9px', fontStyle: 'italic', marginBottom: '6px' }}>(Señalar las dificultades encontradas en función a la planificación del taller)</div>
                            <div style={{ minHeight: '60px', whiteSpace: 'pre-wrap' }}>{evalData.limitaciones || '---'}</div>
                        </td>
                    </tr>

                    {/* 7. RECOMENDACIONES */}
                    <tr>
                        <td colSpan={3} style={cellStyle}>
                            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>7. SUGERENCIAS Y RECOMENDACIONES:</div>
                            <div style={{ minHeight: '50px', whiteSpace: 'pre-wrap' }}>{evalData.sugerencias || '---'}</div>
                        </td>
                    </tr>

                    {/* 8. LUGAR, FECHA Y HORA */}
                    <tr>
                        <td colSpan={3} style={cellStyle}>
                            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>8. LUGAR, FECHA Y HORA (del taller):</div>
                            <div style={{ display: 'flex', gap: '20px', fontSize: '12px' }}>
                                <span><strong>LUGAR:</strong> {taller.lugar}</span>
                                <span><strong>FECHA:</strong> {formatDate(taller.fecha)}</span>
                                <span><strong>HORA:</strong> {taller.hora}</span>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Firma del Responsable */}
            <div style={{ marginTop: '50px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                    width: '300px',
                    borderTop: '1.5px solid black',
                    textAlign: 'center',
                    paddingTop: '8px',
                    fontWeight: 'bold',
                    fontSize: '11px'
                }}>
                    9. FIRMA DEL EDUCADOR RESPONSABLE
                    <div style={{ fontWeight: 'normal', fontSize: '10px', marginTop: '4px' }}>
                        {taller.educadorResponsable?.nombreCompleto || '___________________________'}
                    </div>
                    <div style={{ fontWeight: 'normal', fontSize: '9px', marginTop: '2px', fontStyle: 'italic' }}>
                        Fecha del informe: {formatDate(new Date().toISOString())}
                    </div>
                </div>
            </div>
        </div>
    );
};
