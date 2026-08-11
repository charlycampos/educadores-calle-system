/**
 * Informe Situacional: descarga del Word y archivo del informe firmado.
 *
 * El circuito real es: el educador llena el informe acá, descarga el Word, lo
 * firma, lo tramita por el SGD y vuelve a subir el documento firmado —o el
 * cargo de recepción del coordinador—. Ese firmado es el que tiene valor
 * oficial, así que se archiva como folio propio: no reemplaza al PDF que
 * genera el sistema, se suma. El expediente foliado no borra ni pisa nada.
 *
 * Cuando el informe cubre a varios hermanos, el archivo se sube una sola vez y
 * se folia en el expediente de cada uno, igual que las evidencias de talleres.
 */
import { useAuthStore } from '../store/auth.store';
import { EXPEDIENTE_API_URL } from '../config/api';
import { getDownloadToken } from '../utils/auth';
import { imagenAPdf } from './evidencias.api';

/** Máx. 30 caracteres: es el largo de EXP_FOLIO.TIPO_DOCUMENTO. */
export const TIPO_INFORME_FIRMADO = 'INFORME SITUACIONAL FIRMADO';

const authHeaders = () => ({
    Authorization: `Bearer ${useAuthStore.getState().token}`,
});

const jsonHeaders = () => ({
    ...authHeaders(),
    'Content-Type': 'application/json',
});

/**
 * Abre el Word en una pestaña nueva. El backend rechaza los borradores, así
 * que solo tiene sentido ofrecerlo con el informe finalizado.
 */
export const descargarWord = async (casoId: number, informeId?: number) => {
    const token = await getDownloadToken();
    const params = new URLSearchParams({ token });
    if (informeId) params.set('informe_id', String(informeId));
    window.open(
        `${EXPEDIENTE_API_URL}/informe-situacional/caso/${casoId}/word?${params}`,
        '_blank'
    );
};

export interface ResultadoInformeFirmado {
    archivados: number;
    paginas: number;
}

/**
 * Sube el informe firmado y lo folia en el expediente de cada NNA que cubre.
 *
 * `casos` son los casos destino. Se pasan desde afuera porque quien conoce a
 * los hermanos del informe es la pantalla, no esta capa.
 */
export const subirInformeFirmado = async (
    archivo: File,
    casos: number[],
    titulo: string
): Promise<ResultadoInformeFirmado> => {
    if (!casos.length) {
        throw new Error('El informe no tiene ningún caso asociado: no se puede archivar.');
    }

    // /expediente/upload valida los magic bytes y solo acepta PDF; una foto del
    // documento firmado es lo más común, así que se convierte antes.
    const pdf = archivo.type.startsWith('image/') ? await imagenAPdf(archivo) : archivo;

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

    await Promise.all(
        casos.map(casoId =>
            fetch(`${EXPEDIENTE_API_URL}/expediente/caso/${casoId}/folio`, {
                method: 'POST',
                headers: jsonHeaders(),
                body: JSON.stringify({
                    tipo_documento: TIPO_INFORME_FIRMADO,
                    titulo,
                    archivo_url: archivoUrl,
                    // Hojas reales contadas por pypdf: el expediente folia
                    // acumulándolas, y asumir 1 correría el resto del legajo.
                    paginas: metadata.pages || 1,
                }),
            })
        )
    );

    return { archivados: casos.length, paginas: metadata.pages || 1 };
};
