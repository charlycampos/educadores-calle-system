import React from 'react';
import { limpiarHtml, tieneContenido } from '../../../utils/texto-rico';

/**
 * Texto de un campo con formato dentro de la ficha impresa.
 *
 * Los campos largos se capturan con negrita, cursiva, subrayado y viñetas, y se
 * guardan como HTML; impresos como texto plano se verían las etiquetas. Si está
 * vacío se deja la línea en blanco para llenar a mano, como en el formato
 * oficial.
 */
const TextoRico = ({ html }: { html?: string }) =>
    tieneContenido(html || '')
        ? <span className="texto-rico" dangerouslySetInnerHTML={{ __html: limpiarHtml(html || '') }} />
        : <>____________________</>;

interface FirmaImpresa {
    imagen?: string;
    nombre?: string;
    fecha?: string;
}

interface Formato13Props {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nna: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ficha: any;
    id?: string;
    /** Firmas guardadas en `detalles`. Sin ellas el PDF sale sin firmar. */
    firmaEducador?: FirmaImpresa;
    firmaCoordinador?: FirmaImpresa;
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

export const Formato13Print = ({
    nna, ficha, id = 'formato-13-print', firmaEducador, firmaCoordinador,
}: Formato13Props) => {
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
    const fecNac = formatDate(ficha.fechaNacimiento || nna.fechaNacimiento);

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
                        <td style={styles.td} rowSpan={2}>{ficha.dni || nna.numeroDoc || nna.documento || ""}</td>
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
                            <Check checked={["M", "HOMBRE", "1", "MASCULINO"].includes(String(ficha.sexo || nna.sexo).toUpperCase())} />
                        </td>
                        <td style={styles.td}>
                            <Check checked={["F", "MUJER", "2", "FEMENINO"].includes(String(ficha.sexo || nna.sexo).toUpperCase())} />
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

            {/* Fase del servicio y defensa pública.
                Faltaban en el impreso pese a ser datos del formato oficial: la
                fase al egreso se capturaba y no salía en ninguna parte. */}
            <table style={styles.table}>
                <tbody>
                    <tr>
                        <td style={styles.th}>FASE DEL SERVICIO AL MOMENTO DEL EGRESO</td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>{ficha.faseAlEgreso || '—'}</td>
                        <td style={styles.th}>¿RECIBE DEFENSA PÚBLICA?</td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                            SI <Check checked={ficha.recibeDefensaPublica === 'SI'} />{' '}
                            NO <Check checked={ficha.recibeDefensaPublica === 'NO'} />
                        </td>
                    </tr>
                    {ficha.descripcionDefensa && (
                        <tr>
                            <td style={styles.th}>DESCRIPCIÓN</td>
                            <td style={styles.td} colSpan={3}>{ficha.descripcionDefensa}</td>
                        </tr>
                    )}
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
                        <td style={styles.th}>NO ubicado</td>
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
                        {/* Se leen los booleanos del formulario, no
                            `modalidadRetiro`: ese campo existía en la interfaz
                            pero ningún control lo escribía, así que TODO retiro
                            se imprimía con las casillas en blanco. Y faltaba la
                            columna "No ubicado". */}
                        <td style={{ ...styles.td, textAlign: 'center' }}><Check checked={ficha.interesSuperior} /></td>
                        <td style={{ ...styles.td, textAlign: 'center' }}><Check checked={ficha.noUbicado} /></td>
                        <td style={{ ...styles.td, textAlign: 'center' }}><Check checked={ficha.noDeseaParticipar} /></td>
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
                            Observaciones: <TextoRico html={ficha.observacionesDerivacion} />
                        </td>
                    </tr>
                    {/* Cada acción en su fila. Antes compartían una celda con
                        `||`, así que si había dos con texto solo se imprimía la
                        primera y el resto se perdía en el documento firmado. */}
                    {ficha.retiInterSuperiorAcciones && (
                        <tr>
                            <td style={styles.th}>INTERÉS SUPERIOR — ACCIONES</td>
                            <td style={styles.td} colSpan={2}>
                                <TextoRico html={ficha.retiInterSuperiorAcciones} />
                            </td>
                        </tr>
                    )}
                    {ficha.accionesBusqueda && (
                        <tr>
                            <td style={styles.th}>NO UBICADO — ACCIONES DE BÚSQUEDA</td>
                            <td style={styles.td} colSpan={2}>
                                <TextoRico html={ficha.accionesBusqueda} />
                            </td>
                        </tr>
                    )}
                    {ficha.motivoNoDesea && (
                        <tr>
                            <td style={styles.th}>NO DESEA PARTICIPAR — MOTIVO</td>
                            <td style={styles.td} colSpan={2}>
                                <TextoRico html={ficha.motivoNoDesea} />
                            </td>
                        </tr>
                    )}
                    {ficha.observacionesMayoriaEdad && (
                        <tr>
                            <td style={styles.th}>MAYORÍA DE EDAD — OBSERVACIONES</td>
                            <td style={styles.td} colSpan={2}>
                                <TextoRico html={ficha.observacionesMayoriaEdad} />
                            </td>
                        </tr>
                    )}
                    {/* Se capturaban y no salían en ninguna parte del impreso. */}
                    {ficha.observacionesLogros && (
                        <tr>
                            <td style={styles.th}>OBSERVACIONES DE LOGROS</td>
                            <td style={styles.td} colSpan={2}>
                                <TextoRico html={ficha.observacionesLogros} />
                            </td>
                        </tr>
                    )}
                    {ficha.derechosOtros && (
                        <tr>
                            <td style={styles.th}>OTROS DERECHOS RESTITUIDOS</td>
                            <td style={styles.td} colSpan={2}>{ficha.derechosOtros}</td>
                        </tr>
                    )}
                    {(ficha.interesSuperiorTrata || ficha.interesSuperiorDelincuencia || ficha.interesSuperiorOtro) && (
                        <tr>
                            <td style={styles.th}>INTERÉS SUPERIOR — DETALLE</td>
                            <td style={styles.td} colSpan={2}>
                                {ficha.interesSuperiorTrata && <><Check checked /> Trata de personas </>}
                                {ficha.interesSuperiorDelincuencia && <><Check checked /> Delincuencia </>}
                                {ficha.interesSuperiorOtro && <>Otro: {ficha.interesSuperiorOtro}</>}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Firmas.
                Se pintan las imágenes de quien firmó de verdad, tomadas de
                `detalles`. Antes el PDF salía siempre con las líneas en blanco
                y con nombres deducidos por heurística, así que el documento
                que se archivaba como firmado no tenía ninguna firma. */}
            <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-around' }}>
                <div style={{ textAlign: 'center', width: '220px' }}>
                    <div style={{ height: '70px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                        {firmaEducador?.imagen && (
                            <img src={firmaEducador.imagen} alt="" style={{ maxHeight: '68px', maxWidth: '200px' }} />
                        )}
                    </div>
                    <div style={{ borderTop: '1px solid #000', paddingTop: '4px' }}>
                        Firma del Educador/a <br />
                        Nombre: {firmaEducador?.nombre
                            || `${ficha.educadorNombres || ''} ${ficha.educadorApellidoPaterno || ''}`.trim()}<br />
                        DNI: {ficha.educadorDNI || '—'}
                        {firmaEducador?.fecha && (
                            <><br />Fecha: {firmaEducador.fecha.slice(0, 10).split('-').reverse().join('/')}</>
                        )}
                    </div>
                </div>
                <div style={{ textAlign: 'center', width: '220px' }}>
                    <div style={{ height: '70px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                        {firmaCoordinador?.imagen && (
                            <img src={firmaCoordinador.imagen} alt="" style={{ maxHeight: '68px', maxWidth: '200px' }} />
                        )}
                    </div>
                    <div style={{ borderTop: '1px solid #000', paddingTop: '4px' }}>
                        Firma del Coordinador/a <br />
                        Nombre: {firmaCoordinador?.nombre
                            || `${ficha.coordinadorNombres || ''} ${ficha.coordinadorApellidoPaterno || ''}`.trim()}<br />
                        DNI: {ficha.coordinadorDNI || '—'}
                        {firmaCoordinador?.fecha && (
                            <><br />Fecha: {firmaCoordinador.fecha.slice(0, 10).split('-').reverse().join('/')}</>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
};
