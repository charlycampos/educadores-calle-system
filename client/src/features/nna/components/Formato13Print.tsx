import React from 'react';

interface Formato13Props {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nna: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ficha: any;
    id?: string;
}

const styles = {
    page: {
        width: '210mm',
        minHeight: '297mm',
        padding: '15mm',
        backgroundColor: 'white',
        color: 'black',
        fontFamily: 'Arial, sans-serif',
        fontSize: '8pt',
        boxSizing: 'border-box' as const,
        position: 'relative' as const
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px',
        borderBottom: '1px solid #000'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse' as const,
        marginBottom: '5px',
        border: '1px solid #000'
    },
    th: {
        border: '1px solid #000',
        padding: '2px 4px',
        backgroundColor: '#f0f0f0',
        fontWeight: 'bold' as const,
        textAlign: 'center' as const,
        fontSize: '7pt'
    },
    td: {
        border: '1px solid #000',
        padding: '2px 4px',
        fontSize: '8pt'
    },
    sectionTitle: {
        backgroundColor: '#e0e0e0',
        fontWeight: 'bold' as const,
        padding: '2px',
        border: '1px solid #000',
        fontSize: '8pt'
    },
    checkbox: {
        width: '12px',
        height: '12px',
        display: 'inline-block',
        border: '1px solid #000',
        textAlign: 'center' as const,
        lineHeight: '10px',
        fontSize: '10px',
        marginRight: '4px'
    }
};

const Check = ({ checked }: { checked?: boolean }) => (
    <span style={styles.checkbox}>{checked ? 'X' : ''}</span>
);

export const Formato13Print = ({ nna, ficha, id = 'formato-13-print' }: Formato13Props) => {
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return { d: '', m: '', a: '' };
        const d = new Date(dateStr);
        return {
            d: d.getDate().toString().padStart(2, '0'),
            m: (d.getMonth() + 1).toString().padStart(2, '0'),
            a: d.getFullYear().toString()
        };
    };

    const fecIngreso = formatDate(ficha.fechaIngreso);
    const fecEgreso = formatDate(ficha.fechaEgreso);
    const fecNac = formatDate(nna.fechaNacimiento);

    return (
        <div id={id} style={styles.page}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '10pt' }}>FORMATO 13</div>
                <div style={{ fontWeight: 'bold' }}>FICHA DE EGRESO/RETIRO USUARIO/A DEL SERVICIO DE EDUCADORES DE CALLE - INABIF</div>
            </div>

            {/* Datos Generales */}
            <div style={styles.sectionTitle}>DATOS GENERALES DEL NNA</div>
            <table style={styles.table}>
                <tbody>
                    <tr>
                        <td style={styles.th} colSpan={4}>APELLIDOS Y NOMBRES DEL USUARIO/A</td>
                        <td style={styles.td} colSpan={10}>
                            {nna.apellidoPaterno} {nna.apellidoMaterno} {nna.nombres}
                        </td>
                    </tr>
                    <tr>
                        <td style={styles.th} rowSpan={2}>FECHA DE NACIMIENTO</td>
                        <td style={styles.th}>DD</td>
                        <td style={styles.th}>MM</td>
                        <td style={styles.th}>AA</td>
                        <td style={styles.th} rowSpan={2}>DNI</td>
                        <td style={styles.td} rowSpan={2}>{nna.numeroDoc || nna.documento || ""}</td>
                        <td style={styles.th} colSpan={2}>SEXO</td>
                        <td style={styles.th} colSpan={4}>CUENTA CON SEGURO DE SALUD</td>
                    </tr>
                    <tr>
                        <td style={styles.td}>{fecNac.d}</td>
                        <td style={styles.td}>{fecNac.m}</td>
                        <td style={styles.td}>{fecNac.a}</td>
                        <td style={styles.th}>M</td>
                        <td style={styles.th}>F</td>
                        <td style={styles.th}>NO</td>
                        <td style={styles.th}>SIS</td>
                        <td style={styles.th}>ESSALUD</td>
                        <td style={styles.th}>OTRO</td>
                    </tr>
                    <tr>
                        <td style={{ ...styles.td, textAlign: 'center' }} colSpan={4}>---</td>
                        <td style={styles.td} colSpan={2}></td>
                        <td style={styles.td}>
                            <Check checked={["M", "HOMBRE", "1", "MASCULINO"].includes(String(nna.sexo).toUpperCase())} />
                        </td>
                        <td style={styles.td}>
                            <Check checked={["F", "MUJER", "2", "FEMENINO"].includes(String(nna.sexo).toUpperCase())} />
                        </td>
                        <td style={styles.td}><Check checked={ficha.seguroSalud === "NO" || !ficha.seguroSalud} /></td>
                        <td style={styles.td}><Check checked={ficha.seguroSalud === "SIS"} /></td>
                        <td style={styles.td}><Check checked={ficha.seguroSalud === "ESSALUD"} /></td>
                        <td style={styles.td}><Check checked={ficha.seguroSalud === "OTRO"} /></td>
                    </tr>
                </tbody>
            </table>

            {/* Perfil y Fechas */}
            <table style={styles.table}>
                <tbody>
                    <tr>
                        <td style={styles.th} rowSpan={3}>PERFIL DEL USUARIO/A</td>
                        <td style={styles.th} rowSpan={2}>Trabajo Infantil</td>
                        <td style={styles.th} rowSpan={2}>Mendicidad</td>
                        <td style={styles.th} colSpan={2}>Vida en calle</td>
                        <td style={styles.th} rowSpan={2} width="20%">FECHA DE INGRESO AL SERVICIO</td>
                        <td style={styles.th}>DD</td>
                        <td style={styles.th}>MM</td>
                        <td style={styles.th}>AA</td>
                    </tr>
                    <tr>
                        <td style={styles.th}>Tránsito</td>
                        <td style={styles.th}>Con vivencia</td>
                        <td style={styles.td}>{fecIngreso.d}</td>
                        <td style={styles.td}>{fecIngreso.m}</td>
                        <td style={styles.td}>{fecIngreso.a}</td>
                    </tr>
                    <tr>
                        <td style={{ ...styles.td, textAlign: 'center' }}><Check checked={ficha.trabajoInfantil} /></td>
                        <td style={{ ...styles.td, textAlign: 'center' }}><Check checked={ficha.mendicidad} /></td>
                        <td style={{ ...styles.td, textAlign: 'center' }}><Check checked={ficha.vidaCalleTransito} /></td>
                        <td style={{ ...styles.td, textAlign: 'center' }}><Check checked={ficha.vidaCalleConVivienda} /></td>
                        <td style={styles.th}>FECHA DE EGRESO DEL SERVICIO</td>
                        <td style={styles.td}>{fecEgreso.d}</td>
                        <td style={styles.td}>{fecEgreso.m}</td>
                        <td style={styles.td}>{fecEgreso.a}</td>
                    </tr>
                </tbody>
            </table>

            {/* Modalidad de Egreso */}
            <table style={styles.table}>
                <tbody>
                    <tr>
                        <td style={styles.th}>MODALIDAD DE EGRESO</td>
                        <td style={styles.th}>CUMPLIO FASES</td>
                        <td style={styles.th}>MAYORIA DE EDAD</td>
                        <td style={styles.th}>DERIVACIÓN SERVICIOS COMPLEMENTARIOS</td>
                        <td style={styles.th}>MODALIDAD DE RETIRO</td>
                        <td style={styles.th}>Interés superior del NNA</td>
                        <td style={styles.th}>NO desea participar</td>
                        <td style={styles.th}>CUENTA CON RESOLUCIÓN UPE</td>
                        <td style={styles.th}>SITUACIÓN DE RESOLUCIÓN UPE</td>
                    </tr>
                    <tr>
                        <td style={{ ...styles.td, textAlign: 'center' }}>Marcar con X</td>
                        <td style={{ ...styles.td, textAlign: 'center' }}><Check checked={ficha.cumplioFases} /></td>
                        <td style={{ ...styles.td, textAlign: 'center' }}><Check checked={ficha.mayoriaEdad} /></td>
                        <td style={{ ...styles.td, textAlign: 'center' }}><Check checked={ficha.derivacionServicios} /></td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>--</td>
                        <td style={{ ...styles.td, textAlign: 'center' }}><Check checked={ficha.modalidadRetiro === 'INTERES_SUPERIOR'} /></td>
                        <td style={{ ...styles.td, textAlign: 'center' }}><Check checked={ficha.modalidadRetiro === 'NO_DESEA'} /></td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                            SI <Check checked={ficha.cuentaResolucionUPE === 'SI'} /> NO <Check checked={ficha.cuentaResolucionUPE === 'NO'} />
                        </td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                            SI <Check checked={ficha.situacionResolucionUPE === 'SI'} /> NO <Check checked={ficha.situacionResolucionUPE === 'NO'} />
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Logros */}
            <div style={styles.sectionTitle}>LOGROS CUMPLIDOS</div>
            <table style={styles.table}>
                <tbody>
                    {[
                        "Niñas, niños y adolescentes dejan la situación de calle ejerciendo permanentemente sus derechos.",
                        "Las niñas, niños y adolescentes desarrollan capacidades de autoprotección y habilidades para la vida.",
                        "Las niñas, niños y adolescentes hacen uso de programas y servicios que restituyen el ejercicio de sus derechos.",
                        "Persona adulta responsable presenta capacidades para garantizar la protección integral.",
                        "Las/os NNA presentan y desarrollan sus proyectos de vida.",
                        "Padres, madres o tutor cuenta con herramientas para asumir el cuidado."
                    ].map((logro, i) => (
                        <tr key={i}>
                            <td style={{ ...styles.td, textAlign: 'center', width: '30px' }}>{i + 1}</td>
                            <td style={styles.td}>{logro}</td>
                            <td style={{ ...styles.td, textAlign: 'center', width: '50px' }}>
                                <Check checked={ficha.logros?.[i + 1]} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Observaciones Específicas */}
            <table style={styles.table}>
                <tbody>
                    <tr>
                        <td style={styles.th} width="20%">EGRESO MAYORIA DE EDAD</td>
                        <td style={styles.td} colSpan={2}>
                            <div style={{ fontSize: '7pt' }}>
                                DERECHOS RESTITUIDOS (Marcar):<br />
                                <Check checked={ficha.derechosIdentidad} /> IDENTIDAD
                                <Check checked={ficha.derechosSalud} /> SALUD
                                <Check checked={ficha.derechosEducacion} /> EDUCACIÓN
                                <Check checked={ficha.derechosRecreacion} /> RECREACIÓN
                                <br />
                                ¿SE ENTREGA DIRECTORIO? SI <Check checked={ficha.entregaDirectorio === 'SI'} /> NO <Check checked={ficha.entregaDirectorio === 'NO'} />
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style={styles.th}>EGRESO CON DERIVACIÓN</td>
                        <td style={styles.td} colSpan={2}>
                            Institución: {ficha.institucionDerivada || '____________________'} <br />
                            Observaciones: {ficha.observacionesDerivacion || '____________________'}
                        </td>
                    </tr>
                    <tr>
                        <td style={styles.th}>NO UBICADO / RETIRO</td>
                        <td style={styles.td} colSpan={2}>
                            Acciones Realizadas: {ficha.accionesBusqueda || ficha.retiInterSuperiorAcciones || ficha.motivoNoDesea || '____________________'}
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Firmas */}
            <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-around' }}>
                <div style={{ textAlign: 'center', borderTop: '1px solid #000', width: '200px' }}>
                    Firma del Educador/a <br />
                    Nombre: {ficha.educadorNombres} {ficha.educadorApellidoPaterno}<br />
                    DNI: {ficha.educadorDNI}
                </div>
                <div style={{ textAlign: 'center', borderTop: '1px solid #000', width: '200px' }}>
                    Firma del Coordinador/a <br />
                    Nombre: {ficha.coordinadorNombres} {ficha.coordinadorApellidoPaterno}<br />
                    DNI: {ficha.coordinadorDNI}
                </div>
            </div>

        </div>
    );
};
