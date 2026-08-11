import { etiquetaParentesco } from '../../../utils/parentesco';
import { esHombre, esMujer, edadDe, marcaDirigido } from '../../../utils/formatos';

/**
 * Formato 11 — HERMANOS(AS)-PADRES/TUTORES · Registro de asistencia.
 *
 * Sigue el formato oficial impreso. Dos cosas a tener en cuenta:
 *
 * - Las columnas Edad, H y M salen vacías: `NNA_FAMILIAR` solo guarda nombres,
 *   parentesco, DNI y teléfono, porque el F03 no pregunta ni la edad ni el
 *   sexo del familiar. Se imprimen igual para que el educador las complete a
 *   mano, como viene haciendo en el papel.
 * - El oficial contempla que asistan **hermanos**, no solo adultos. Hoy la
 *   lista sale de los familiares del F03; un hermano que no esté registrado
 *   ahí se escribe en una de las filas en blanco.
 */

interface Formato11Props {
    taller: any;
    familiares?: any[];
    id?: string;
}

export const Formato11Print = ({ taller, familiares = [], id = 'formato-11-print' }: Formato11Props) => {
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
    } as const;

    const casilla = {
        border: '1px solid black',
        width: '20px',
        height: '15px',
        display: 'inline-block',
        textAlign: 'center' as const,
        lineHeight: '15px',
    } as const;

    // Los familiares inscritos vienen de la ficha F03 (NNA_FAMILIAR), por lo
    // que la lista sale impresa y el educador solo la hace firmar. Se completa
    // hasta 15 filas para dejar espacio a asistentes no previstos.
    const displayRows = [...familiares];
    while (displayRows.length < 15) {
        displayRows.push({ id: `empty-${displayRows.length}`, familiar: {} });
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
                <div style={{ fontWeight: 'bold', fontSize: '12px' }}>FORMATO 11</div>
                <img src="/logo-mimp.png" alt="Logo MIMP" style={{ height: '40px' }} />
            </div>

            <div style={{ border: '1.2px solid black', textAlign: 'center', marginBottom: '10px' }}>
                <div style={{ padding: '4px', fontWeight: 'bold', fontSize: '11px', borderBottom: '1.2px solid black' }}>
                    HERMANOS(AS)-PADRES/TUTORES
                </div>
                <div style={{ padding: '8px', fontWeight: '900', fontSize: '13px', backgroundColor: '#f9fafb' }}>
                    REGISTRO DE ASISTENCIA
                </div>
            </div>

            {/* Datos de la actividad */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px' }}>
                <tbody>
                    <tr>
                        <td style={{ ...cellStyle, width: '30%', fontWeight: 'bold' }}>Título del Taller/Actividad:</td>
                        <td style={{ ...cellStyle, width: '70%', fontWeight: 'bold', fontSize: '11px' }}>{taller.nombre}</td>
                    </tr>
                    <tr>
                        <td style={{ ...cellStyle, fontWeight: 'bold' }}>Fecha:</td>
                        <td style={cellStyle}>{taller.fecha ? new Date(taller.fecha).toLocaleDateString('es-PE') : ''}</td>
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
                                    <span style={casilla}>{marcaDirigido(taller.dirigidoA, 'HERMANOS') ? 'X' : ''}</span>
                                    Hermanos(as)
                                </div>
                                <div style={{ flex: 1, padding: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={casilla}>{marcaDirigido(taller.dirigidoA, 'FAMILIA') ? 'X' : ''}</span>
                                    Padre, Madre, Adulto responsable
                                </div>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Tabla de asistencia */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        <th style={{ ...headerCellStyle, width: '5%' }}>N°</th>
                        <th style={{ ...headerCellStyle, width: '30%' }}>Nombres y Apellidos</th>
                        <th style={{ ...headerCellStyle, width: '8%' }}>Edad</th>
                        <th style={{ ...headerCellStyle, width: '5%' }}>H</th>
                        <th style={{ ...headerCellStyle, width: '5%' }}>M</th>
                        <th style={{ ...headerCellStyle, width: '25%' }}>Nombre del Hijo/Hija y/o hermano(a)</th>
                        <th style={{ ...headerCellStyle, width: '22%' }}>Firma Padre/Madre Adulto responsable y/o</th>
                    </tr>
                </thead>
                <tbody>
                    {displayRows.map((row, index) => {
                        const familiar = row.familiar || {};
                        const parentesco = etiquetaParentesco(familiar.parentesco);
                        return (
                            <tr key={row.id ?? index} style={{ height: '28px' }}>
                                <td style={{ ...cellStyle, textAlign: 'center' }}>{index + 1}</td>
                                <td style={cellStyle}>
                                    {familiar.nombres || ''}
                                    {familiar.nombres && parentesco && (
                                        <span style={{ fontSize: '8px', color: '#555' }}> ({parentesco})</span>
                                    )}
                                </td>
                                <td style={{ ...cellStyle, textAlign: 'center' }}>{edadDe(familiar)}</td>
                                <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 'bold' }}>{esHombre(familiar.sexo) ? 'X' : ''}</td>
                                <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 'bold' }}>{esMujer(familiar.sexo) ? 'X' : ''}</td>
                                <td style={cellStyle}>{familiar.nnaRelacionado || ''}</td>
                                <td style={cellStyle}></td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <div style={{ ...cellStyle, borderTop: 'none', fontStyle: 'italic', fontSize: '9px' }}>
                NOTA: El registro de asistencia es de uso transversal en todas las actividades grupales que se realicen
            </div>

            {/* Firma del educador */}
            <div style={{ display: 'flex' }}>
                <div style={{ ...cellStyle, width: '35%', textAlign: 'center', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    Educadora / Educador:
                </div>
                <div style={{ ...cellStyle, width: '65%', height: '60px', position: 'relative' }}>
                    <div style={{ position: 'absolute', bottom: '6px', left: 0, right: 0, textAlign: 'center', fontSize: '9px' }}>
                        {taller.educadorResponsable?.nombreCompleto || ''}
                    </div>
                </div>
            </div>
        </div>
    );
};
