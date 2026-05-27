import { NNA_API_URL, DERIVACION_API_URL, EXPEDIENTE_API_URL } from '../config/api';
import { create } from 'zustand';
import { useAuthStore } from './auth.store';

interface Nna {
    id: number;
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    tipoDoc: string;
    numeroDoc: string | null;
    fechaNacimiento: string | null;
    sexo: string | null;
    nacionalidad: string;
    numeroExpediente: string | null; // Legacy
    codigoFicha03: string | null; // Nuevo Identificador F03-YYYY-NNNN
    caracteristicas: string | null;

    // Contacto y Domicilio
    domicilioActual: string | null;
    referenciaDomicilio: string | null;
    departamentoDom: string | null;
    provinciaDom: string | null;
    distritoDom: string | null;
    telefonoContacto: string | null;
    viveCon: string | null;
    detalleViveCon: string | null;
    lugarPernocte: string | null;
    detalleLugarPernocte: string | null;

    // Ubicación Nacimiento
    departamentoNac: string | null;
    provinciaNac: string | null;
    distritoNac: string | null;
    tienePartidaNacimiento: boolean;
    detalleSinDoc: string | null;

    // Familia (Legacy / Flattened)
    nombreTutor: string | null;
    tieneHermanos: boolean;
    cantHermanos: number;
    detallesHermanos: string | null;
    tieneAntecedenteAlbergue: boolean;
    detalleAntecedenteAlbergue: string | null;

    // Educación
    estudiaActualmente: boolean;
    detalleNoEstudia: string | null;
    nivelEducativo: string | null;
    gradoEstudio: string | null;
    institucionEducativa: string | null;
    modalidadEstudio: string | null;

    // Salud
    afiliadoSIS: string | null;
    afiliadoOtroSeguro: string | null;
    detalleOtroSeguro: string | null;
    sufreEnfermedad: string | null;
    detalleEnfermedad: string | null;
    observacionesSalud: string | null;
    seguroSalud: string | null; // Deprecated but might exist
    tieneDiscapacidad: boolean;
    tipoDiscapacidad: string | null;
    detalleDiscapacidad: string | null;

    // Tiempo Libre
    actividadesTiempoLibre: string | null;
    createdAt: string;
    updatedAt: string;
    edad: number | null;
    unidadEdad: string | null;

    // Socio-demográficas NNA SEC 2026
    lenMatNna?: string | null;
    lenMatEspNna?: string | null;
    autIdeEtNna?: string | null;
    autIdeEtEspNna?: string | null;
    certDiscapNna?: string | null;

    // Tutor / Apoderado SEC 2026
    tieneTutorApo?: number | null;
    priApeTutApo?: string | null;
    segApeTutApo?: string | null;
    nomApeTutApo?: string | null;
    sexoApo?: string | null;
    fechaNacApo?: string | null;
    nacionalidadApo?: string | null;
    tipDocTutApo?: string | null;
    nroDocTutApo?: string | null;
    vinTutUsu?: string | null;
    lenMatApo?: string | null;
    lenMatEspApo?: string | null;
    autIdeEtApo?: string | null;
    autIdeEtEspApo?: string | null;
    tipoDiscapApo?: string | null;
    certDiscapApo?: string | null;

    carpeta: { id: number; codigo: string; anio: number; correlativo: number; } | null;
    casos: any[];
}

interface NnaState {
    nnas: Nna[];
    selectedNna: Nna | null;
    isLoading: boolean;
    error: string | null;

    selectedExpediente: Nna[] | null; // Full family list
    parametros: Record<string, { value: string, label: string }[]> | null;
    fetchAllNnas: () => Promise<void>;
    createNna: (data: any) => Promise<any>; // Changed to any to accept specific backend payload
    updateExpediente: (data: any) => Promise<void>;
    getNnaById: (id: number) => Promise<void>;
    fetchExpediente: (nnaId: number) => Promise<void>;
    fetchParametros: () => Promise<void>;
    getNextCarpetaCode: () => Promise<string>;
    createDerivacion: (data: any) => Promise<void>;
    saveFamiliares: (carpetaId: number, familiares: any[]) => Promise<void>;
    checkNnaDuplicates: (params: { nombres?: string, apellidoPaterno?: string, apellidoMaterno?: string, numeroDoc?: string }) => Promise<any>;

    // Expediente Digital
    documents: any[];
    loadDocuments: (nnaId: number, nnaData: any) => Promise<void>;
    registerDocument: (doc: any) => void;
    uploadPhysicalDocument: (nnaId: number, file: File, docType: string) => Promise<any>;
    fetchNnaPdfBlob: (nnaId: number) => Promise<Blob>;
}

export const useNnaStore = create<NnaState>((set, get) => ({
    nnas: [],
    selectedNna: null,
    isLoading: false,
    error: null,

    selectedExpediente: null,
    parametros: null,

    fetchParametros: async () => {
        try {
            const token = useAuthStore.getState().token;
            const response = await fetch(`${NNA_API_URL}/nna/parametros`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Error al cargar parámetros');
            const data = await response.json();
            set({ parametros: data });
        } catch (err: any) {
            console.error('Error loading parametros:', err);
        }
    },

    fetchAllNnas: async () => {
        set({ isLoading: true, error: null });
        try {
            const token = useAuthStore.getState().token;
            const response = await fetch(`${NNA_API_URL}/nna`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Error al cargar NNAs');
            const data = await response.json();
            set({ nnas: data, isLoading: false });
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
        }
    },

    checkNnaDuplicates: async (params) => {
        try {
            const token = useAuthStore.getState().token;
            const queryParams = new URLSearchParams();
            if (params.nombres) queryParams.append('nombres', params.nombres);
            if (params.apellidoPaterno) queryParams.append('apellido_paterno', params.apellidoPaterno);
            if (params.apellidoMaterno) queryParams.append('apellido_materno', params.apellidoMaterno);
            if (params.numeroDoc) queryParams.append('numero_doc', params.numeroDoc);

            const response = await fetch(`${NNA_API_URL}/nna/buscar-duplicados?${queryParams.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Error al verificar duplicados');
            return await response.json();
        } catch (err: any) {
            console.error('Error en checkNnaDuplicates:', err);
            return { status: 'unique', message: 'Error de conexión', matches: [] };
        }
    },

    createNna: async (nnaData) => {
        set({ isLoading: true, error: null });
        try {
            const token = useAuthStore.getState().token;
            const response = await fetch(`${NNA_API_URL}/nna`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(nnaData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('[createNna] Error response:', JSON.stringify(errorData, null, 2));
                // Pydantic 422 errors come in errorData.detail as an array
                let msg = errorData.message || errorData.detail;
                if (Array.isArray(msg)) {
                    msg = msg.map((e: any) => `${e.loc?.join('.')}: ${e.msg}`).join(' | ');
                } else if (typeof msg === 'object') {
                    msg = JSON.stringify(msg);
                }
                throw new Error(msg || 'Error al crear NNA');
            }

            const result = await response.json();
            get().fetchAllNnas();
            set({ isLoading: false });
            return result; // retorna array [{nna, caso}] para que el caller obtenga carpetaId
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
            throw err;
        }
    },

    updateExpediente: async (nnaData) => {
        set({ isLoading: true, error: null });
        try {
            const token = useAuthStore.getState().token;
            // El endpoint es PUT /nna/{carpeta_id} — carpeta_id viene en el payload
            const carpetaId = nnaData.carpeta_id;
            if (!carpetaId) throw new Error('carpeta_id requerido para actualizar expediente');

            const response = await fetch(`${NNA_API_URL}/nna/${carpetaId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(nnaData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || errorData.message || 'Error al actualizar Expediente');
            }

            get().fetchAllNnas();
            get().fetchExpediente(carpetaId);
            set({ isLoading: false });
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
            throw err;
        }
    },

    saveFamiliares: async (carpetaId, familiares) => {
        const token = useAuthStore.getState().token;
        const response = await fetch(`${NNA_API_URL}/nna/${carpetaId}/familiares`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ familiares }),
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'Error al guardar familiares');
        }
    },

    getNnaById: async (id) => {
        set({ isLoading: true, error: null, selectedNna: null });
        try {
            const token = useAuthStore.getState().token;
            const response = await fetch(`${NNA_API_URL}/nna/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Error al obtener NNA');
            const data = await response.json();
            set({ selectedNna: data, isLoading: false });
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
        }
    },

    fetchExpediente: async (nnaId) => {
        set({ isLoading: true, error: null, selectedExpediente: null });
        try {
            const token = useAuthStore.getState().token;
            const response = await fetch(`${NNA_API_URL}/nna/${nnaId}/expediente`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Error al obtener Expediente Familiar');
            const data = await response.json(); // Should be array of NNAs
            set({ selectedExpediente: data, isLoading: false });
        } catch (err: any) {
            set({ error: err.message, isLoading: false });
        }
    },

    getNextCarpetaCode: async () => {
        try {
            const token = useAuthStore.getState().token;
            const response = await fetch(`${NNA_API_URL}/nna/next-code`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) return '...';
            const data = await response.json();
            return data.code;
        } catch (error) {
            console.error(error);
            return 'ERROR';
        }
    },

    createDerivacion: async (data: any) => {
        set({ isLoading: true, error: null });
        try {
            const token = useAuthStore.getState().token;
            // Backend: POST /api/derivaciones/interna o /externa según tipoDerivacion
            const tipo = (data.tipoDerivacion === 'EXTERNA') ? 'externa' : 'interna';

            // El backend Python usa snake_case: caso_id, destinatario_id, entidad_externa
            const payload = tipo === 'interna'
                ? {
                    caso_id:        data.casoId,
                    destinatario_id: Number(data.destinatarioId),
                    motivo:          data.motivo,
                }
                : {
                    caso_id:         data.casoId,
                    entidad_externa: data.entidadDestino,
                    motivo:          data.motivo,
                };

            const response = await fetch(`${DERIVACION_API_URL}/derivaciones/${tipo}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al crear derivación');
            }

            // Recargar lista para refrescar estados si es necesario
            get().fetchAllNnas();
            set({ isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    // --- EXPEDIENTE DIGITAL DOCUMENTOS (MOCK/LOCAL) ---
    documents: [],

    // Cargar documentos iniciales (mezcla mock + localStorage)
    loadDocuments: async (nnaId: number, nnaData: any) => {
        const storedDocs = JSON.parse(localStorage.getItem(`expediente_docs_${nnaId}`) || '[]');

        const baseDocs = [];

        // 1. Ficha de Inscripción (F3): Es el único doc base que existe REALMENTE al existir el NNA
        if (nnaData) {
            let realPages = 1; // Fallback seguro
            try {
                const token = useAuthStore.getState().token;
                const response = await fetch(`${NNA_API_URL}/nna/${nnaId}/pdf/pages`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    realPages = data.pages || 1;
                }
            } catch (err) {
                console.error("Error fetching F03 pdf page count:", err);
            }

            baseDocs.push({
                id: `f3-${nnaId}`,
                nnaId,
                type: 'FICHA DE INSCRIPCIÓN (FORMATO 3)',
                // Usar ID real y Año real del registro (priorizar codigoFicha03)
                code: nnaData.codigoFicha03 || nnaData.codigo_ficha03 || `REG-${nnaData.createdAt ? new Date(nnaData.createdAt).getFullYear() : new Date().getFullYear()}-${String(nnaData.id).padStart(4, '0')}`,
                // Usar Fecha exacta de creación del registro en base de datos
                date: nnaData.createdAt || new Date().toISOString(),
                pages: realPages,
                // Intentar obtener el responsable real del caso si está cargado
                nombreResponsable: nnaData.casos?.[0]?.responsableNombre || 'Registro Inicial',
                status: 'APROBADO'
            });
        }

        // 2. Cargar documentos físicos/subidos reales desde el microservicio expediente-service
        let backendDocs = [];
        const activeCase = nnaData?.casos?.find((c: any) => c.estado !== 'CERRADO') || nnaData?.casos?.[0];
        if (activeCase) {
            try {
                const token = useAuthStore.getState().token;
                const response = await fetch(`${EXPEDIENTE_API_URL}/expediente/caso/${activeCase.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const folios = await response.json();
                    backendDocs = folios.map((f: any) => {
                        return {
                            id: f.id,
                            nnaId,
                            type: f.tipo_documento || 'DOCUMENTO SUBIDO',
                            code: f.hash_documento ? f.hash_documento.toUpperCase() : `FOLIO-${f.numero_folio}`,
                            date: f.fecha_creacion || new Date().toISOString(),
                            pages: 1,
                            nombreResponsable: f.nombreResponsable || 'Usuario Autenticado',
                            filename: f.archivo_url.split('/').pop(),
                            status: 'APROBADO'
                        };
                    });
                }
            } catch (err) {
                console.error("Error fetching backend folios:", err);
            }
        }

        // Combinar con localStorage (evitando duplicar archivos si se subieron en esta sesión antes de refrescar)
        const combined = [...baseDocs, ...backendDocs];
        storedDocs.forEach((localDoc: any) => {
            if (!combined.some((d: any) => d.filename === localDoc.filename)) {
                combined.push(localDoc);
            }
        });

        set({ documents: combined });
    },

    registerDocument: (doc: any) => {
        const nnaId = doc.nnaId;
        const currentDocs = get().documents;
        const newDoc = {
            ...doc,
            id: Date.now(),
            date: new Date().toISOString(),
            status: doc.status || 'GENERADO'
        };

        const newDocsList = [...currentDocs, newDoc];
        set({ documents: newDocsList });

        // Persistir solo los nuevos agregados dinámicamente
        const storedDocs = JSON.parse(localStorage.getItem(`expediente_docs_${nnaId}`) || '[]');
        localStorage.setItem(`expediente_docs_${nnaId}`, JSON.stringify([...storedDocs, newDoc]));
    },

    uploadPhysicalDocument: async (nnaId: number, file: File, docType: string) => {
        const token = useAuthStore.getState().token;
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${EXPEDIENTE_API_URL}/expediente/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || 'Error al subir el archivo físico.');
        }

        const metadata = await response.json(); // {filename, original_name, pages, path}

        // Registrar el Folio en la base de datos si hay un caso activo
        const selectedNna = get().selectedNna;
        const activeCase = selectedNna?.casos?.find((c: any) => c.estado !== 'CERRADO') || selectedNna?.casos?.[0];
        
        if (activeCase) {
            try {
                const folioResponse = await fetch(`${EXPEDIENTE_API_URL}/expediente/caso/${activeCase.id}/folio`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        tipo_documento: docType.substring(0, 10).toUpperCase(),
                        titulo: file.name,
                        archivo_url: `${EXPEDIENTE_API_URL}/expediente/documento/${metadata.filename}`,
                        contenido_hash: metadata.filename.substring(0, 20)
                    })
                });
                if (folioResponse.ok) {
                    const savedFolio = await folioResponse.json();
                    console.log("Folio successfully persisted in DB:", savedFolio);
                }
            } catch (err) {
                console.error("Error persisting folio in DB:", err);
            }
        }

        // Registrar el documento recién creado en el store local para mantener persistencia visual inmediata
        const userPayload = useAuthStore.getState().user;
        const newDoc = {
            nnaId,
            type: docType,
            code: file.name.substring(0, 20).toUpperCase(),
            pages: metadata.pages,
            nombreResponsable: userPayload?.nombreCompleto || userPayload?.nombre || 'Usuario Autenticado',
            filename: metadata.filename,
            status: 'APROBADO'
        };

        get().registerDocument(newDoc);
        return metadata;
    },

    fetchNnaPdfBlob: async (nnaId) => {
        const token = useAuthStore.getState().token;
        const response = await fetch(`${NNA_API_URL}/nna/${nnaId}/pdf`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Error al generar o descargar el PDF');
        return await response.blob();
    }
}));
