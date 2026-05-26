import React from 'react';

interface Formato12Props {
    nna: any;
    ficha: {
        zona?: string;
        entrevistado?: string;
        parentesco?: string;
        lugarSeguimiento?: 'DOMICILIO' | 'TRABAJO' | 'CENTRO_REFERENCIA' | 'CALLE';
        direccion?: string;
        fecha?: string;
        hora?: string;
        telefono?: string;
        referencia?: string;
        antecedentes?: string;
        descripcion?: string;
        resultados?: string;
        observaciones?: string;
        nombreEntrevistado?: string;
        nombreUsuario?: string;
        nombreEducador?: string;
    };
    id?: string;
}

export const Formato12Print = ({ nna, ficha, id = 'formato-12-print' }: Formato12Props) => {
    const styles = {
        page: {
            width: '210mm',
            minHeight: '297mm',
            padding: '15mm',
            backgroundColor: 'white',
            color: 'black',
            fontFamily: 'Arial, sans-serif',
            fontSize: '10pt',
            boxSizing: 'border-box' as const,
            position: 'relative' as const
        },
        header: {
            textAlign: 'center' as const,
            marginBottom: '10px',
            borderBottom: '2px solid #000',
            paddingBottom: '8px'
        },
        title: {
            fontSize: '11pt',
            fontWeight: 'bold' as const,
            margin: '0'
        },
        subtitle: {
            fontSize: '9pt',
            margin: '3px 0 0 0'
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse' as const,
            marginBottom: '8px',
            border: '1px solid #000'
        },
        th: {
            border: '1px solid #000',
            padding: '4px',
            backgroundColor: '#e0e0e0',
            fontWeight: 'bold' as const,
            fontSize: '9pt',
            textAlign: 'left' as const
        },
        td: {
            border: '1px solid #000',
            padding: '4px',
            fontSize: '9pt'
        },
        label: {
            fontWeight: 'bold' as const,
            fontSize: '9pt'
        },
        sectionTitle: {
            backgroundColor: '#d0d0d0',
            padding: '4px',
            fontWeight: 'bold' as const,
            border: '1px solid #000',
            marginTop: '8px',
            fontSize: '9pt'
        },
        textarea: {
            minHeight: '60px',
            padding: '4px',
            fontSize: '9pt',
            border: '1px solid #000',
            width: '100%',
            boxSizing: 'border-box' as const
        },
        signatureSection: {
            marginTop: '20px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '10px'
        },
        signatureBox: {
            textAlign: 'center' as const,
            borderTop: '1px solid #000',
            paddingTop: '4px',
            marginTop: '40px'
        }
    };

    const lugarText = {
        'DOMICILIO': '☑ Domicilio  ☐ Trabajo  ☐ Centro de referencia  ☐ Calle',
        'TRABAJO': '☐ Domicilio  ☑ Trabajo  ☐ Centro de referencia  ☐ Calle',
        'CENTRO_REFERENCIA': '☐ Domicilio  ☐ Trabajo  ☑ Centro de referencia  ☐ Calle',
        'CALLE': '☐ Domicilio  ☐ Trabajo  ☐ Centro de referencia  ☑ Calle'
    };

    return (
        <div id={id} style={styles.page}>
            {/* Header */}
            <div style={styles.header}>
                <p style={styles.title}>FORMATO 12</p>
                <p style={styles.subtitle}>FICHA DE SEGUIMIENTO FAMILIAR - CONSEJERÍA</p>
            </div>

            {/* Datos Generales */}
            <table style={styles.table}>
                <tbody>
                    <tr>
                        <td style={{ ...styles.td, ...styles.label, width: '30%' }}>Zona de Intervención</td>
                        <td style={styles.td} colSpan={3}>{ficha.zona || ''}</td>
                    </tr>
                    <tr>
                        <td style={{ ...styles.td, ...styles.label }}>Nombre del NNA</td>
                        <td style={styles.td} colSpan={3}>
                            {nna?.nombres} {nna?.apellidoPaterno} {nna?.apellidoMaterno}
                        </td>
                    </tr>
                    <tr>
                        <td style={{ ...styles.td, ...styles.label }}>Nombre del Entrevistado</td>
                        <td style={styles.td}>{ficha.entrevistado || ''}</td>
                        <td style={{ ...styles.td, ...styles.label, width: '15%' }}>Parentesco</td>
                        <td style={styles.td}>{ficha.parentesco || ''}</td>
                    </tr>
                    <tr>
                        <td style={{ ...styles.td, ...styles.label }}>Lugar de Seguimiento</td>
                        <td style={styles.td} colSpan={3}>
                            {lugarText[ficha.lugarSeguimiento || 'DOMICILIO']}
                        </td>
                    </tr>
                    <tr>
                        <td style={{ ...styles.td, ...styles.label }}>Dirección</td>
                        <td style={styles.td}>{ficha.direccion || ''}</td>
                        <td style={{ ...styles.td, ...styles.label }}>Fecha</td>
                        <td style={styles.td}>{ficha.fecha || new Date().toLocaleDateString('es-PE')}</td>
                    </tr>
                    <tr>
                        <td style={{ ...styles.td, ...styles.label }}>Hora</td>
                        <td style={styles.td}>{ficha.hora || ''}</td>
                        <td style={{ ...styles.td, ...styles.label }}>Teléfono</td>
                        <td style={styles.td}>{ficha.telefono || ''}</td>
                    </tr>
                </tbody>
            </table>

            {/* Referencia */}
            <div style={styles.sectionTitle}>Referencia</div>
            <table style={styles.table}>
                <tbody>
                    <tr>
                        <td style={{ ...styles.td, ...styles.label }}>Antecedentes o motivo</td>
                    </tr>
                    <tr>
                        <td style={styles.td}>
                            <div style={{ minHeight: '50px' }}>{ficha.antecedentes || ''}</div>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Descripción */}
            <div style={styles.sectionTitle}>Descripción</div>
            <table style={styles.table}>
                <tbody>
                    <tr>
                        <td style={styles.td}>
                            <div style={{ minHeight: '80px' }}>{ficha.descripcion || ''}</div>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Resultados / Compromiso */}
            <div style={styles.sectionTitle}>Resultados / Compromiso</div>
            <table style={styles.table}>
                <tbody>
                    <tr>
                        <td style={styles.td}>
                            <div style={{ minHeight: '60px' }}>{ficha.resultados || ''}</div>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Observaciones */}
            <div style={styles.sectionTitle}>Observaciones</div>
            <table style={styles.table}>
                <tbody>
                    <tr>
                        <td style={styles.td}>
                            <div style={{ minHeight: '50px' }}>{ficha.observaciones || ''}</div>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Nota */}
            <div style={{ fontSize: '8pt', fontStyle: 'italic', marginTop: '8px', marginBottom: '10px' }}>
                Nota: ficha aplicada en el desarrollo estructurado de consejería a la familia/tutor del usuario/a del servicio
            </div>

            {/* Firmas */}
            <div style={styles.signatureSection}>
                <div>
                    <div style={styles.signatureBox}>
                        <div style={{ fontSize: '8pt', fontWeight: 'bold' }}>
                            Nombre y firma del entrevistado
                        </div>
                        <div style={{ fontSize: '8pt', marginTop: '4px' }}>{ficha.nombreEntrevistado || ''}</div>
                    </div>
                </div>
                <div>
                    <div style={styles.signatureBox}>
                        <div style={{ fontSize: '8pt', fontWeight: 'bold' }}>
                            Nombre y firma del usuario/a
                        </div>
                        <div style={{ fontSize: '8pt', marginTop: '4px' }}>
                            {ficha.nombreUsuario || `${nna?.nombres} ${nna?.apellidoPaterno}`}
                        </div>
                    </div>
                </div>
                <div>
                    <div style={styles.signatureBox}>
                        <div style={{ fontSize: '8pt', fontWeight: 'bold' }}>
                            Nombre y firma del / la educador/a
                        </div>
                        <div style={{ fontSize: '8pt', marginTop: '4px' }}>{ficha.nombreEducador || ''}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
