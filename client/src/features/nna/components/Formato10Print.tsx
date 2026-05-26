interface Formato10Props {
    taller: any;
    participantes?: any[];
    id?: string;
}

export const Formato10Print = ({ taller, participantes = [], id = 'formato-10-print' }: Formato10Props) => {
    if (!taller) return null;

    const cellStyle = {
        border: '1px solid black',
        padding: '6px',
        fontSize: '10px',
        fontFamily: 'Arial, Helvetica, sans-serif'
    } as const;

    const headerCellStyle = {
        ...cellStyle,
        fontWeight: 'bold',
        textAlign: 'center' as const,
        backgroundColor: '#f3f4f6',
        textTransform: 'uppercase' as const
    } as const;

    // Crear filas vacías hasta completar 15 si hay pocos participantes
    const displayRows = [...participantes];
    while (displayRows.length < 15) {
        displayRows.push({ id: `empty-${displayRows.length}`, nna: {} });
    }

    return (
        <div id={id} style={{
            width: '210mm',
            minHeight: '297mm',
            padding: '15mm',
            backgroundColor: 'white',
            color: 'black',
            boxSizing: 'border-box'
        }}>
            {/* Cabecera Oficial */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '12px' }}>FORMATO 10</div>
                <img src="/logo-mimp.png" alt="Logo MIMP" style={{ height: '40px' }} />
            </div>

            {/* Title Section */}
            <div style={{ border: '1.2px solid black', textAlign: 'center', marginBottom: '10px' }}>
                <div style={{ padding: '4px', fontWeight: 'bold', fontSize: '11px', borderBottom: '1.2px solid black' }}>USUARIOS/AS</div>
                <div style={{ padding: '8px', fontWeight: '900', fontSize: '13px', backgroundColor: '#f9fafb' }}>
                    REGISTRO DE ASISTENCIA DE ACTIVIDADES
                </div>
            </div>

            {/* Info Section */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px' }}>
                <tbody>
                    <tr>
                        <td style={{ ...cellStyle, width: '30%', fontWeight: 'bold' }}>Título del Taller/Actividad:</td>
                        <td style={{ ...cellStyle, width: '70%', fontWeight: 'bold', fontSize: '11px' }}>{taller.nombre}</td>
                    </tr>
                    <tr>
                        <td style={{ ...cellStyle, fontWeight: 'bold' }}>Fecha:</td>
                        <td style={cellStyle}>{new Date(taller.fecha).toLocaleDateString('es-PE')}</td>
                    </tr>
                    <tr>
                        <td style={{ ...cellStyle, fontWeight: 'bold' }}>Lugar:</td>
                        <td style={cellStyle}>{taller.lugar}</td>
                    </tr>
                    <tr>
                        <td style={{ ...cellStyle, fontWeight: 'bold' }}>Dirigido a:</td>
                        <td style={{ ...cellStyle, padding: 0 }}>
                            <div style={{ display: 'flex', width: '100%' }}>
                                <div style={{ flex: 1, padding: '6px', borderRight: '1px solid black', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ border: '1px solid black', width: '20px', height: '15px', display: 'inline-block', textAlign: 'center', lineHeight: '15px' }}>
                                        {taller.dirigidoA === 'Niños y niñas' ? 'X' : ''}
                                    </span> NN
                                </div>
                                <div style={{ flex: 1, padding: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ border: '1px solid black', width: '20px', height: '15px', display: 'inline-block', textAlign: 'center', lineHeight: '15px' }}>
                                        {taller.dirigidoA === 'Adolescentes' ? 'X' : ''}
                                    </span> Adolescentes
                                </div>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        <th style={{ ...headerCellStyle, width: '6%' }}>N°</th>
                        <th style={{ ...headerCellStyle, width: '44%' }}>Nombres y Apellidos</th>
                        <th style={{ ...headerCellStyle, width: '10%' }}>Edad</th>
                        <th style={{ ...headerCellStyle, width: '6%' }}>H</th>
                        <th style={{ ...headerCellStyle, width: '6%' }}>M</th>
                        <th style={{ ...headerCellStyle, width: '28%' }}>Firma</th>
                    </tr>
                </thead>
                <tbody>
                    {displayRows.map((row, index) => {
                        const nna = row.nna || {};
                        const age = nna.fechaNacimiento ?
                            new Date().getFullYear() - new Date(nna.fechaNacimiento).getFullYear() : '';

                        return (
                            <tr key={index} style={{ height: '28px' }}>
                                <td style={{ ...cellStyle, textAlign: 'center' }}>{index + 1}</td>
                                <td style={cellStyle}>
                                    {nna.apellidoPaterno ? `${nna.apellidoPaterno} ${nna.apellidoMaterno}, ${nna.nombres}` : ''}
                                </td>
                                <td style={{ ...cellStyle, textAlign: 'center' }}>{age}</td>
                                <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 'bold' }}>{nna.sexo === 'M' ? 'X' : ''}</td>
                                <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 'bold' }}>{nna.sexo === 'F' ? 'X' : ''}</td>
                                <td style={cellStyle}></td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <div style={{ ...cellStyle, borderTop: 'none', fontStyle: 'italic', fontSize: '9px', color: '#666' }}>
                NOTA: El registro de asistencia es de uso transversal en todas las actividades grupales que se realicen.
            </div>

            {/* Signature */}
            <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ width: '250px', borderTop: '1px solid black', textAlign: 'center', paddingTop: '6px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold' }}>
                        Educadora / Educador Responsable
                    </div>
                    <div style={{ fontSize: '9px', marginTop: '4px' }}>
                        {taller.educadorResponsable?.nombreCompleto || '___________________________'}
                    </div>
                </div>
            </div>
        </div>
    );
};
