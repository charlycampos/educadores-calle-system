/**
 * Evidencias de taller: la lista de asistencia firmada y las fotos.
 *
 * No hay tabla propia. El archivo se sube UNA vez al repositorio del
 * expediente y luego se registra como folio en el expediente de cada
 * participante, marcado con TALLER_ID. El folio es la única fuente de
 * verdad; el taller solo lo consulta filtrando por ese campo.
 */
import { useAuthStore } from '../store/auth.store';
import { TALLERES_API_URL, EXPEDIENTE_API_URL } from '../config/api';

/** Tipos de documento. Máx. 30 caracteres: es el largo de EXP_FOLIO.TIPO_DOCUMENTO. */
export const TIPO_LISTA_NNA = 'FICHA ASISTENCIA NNA (F10)';
export const TIPO_LISTA_FAMILIAS = 'FICHA ASISTENCIA FAMILIA (F11)';
export const TIPO_FOTOS = 'FICHA EVIDENCIA TALLER';

export interface DestinoFolio {
    nnaId: number;
    nombre: string;
    /** Null si el NNA no tiene caso abierto: no se puede foliar. */
    casoId: number | null;
}

export interface FolioEvidencia {
    id: number;
    caso_id: number;
    numero_folio: number;
    tipo_documento: string;
    titulo: string;
    archivo_url: string;
    fecha_creacion: string | null;
    nombreResponsable?: string;
}

/** Una evidencia = un archivo, archivado en N expedientes. */
export interface EvidenciaAgrupada {
    archivoUrl: string;
    tipoDocumento: string;
    titulo: string;
    fecha: string | null;
    expedientes: number;
    responsable?: string;
}

const authHeaders = () => ({
    Authorization: `Bearer ${useAuthStore.getState().token}`,
});

const jsonHeaders = () => ({
    ...authHeaders(),
    'Content-Type': 'application/json',
});

export const getDestinosFolio = async (tallerId: number): Promise<DestinoFolio[]> => {
    const response = await fetch(`${TALLERES_API_URL}/talleres/${tallerId}/destinos-folio`, {
        headers: authHeaders(),
    });
    if (!response.ok) throw new Error('No se pudieron obtener los expedientes del taller');
    return response.json();
};

/** Folios ya archivados por este taller, agrupados por archivo. */
export const getEvidenciasTaller = async (tallerId: number): Promise<EvidenciaAgrupada[]> => {
    const response = await fetch(`${EXPEDIENTE_API_URL}/expediente/taller/${tallerId}`, {
        headers: authHeaders(),
    });
    if (!response.ok) throw new Error('No se pudieron cargar las evidencias');

    const folios: FolioEvidencia[] = await response.json();
    const porArchivo = new Map<string, EvidenciaAgrupada>();
    for (const f of folios) {
        const previo = porArchivo.get(f.archivo_url);
        if (previo) {
            previo.expedientes += 1;
        } else {
            porArchivo.set(f.archivo_url, {
                archivoUrl: f.archivo_url,
                tipoDocumento: f.tipo_documento,
                titulo: f.titulo,
                fecha: f.fecha_creacion,
                expedientes: 1,
                responsable: f.nombreResponsable,
            });
        }
    }
    return [...porArchivo.values()];
};

/**
 * Envuelve una imagen en un PDF de una página.
 *
 * /expediente/upload valida los magic bytes (%PDF-) y rechaza cualquier otra
 * cosa. Como el educador fotografía la lista con el celular, se convierte en
 * el navegador. De paso se reduce a 1600px, que baja el peso muy por debajo
 * del tope de 10 MB y ahorra datos móviles en campo.
 */
export const imagenAPdf = async (file: File): Promise<File> => {
    const { jsPDF } = await import('jspdf');

    const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
        reader.readAsDataURL(file);
    });

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('La imagen no se pudo procesar'));
        el.src = dataUrl;
    });

    const MAX_LADO = 1600;
    const escala = Math.min(1, MAX_LADO / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * escala);
    canvas.height = Math.round(img.height * escala);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const comprimida = canvas.toDataURL('image/jpeg', 0.8);

    // Página A4 con la imagen ajustada al ancho, manteniendo proporción.
    const pdf = new jsPDF('p', 'mm', 'a4');
    const anchoPagina = pdf.internal.pageSize.getWidth();
    const altoPagina = pdf.internal.pageSize.getHeight();
    const alto = Math.min((canvas.height * anchoPagina) / canvas.width, altoPagina);
    pdf.addImage(comprimida, 'JPEG', 0, 0, anchoPagina, alto, undefined, 'FAST');

    const blob = pdf.output('blob');
    const nombre = file.name.replace(/\.[^.]+$/, '') + '.pdf';
    return new File([blob], nombre, { type: 'application/pdf' });
};

export interface ResultadoSubida {
    archivados: number;
    sinCaso: string[];
    paginas: number;
}

/**
 * Sube la evidencia y la archiva en el expediente de cada participante.
 *
 * El archivo se sube una sola vez; después se crea un folio por expediente
 * apuntando a esa misma URL. Los NNA sin caso abierto se informan al llamador
 * en vez de fallar en silencio.
 */
export const subirEvidenciaTaller = async (
    tallerId: number,
    archivo: File,
    tipoDocumento: string,
    titulo: string
): Promise<ResultadoSubida> => {
    const esImagen = archivo.type.startsWith('image/');
    const pdf = esImagen ? await imagenAPdf(archivo) : archivo;

    const destinos = await getDestinosFolio(tallerId);
    if (destinos.length === 0) {
        throw new Error('El taller no tiene participantes: agrega al menos uno antes de subir evidencia.');
    }

    // 1. Subir el archivo una sola vez. El backend cuenta las páginas con
    //    pypdf; ese número alimenta el foliado del expediente.
    const formData = new FormData();
    formData.append('file', pdf);
    const upload = await fetch(`${EXPEDIENTE_API_URL}/expediente/upload`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
    });
    if (!upload.ok) {
        const err = await upload.json().catch(() => ({}));
        throw new Error(err.detail || 'No se pudo subir el archivo');
    }
    const metadata = await upload.json();
    const archivoUrl = `${EXPEDIENTE_API_URL}/expediente/documento/${metadata.filename}`;

    // 2. Un folio por expediente, todos apuntando al mismo archivo.
    const conCaso = destinos.filter(d => d.casoId !== null);
    const sinCaso = destinos.filter(d => d.casoId === null).map(d => d.nombre);

    await Promise.all(
        conCaso.map(d =>
            fetch(`${EXPEDIENTE_API_URL}/expediente/caso/${d.casoId}/folio`, {
                method: 'POST',
                headers: jsonHeaders(),
                body: JSON.stringify({
                    tipo_documento: tipoDocumento,
                    titulo,
                    archivo_url: archivoUrl,
                    taller_id: tallerId,
                    // Hojas reales contadas por pypdf: el expediente folia
                    // acumulándolas, y asumir 1 correría el resto del legajo.
                    paginas: metadata.pages || 1,
                }),
            })
        )
    );

    return {
        archivados: conCaso.length,
        sinCaso,
        paginas: metadata.pages || 1,
    };
};
