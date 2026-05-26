interface Formato7Props {
    taller: any;
    id?: string;
}

export const Formato7Print = ({ taller, id = 'formato-7-print' }: Formato7Props) => {
    if (!taller) return null;

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
                <div style={{ fontWeight: 'bold', fontSize: '12px' }}>FORMATO 7</div>
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
                FORMATO DE PLANIFICACIÓN DE TALLERES SOCIOEDUCATIVOS
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <tbody>
                    {/* 1. SECCIÓN TALLER */}
                    <tr>
                        <td colSpan={3} style={cellStyle}>
                            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>1. TALLER:</div>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', minHeight: '20px' }}>{taller.nombre}</div>
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
                            <div style={{ minHeight: '50px', whiteSpace: 'pre-wrap' }}>{taller.objetivo || '---'}</div>
                        </td>
                    </tr>

                    {/* 4. NÚMERO DE PERSONAS */}
                    <tr>
                        <td style={{ ...cellStyle, width: '40%', fontWeight: 'bold' }}>4. NÚMERO DE PERSONAS PLANIFICADAS:</td>
                        <td colSpan={2} style={{ ...cellStyle, fontSize: '12px', fontWeight: 'bold' }}>{taller.numeroPersonasPlanificadas || '---'}</td>
                    </tr>

                    {/* 5. ACCIONES PREVIAS */}
                    <tr>
                        <td colSpan={3} style={cellStyle}>
                            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>5. ACCIONES A DESARROLLAR:</div>
                            <div style={{ fontSize: '9px', fontStyle: 'italic', marginBottom: '6px' }}>(Acciones realizadas previas al taller)</div>
                            <div style={{ minHeight: '60px', whiteSpace: 'pre-wrap' }}>{taller.accionesPrevias || '---'}</div>
                        </td>
                    </tr>

                    {/* 6. ESQUEMA DEL TALLER */}
                    <tr>
                        <td colSpan={3} style={{ ...cellStyle, padding: 0 }}>
                            <div style={{ ...headerStyle, border: 'none', borderBottom: '1px solid black' }}>6. ESQUEMA DEL TALLER</div>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th style={{ ...headerStyle, width: '15%', border: 'none', borderRight: '1px solid black', borderBottom: '1px solid black' }}>TIEMPO</th>
                                        <th style={{ ...headerStyle, width: '55%', border: 'none', borderRight: '1px solid black', borderBottom: '1px solid black' }}>ACTIVIDAD</th>
                                        <th style={{ ...headerStyle, width: '30%', border: 'none', borderBottom: '1px solid black' }}>MATERIALES</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ minHeight: '80px' }}>
                                        <td style={{ ...cellStyle, border: 'none', borderRight: '1px solid black', borderBottom: '1px solid black', textAlign: 'center' }}>{taller.inicioTiempo || '---'}</td>
                                        <td style={{ ...cellStyle, border: 'none', borderRight: '1px solid black', borderBottom: '1px solid black' }}>
                                            <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '4px' }}>INICIO</div>
                                            <div style={{ whiteSpace: 'pre-wrap' }}>{taller.inicioActividad || '---'}</div>
                                        </td>
                                        <td style={{ ...cellStyle, border: 'none', borderBottom: '1px solid black' }}>{taller.inicioMateriales || '---'}</td>
                                    </tr>
                                    <tr style={{ minHeight: '120px' }}>
                                        <td style={{ ...cellStyle, border: 'none', borderRight: '1px solid black', borderBottom: '1px solid black', textAlign: 'center' }}>{taller.procesoTiempo || '---'}</td>
                                        <td style={{ ...cellStyle, border: 'none', borderRight: '1px solid black', borderBottom: '1px solid black' }}>
                                            <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '4px' }}>PROCESO</div>
                                            <div style={{ whiteSpace: 'pre-wrap' }}>{taller.procesoActividad || '---'}</div>
                                        </td>
                                        <td style={{ ...cellStyle, border: 'none', borderBottom: '1px solid black' }}>{taller.procesoMateriales || '---'}</td>
                                    </tr>
                                    <tr style={{ minHeight: '80px' }}>
                                        <td style={{ ...cellStyle, border: 'none', borderRight: '1px solid black', textAlign: 'center' }}>{taller.cierreTiempo || '---'}</td>
                                        <td style={{ ...cellStyle, border: 'none', borderRight: '1px solid black' }}>
                                            <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginBottom: '4px' }}>CIERRE</div>
                                            <div style={{ whiteSpace: 'pre-wrap' }}>{taller.cierreActividad || '---'}</div>
                                        </td>
                                        <td style={{ ...cellStyle, border: 'none' }}>{taller.cierreMateriales || '---'}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>

                    {/* 7. LOGÍSTICA */}
                    <tr>
                        <td colSpan={3} style={cellStyle}>
                            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>7. LUGAR, FECHA Y HORA:</div>
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
                    width: '250px',
                    borderTop: '1.5px solid black',
                    textAlign: 'center',
                    paddingTop: '8px',
                    fontWeight: 'bold',
                    fontSize: '11px'
                }}>
                    8. FIRMA DEL EDUCADOR RESPONSABLE
                    <div style={{ fontWeight: 'normal', fontSize: '10px', marginTop: '4px' }}>
                        {taller.educadorResponsable?.nombreCompleto || '___________________________'}
                    </div>
                </div>
            </div>
        </div>
    );
};
