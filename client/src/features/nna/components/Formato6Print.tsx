
interface Formato6Props {
    nna: any; // Datos del NNA
    data: any; // Datos de la derivación (institución, motivo, etc.)
    id?: string;
}

export const Formato6Print = ({ nna, data, id = 'formato-6-print' }: Formato6Props) => {
    if (!nna || !data) return null;

    const cellStyle = {
        border: '1px solid black',
        padding: '8px',
        fontSize: '11px',
        fontFamily: 'Arial, Helvetica, sans-serif'
    } as const;

    const labelStyle = {
        fontWeight: 'bold',
        fontSize: '10px',
        color: '#4b5563',
        marginBottom: '2px',
        textTransform: 'uppercase' as const
    } as const;

    // Calcular edad si está disponible
    const edad = nna.fechaNacimiento
        ? Math.floor((new Date().getTime() - new Date(nna.fechaNacimiento).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : '---';

    return (
        <div id={id} style={{
            width: '210mm',
            minHeight: '297mm',
            padding: '20mm',
            backgroundColor: 'white',
            color: 'black',
            boxSizing: 'border-box',
            position: 'relative'
        }}>
            {/* Cabecera */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '12px' }}>FORMATO 6</div>
                <img src="/logo-mimp.png" alt="Logo MIMP" style={{ height: '40px' }} />
            </div>

            <div style={{
                border: '1.5px solid black',
                textAlign: 'center',
                padding: '10px',
                fontWeight: '900',
                fontSize: '14px',
                backgroundColor: '#f3f4f6',
                marginBottom: '20px',
                textTransform: 'uppercase'
            }}>
                FICHA DE DERIVACIÓN INTERINSTITUCIONAL
            </div>

            {/* I. DATOS GENERALES */}
            <div style={{ marginBottom: '20px', border: '1px solid black' }}>
                <div style={{ backgroundColor: '#e5e7eb', padding: '5px 10px', fontWeight: 'bold', fontSize: '12px', borderBottom: '1px solid black' }}>
                    I. DATOS DE LA INSTITUCIÓN QUE DERIVA
                </div>
                <div style={{ padding: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                        <div style={labelStyle}>PROGRAMA / SERVICIO:</div>
                        <div style={{ fontSize: '12px' }}>SERVICIO DE EDUCADORES DE CALLE - INABIF</div>
                    </div>
                    <div>
                        <div style={labelStyle}>FECHA DE DERIVACIÓN:</div>
                        <div style={{ fontSize: '12px' }}>{new Date().toLocaleDateString('es-PE')}</div>
                    </div>
                </div>
            </div>

            {/* II. DATOS DEL NNA */}
            <div style={{ marginBottom: '20px', border: '1px solid black' }}>
                <div style={{ backgroundColor: '#e5e7eb', padding: '5px 10px', fontWeight: 'bold', fontSize: '12px', borderBottom: '1px solid black' }}>
                    II. DATOS DEL NIÑO, NIÑA O ADOLESCENTE
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                        <tr>
                            <td colSpan={2} style={cellStyle}>
                                <div style={labelStyle}>NOMBRES Y APELLIDOS:</div>
                                <div>{nna.apellidoPaterno} {nna.apellidoMaterno}, {nna.nombres}</div>
                            </td>
                            <td style={cellStyle}>
                                <div style={labelStyle}>EDAD:</div>
                                <div>{edad} Años</div>
                            </td>
                        </tr>
                        <tr>
                            <td style={cellStyle}>
                                <div style={labelStyle}>DNI / DOCUMENTO:</div>
                                <div>{nna.numeroDoc || 'NO REGISTRA'}</div>
                            </td>
                            <td colSpan={2} style={cellStyle}>
                                <div style={labelStyle}>DOMICILIO ACTUAL:</div>
                                <div>{nna.direccion || 'Referencial: ' + (nna.referenciaDomicilio || '---')}</div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* III. DATOS DE LA DERIVACIÓN */}
            <div style={{ marginBottom: '20px', border: '1px solid black' }}>
                <div style={{ backgroundColor: '#e5e7eb', padding: '5px 10px', fontWeight: 'bold', fontSize: '12px', borderBottom: '1px solid black' }}>
                    III. DATOS DE LA DERIVACIÓN
                </div>
                <div style={{ padding: '10px' }}>
                    <div style={{ marginBottom: '15px' }}>
                        <div style={labelStyle}>INSTITUCIÓN A LA QUE SE DERIVA:</div>
                        <div style={{
                            borderBottom: '1px solid #ccc',
                            padding: '4px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            textTransform: 'uppercase'
                        }}>
                            {data.entidadExterna || '---'} {data.tipo === 'INTERNA' ? '(DERIVACIÓN INTERNA)' : ''}
                        </div>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <div style={labelStyle}>MOTIVO DE LA DERIVACIÓN (RESUMEN DEL CASO):</div>
                        <div style={{
                            border: '1px solid #ccc',
                            padding: '8px',
                            minHeight: '80px',
                            fontSize: '11px',
                            marginTop: '2px',
                            whiteSpace: 'pre-wrap'
                        }}>
                            {data.motivo || 'Sin detalles registrados.'}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <div style={labelStyle}>PRIORIDAD:</div>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>{data.prioridad || 'NORMAL'}</div>
                        </div>
                        <div>
                            <div style={labelStyle}>DOCUMENTO DE REFERENCIA:</div>
                            <div style={{ fontSize: '12px' }}>{data.docReferencia || '---'}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* FIRMAS */}
            <div style={{ marginTop: '80px', display: 'flex', justifyContent: 'space-between', gap: '40px' }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ borderTop: '1px solid black', paddingTop: '5px', fontSize: '11px', fontWeight: 'bold' }}>
                        FIRMA Y SELLO DEL EDUCADOR(A)
                    </div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ borderTop: '1px solid black', paddingTop: '5px', fontSize: '11px', fontWeight: 'bold' }}>
                        FIRMA Y SELLO DE RECEPCIÓN
                    </div>
                    <div style={{ fontSize: '9px', marginTop: '4px' }}>(Institución de Destino)</div>
                </div>
            </div>

            {/* PIE DE PAGINA */}
            <div style={{ position: 'absolute', bottom: '20mm', left: '20mm', right: '20mm', fontSize: '9px', textAlign: 'center', color: '#666' }}>
                Servicio de Educadores de Calle - INABIF
            </div>
        </div>
    );
};
