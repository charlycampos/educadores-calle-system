interface Formato11Props {
    taller: any;
    familiares?: any[];
    id?: string;
}

export const Formato11Print = ({ taller, id = 'formato-11-print' }: Formato11Props) => {
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

    // Crear filas vacías para registro manual de asistencia de padres/familiares
    const emptyRows = Array(15).fill(null);

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
                <div style={{ fontWeight: 'bold', fontSize: '12px' }}>FORMATO 11</div>
                <img src="/logo-mimp.png" alt="Logo MIMP" style={{ height: '40px' }} />
            </div>

            {/* Title Section */}
            <div style={{ border: '1.2px solid black', textAlign: 'center', marginBottom: '10px' }}>
                <div style={{ padding: '4px', fontWeight: 'bold', fontSize: '11px', borderBottom: '1.2px solid black' }}>FAMILIAS</div>
                <div style={{ padding: '8px', fontWeight: '900', fontSize: '13px', backgroundColor: '#f9fafb' }}>
                    REGISTRO DE ASISTENCIA DE ACTIVIDADES CON FAMILIAS
                </div>
            </div>

            {/* Info Section */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px' }}>
                <tbody>
                    <tr>
                        <td style={{ ...cellStyle, width: '30%', fontWeight: 'bold' }}>Título de la Actividad:</td>
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
                </tbody>
            </table>

            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        <th style={{ ...headerCellStyle, width: '6%' }}>N°</th>
                        <th style={{ ...headerCellStyle, width: '44%' }}>Nombres y Apellidos del Padre/Madre/Tutor</th>
                        <th style={{ ...headerCellStyle, width: '15%' }}>DNI</th>
                        <th style={{ ...headerCellStyle, width: '10%' }}>Parentesco</th>
                        <th style={{ ...headerCellStyle, width: '25%' }}>Firma</th>
                    </tr>
                </thead>
                <tbody>
                    {emptyRows.map((_, index) => (
                        <tr key={index} style={{ height: '28px' }}>
                            <td style={{ ...cellStyle, textAlign: 'center' }}>{index + 1}</td>
                            <td style={cellStyle}></td>
                            <td style={cellStyle}></td>
                            <td style={cellStyle}></td>
                            <td style={cellStyle}></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Footer */}
            <div style={{ ...cellStyle, borderTop: 'none', fontStyle: 'italic', padding: '10px' }}>
                NOTA: El registro de asistencia es de uso transversal en todas las actividades grupales que se realicen
            </div>

            <div className="flex mt-8">
                <div style={{ ...cellStyle, width: '35%', textAlign: 'center', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    Educadora / Educador:
                </div>
                <div style={{ ...cellStyle, width: '65%', height: '60px' }}>
                    <div className="mt-8 border-t border-black text-center pt-1 mx-auto w-64" style={{ fontSize: '9px' }}>
                        {taller.educadorResponsable?.nombreCompleto || '___________________________'}
                    </div>
                </div>
            </div>
        </div>
    );
};
