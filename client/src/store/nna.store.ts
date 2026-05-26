import { NNA_API_URL, DERIVACION_API_URL } from '../config/api';
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
    fetchAllNnas: () => Promise<void>;
    createNna: (data: any) => Promise<any>; // Changed to any to accept specific backend payload
    updateExpediente: (data: any) => Promise<void>;
    getNnaById: (id: number) => Promise<void>;
    fetchExpediente: (nnaId: number) => Promise<void>;
    getNextCarpetaCode: () => Promise<string>;
    createDerivacion: (data: any) => Promise<void>;
    saveFamiliares: (carpetaId: number, familiares: any[]) => Promise<void>;

    // Expediente Digital
    documents: any[];
    loadDocuments: (nnaId: number, nnaData: any) => void;
    registerDocument: (doc: any) => void;
}

export const useNnaStore = create<NnaState>((set, get) => ({
    nnas: [],
    selectedNna: null,
    isLoading: false,
    error: null,

    selectedExpediente: null,

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
                throw new Error(errorData.message || 'Error al crear NNA');
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
    loadDocuments: (nnaId: number, nnaData: any) => {
        const storedDocs = JSON.parse(localStorage.getItem(`expediente_docs_${nnaId}`) || '[]');

        const baseDocs = [];

        // 1. Ficha de Inscripción (F3): Es el único doc base que existe REALMENTE al existir el NNA
        if (nnaData) {
            baseDocs.push({
                id: `f3-${nnaId}`,
                nnaId,
                type: 'FICHA DE INSCRIPCIÓN (FORMATO 3)',
                // Usar ID real y Año real del registro
                code: `REG-${nnaData.createdAt ? new Date(nnaData.createdAt).getFullYear() : new Date().getFullYear()}-${String(nnaData.id).padStart(4, '0')}`,
                // Usar Fecha exacta de creación del registro en base de datos
                date: nnaData.createdAt || new Date().toISOString(),
                pages: 4,
                // Intentar obtener el responsable real del caso si está cargado
                user: nnaData.casos?.[0]?.responsable?.nombreCompleto || 'Registro Inicial',
                status: 'APROBADO'
            });
        }

        // NOTA: El Acta de Compromiso y RENIEC se agregarán dinámicamente cuando el usuario
        // genere el PDF o suba el archivo, no antes.

        set({ documents: [...baseDocs, ...storedDocs] });
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
    }
}));
