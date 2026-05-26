interface Formato9Props {
    nna: any;
    id?: string;
}

export const Formato9Print = ({ nna, id = 'formato-9-print' }: Formato9Props) => {
    if (!nna) return null;

    const cellStyle = {
        border: '1px solid black',
        padding: '10px',
        fontSize: '11px',
        fontFamily: 'Arial, sans-serif'
    } as const;

    const labelStyle = {
        fontWeight: 'bold',
        fontSize: '11px',
        display: 'block',
        marginBottom: '2px'
    } as const;

    // Obtener datos del apoderado (del caso/familia si existen)
    const apoderado = nna.caso?.familiares?.find((f: any) => f.esApoderado) ||
        nna.caso?.familiares?.[0] || {};

    return (
        <div id={id} style={{
            width: '210mm',
            minHeight: '297mm',
            padding: '25mm',
            backgroundColor: 'white',
            color: 'black',
            boxSizing: 'border-box',
            fontFamily: 'Arial, sans-serif'
        }}>
            {/* Cabecera */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '12px' }}>FORMATO 9</div>
                <img src="/logo-mimp.png" alt="Logo MIMP/INABIF" style={{ height: '45px' }} />
            </div>

            <div style={{
                border: '1px solid black',
                textAlign: 'center',
                padding: '12px',
                fontWeight: 'bold',
                fontSize: '16px',
                backgroundColor: '#f9fafb',
                marginBottom: '20px'
            }}>
                ACTA DE COMPROMISO DEL NNA Y APODERADO/A
            </div>

            {/* Text Content */}
            <div style={{ ...cellStyle, borderTop: 'none', lineHeight: '1.6', textAlign: 'justify' }}>
                Puesto en conocimiento al NNA y sus familias los objetivos y bondades del Servicio Educadores de Calle INABIF
                dicha usuaria, usuario y/o adulto responsable, expresa su conformidad a través de su firma asumiendo los
                siguientes compromisos los cuales se darán de manera progresiva:
                <div className="mt-4 space-y-2">
                    <p>- Participación activa de los NNA y sus familias dentro del Servicio Educadores de Calle (talleres, salidas recreativas y culturales, etc.)</p>
                    <p>- Que su hijo, hija tenga una continuidad educativa, dé tiempo necesario para sus estudios y el cumplimiento de sus tareas, (según sea el caso).</p>
                    <p>- Disminución de horas y/o extinción progresiva de la situación de calle.</p>
                </div>
            </div>

            {/* User Signature Area */}
            <div className="flex" style={{ border: '1px solid black', borderTop: 'none' }}>
                <div style={{ flex: 1, padding: '20px', minHeight: '120px' }}></div>
                <div style={{ width: '120px', borderLeft: '1px solid black', padding: '10px', textAlign: 'center' }}>
                    <div style={{ height: '80px' }}></div>
                    <div style={{ fontSize: '9px', fontWeight: 'bold' }}>Huella Digital del Usuario@</div>
                </div>
            </div>

            <div style={{ ...cellStyle, borderTop: 'none' }}>
                <div className="grid grid-cols-3 gap-2">
                    <div style={labelStyle}>Firma:</div>
                    <div className="col-span-2 border-b border-black"></div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4">
                    <div style={labelStyle}>Nombre y Apellidos Completos de la niña, niño o adolescente:</div>
                    <div className="col-span-2 font-bold text-sm uppercase">
                        {nna.apellidoPaterno} {nna.apellidoMaterno}, {nna.nombres}
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4">
                    <div style={labelStyle}>DNI:</div>
                    <div className="col-span-2 font-bold">{nna.numeroDoc || '________________'}</div>
                </div>
            </div>

            {/* Parent Signature Area */}
            <div className="flex mt-8" style={{ border: '1px solid black' }}>
                <div style={{ flex: 1, padding: '20px', minHeight: '120px' }}></div>
                <div style={{ width: '120px', borderLeft: '1px solid black', padding: '10px', textAlign: 'center' }}>
                    <div style={{ height: '80px' }}></div>
                    <div style={{ fontSize: '9px', fontWeight: 'bold' }}>Huella Digital del Padre o Madre o Tutor</div>
                </div>
            </div>

            <div style={{ ...cellStyle, borderTop: 'none' }}>
                <div className="grid grid-cols-3 gap-2">
                    <div style={labelStyle}>Firma:</div>
                    <div className="col-span-2 border-b border-black"></div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4">
                    <div style={labelStyle}>Nombre y Apellidos Completos del Padre, Madre o Tutor:</div>
                    <div className="col-span-2 font-bold text-sm uppercase">
                        {apoderado.nombreCompleto || '________________________________________________'}
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4">
                    <div style={labelStyle}>DNI:</div>
                    <div className="col-span-2 font-bold">{apoderado.numeroDoc || '________________'}</div>
                </div>
            </div>
        </div>
    );
};
