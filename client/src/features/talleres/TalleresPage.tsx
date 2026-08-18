import { useState, useEffect, useRef, Fragment } from 'react';
import { useSearchParams } from 'react-router-dom';
import { confirmar } from '../../components/ui/ConfirmDialog';
import { toast } from '../../components/ui/Toast';
import { CampoDictado } from '../../components/ui/CampoDictado';
import {
    Presentation, Plus, X, Edit, LayoutGrid, List as ListIcon,
    Calendar as CalendarIcon, Clock, Users, MapPin, CheckCircle2,
    Save, BookOpen, AlertTriangle, Lightbulb, StickyNote,
    FileDown, Loader2, ListChecks, Check, ChevronDown, Upload,
    FileText, ClipboardCheck, Search
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
    getTalleres, createTaller, updateTaller,
    updateParticipante, removeParticipante, getTallerById,
    getCandidatos, addParticipantesBulk, updateFamiliar, removeFamiliar,
    guardarEvaluacionTaller, igualarEvaluaciones
} from '../../api/talleres.api';
import type { Taller, ParticipanteTaller, NnaCandidato } from '../../api/talleres.api';
import { useNnaStore } from '../../store/nna.store';
import { WorkshopCalendar } from './components/WorkshopCalendar';
import { Formato7Print } from '../nna/components/Formato7Print';
import { Formato10Print } from '../nna/components/Formato10Print';
import { Formato11Print } from '../nna/components/Formato11Print';
import { Button } from '../../components/ui/Button';
import { etiquetaParentesco } from '../../utils/parentesco';
import {
    subirEvidenciaTaller, getEvidenciasTaller,
    TIPO_LISTA_NNA, TIPO_LISTA_FAMILIAS, TIPO_FOTOS
} from '../../api/evidencias.api';
import type { EvidenciaAgrupada } from '../../api/evidencias.api';

export const TalleresPage = () => {
    const [talleres, setTalleres] = useState<Taller[]>([]);

    /**
     * Taller que llega señalado por la URL (`/talleres?tallerId=N`).
     *
     * Lo usa el bloque "Hoy" del tablero: en vez de soltar al educador en la
     * lista completa, la vista baja hasta ese taller y lo resalta.
     */
    const [searchParamsTalleres] = useSearchParams();
    const tallerDestacado = Number(searchParamsTalleres.get('tallerId')) || null;

    useEffect(() => {
        if (!tallerDestacado || talleres.length === 0) return;
        // Tras el render de las tarjetas: sin la espera, el nodo aún no existe.
        const t = setTimeout(() => {
            document.getElementById(`taller-${tallerDestacado}`)
                ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
        return () => clearTimeout(t);
    }, [tallerDestacado, talleres.length]);
    const [loading, setLoading] = useState(false);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [currentTaller, setCurrentTaller] = useState<Partial<Taller> | null>(null);
    /**
     * Tres fichas, no dos pestañas de un mismo trámite.
     *
     * El F07 y el F08 son formatos oficiales distintos, cada uno con su
     * impreso, y ocurren en momentos separados: uno antes del taller y otro
     * después. En medio va el registro de asistencia (F10/F11), que es lo del
     * día. Tenerlos todos en una sola pantalla era lo que hacía sentir el
     * módulo amontonado.
     */
    const [activeTab, setActiveTab] = useState<'planificacion' | 'ejecucion' | 'evaluacion'>('planificacion');

    // Evaluación del taller (F08). Se escribe una vez y la heredan todos los
    // participantes que no tengan una propia.
    const [evalTaller, setEvalTaller] = useState({ logros: '', limitaciones: '', sugerencias: '' });
    const [guardandoEval, setGuardandoEval] = useState(false);

    // Filtros del listado.
    const [busqueda, setBusqueda] = useState('');
    const [educadorFiltro, setEducadorFiltro] = useState('TODOS');
    const [estadoFiltro, setEstadoFiltro] = useState('TODOS');
    // El listado es la vista por defecto: al entrar, lo primero que se busca es
    // qué talleres hay. El calendario sirve para programar, que es un momento
    // posterior y se elige a propósito.
    const [viewMode, setViewMode] = useState<'lista' | 'calendario'>('lista');
    const [evaluatingParticipantId, setEvaluatingParticipantId] = useState<number | null>(null);
    // Selector único: NNA (F10) y sus padres/tutores (F11) en una sola lista.
    // Todos los nombres vienen de la base; el educador solo marca.
    const [showSelector, setShowSelector] = useState(false);
    const [candidatos, setCandidatos] = useState<NnaCandidato[]>([]);
    const [selectedNnaIds, setSelectedNnaIds] = useState<Set<number>>(new Set());
    const [selectedFamiliarIds, setSelectedFamiliarIds] = useState<Set<number>>(new Set());
    const [selectorSearch, setSelectorSearch] = useState('');
    const [selectorFiltro, setSelectorFiltro] = useState<'TODOS' | 'NNA' | 'FAMILIAS'>('TODOS');
    // Acordeón: la lista arranca mostrando solo NNA; la familia se abre al tocar la fila.
    const [expandidos, setExpandidos] = useState<Set<number>>(new Set());
    const [isLoadingCandidatos, setIsLoadingCandidatos] = useState(false);
    const [isAddingBulk, setIsAddingBulk] = useState(false);

    // Evidencias: la lista firmada y las fotos, archivadas como folios en el
    // expediente de cada participante.
    const [evidencias, setEvidencias] = useState<EvidenciaAgrupada[]>([]);
    const [subiendoEvidencia, setSubiendoEvidencia] = useState(false);
    const [tipoEvidenciaActivo, setTipoEvidenciaActivo] = useState<string | null>(null);
    const inputEvidenciaRef = useRef<HTMLInputElement>(null);
    // Formatos ya descargados en esta sesión, para habilitar su botón de subida.
    const [descargados, setDescargados] = useState<Set<'F10' | 'F11'>>(new Set());

    const { nnas, fetchAllNnas } = useNnaStore();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getTalleres();
            setTalleres(data);
            if (nnas.length === 0) fetchAllNnas();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectFromCalendar = async (taller: Taller) => {
        const fullTaller = await getTallerById(taller.id);
        setCurrentTaller(fullTaller);
        setIsFormOpen(true);

        // Abrir donde el educador tiene trabajo, no siempre en la portada:
        // si el taller ya se dio y falta evaluarlo, arranca en la evaluación.
        const ev = fullTaller.evaluacionTaller;
        setEvalTaller({
            logros: ev?.logros || '',
            limitaciones: ev?.limitaciones || '',
            sugerencias: ev?.sugerencias || '',
        });
        const yaPaso = fullTaller.fecha && fullTaller.fecha.slice(0, 10) < new Date().toISOString().slice(0, 10);
        setActiveTab(yaPaso && !ev?.evaluado ? 'evaluacion' : 'planificacion');

        setDescargados(new Set());
        cargarEvidencias(taller.id);
    };

    /**
     * Abre un taller directamente en la ficha indicada.
     *
     * Lo usan los botones del listado: el educador va a la asistencia o a la
     * evaluación de un clic, sin entrar y buscar la pestaña.
     */
    const abrirTallerEn = async (taller: Taller, tab: 'planificacion' | 'ejecucion' | 'evaluacion') => {
        await handleSelectFromCalendar(taller);
        setActiveTab(tab);
    };

    /** Guarda el Formato 08. Una sola evaluación para todo el taller. */
    const handleGuardarEvaluacion = async () => {
        if (!currentTaller?.id) return;
        if (!evalTaller.logros.trim()) {
            toast.error('Escribe al menos los logros: es el punto 5 del formato.');
            return;
        }
        setGuardandoEval(true);
        try {
            const actualizado = await guardarEvaluacionTaller(currentTaller.id, evalTaller);
            setCurrentTaller(actualizado);
            toast.success('Evaluación del taller guardada.');
            await loadData();
        } catch (e: any) {
            toast.error(e.message || 'No se pudo guardar la evaluación.');
        } finally {
            setGuardandoEval(false);
        }
    };

    /** Quita las evaluaciones personalizadas para que todos hereden la del taller. */
    const handleIgualarEvaluaciones = async () => {
        if (!currentTaller?.id) return;
        const ok = await confirmar(
            'Se borrarán las evaluaciones escritas para participantes concretos y todos quedarán con la del taller. Esto no se puede deshacer.',
            { titulo: 'Igualar evaluaciones', textoConfirmar: 'Sí, igualar', peligro: true },
        );
        if (!ok) return;
        try {
            setCurrentTaller(await igualarEvaluaciones(currentTaller.id));
            toast.success('Todos los participantes quedaron con la evaluación del taller.');
        } catch {
            toast.error('No se pudieron igualar las evaluaciones.');
        }
    };

    const handleNewTaller = (prefilledDate?: string) => {
        setCurrentTaller({
            nombre: '',
            dirigidoA: 'Niños y niñas',
            objetivo: '',
            lugar: '',
            fecha: prefilledDate || new Date().toISOString().split('T')[0],
            hora: '09:00',
            inicioActividad: '',
            inicioTiempo: '',
            inicioMateriales: '',
            procesoActividad: '',
            procesoTiempo: '',
            procesoMateriales: '',
            cierreActividad: '',
            cierreTiempo: '',
            cierreMateriales: '',
            numeroPersonasPlanificadas: undefined,
            accionesPrevias: '',
            estado: 'PLANIFICADO',
            participantes: [],
            incidenciasLogisticas: ''
        });
        setIsFormOpen(true);
        setActiveTab('planificacion');
        setEvidencias([]);
        setDescargados(new Set());
    };

    const handleSave = async () => {
        if (!currentTaller) return;

        // Solo el nombre y la fecha son obligatorios: en la reunión pidieron
        // poder registrar un taller ya dictado sin llenar toda la planificación.
        if (!(currentTaller.nombre || '').trim()) {
            toast.error('Ponle un nombre al taller para poder identificarlo.');
            setActiveTab('planificacion');
            return;
        }
        if (!currentTaller.fecha) {
            toast.error('Indica la fecha del taller.');
            setActiveTab('planificacion');
            return;
        }

        setLoading(true);

        try {
            if (currentTaller.id) {
                // La ficha de evaluación tiene su propio endpoint: aquí solo
                // viajan planificación y asistencia.
                await updateTaller(
                    currentTaller.id, currentTaller,
                    activeTab === 'evaluacion' ? 'ejecucion' : activeTab,
                );
                toast.success("Taller actualizado correctamente.");
            } else {
                const created = await createTaller(currentTaller);
                setCurrentTaller(created);
                toast.success("Taller creado correctamente.");
            }
            await loadData();
        } catch (error) {
            console.error(error);
            toast.error("Error al guardar el taller. Revisa los datos.");
        } finally {
            setLoading(false);
        }
    };

    /** Abre el selector único con los NNA del educador y su familia anidada. */
    const handleOpenSelector = async () => {
        if (!currentTaller?.id) {
            toast.info("Guarda la planificación primero para agregar participantes.");
            return;
        }

        setIsLoadingCandidatos(true);
        setShowSelector(true);
        setSelectedNnaIds(new Set());
        setSelectedFamiliarIds(new Set());
        setSelectorSearch('');
        setSelectorFiltro('TODOS');
        setExpandidos(new Set());
        try {
            setCandidatos(await getCandidatos(currentTaller.id));
        } catch (error: any) {
            console.error(error);
            toast.error(String(error?.message || '') || "No se pudieron cargar los participantes.");
            setShowSelector(false);
        } finally {
            setIsLoadingCandidatos(false);
        }
    };

    /** Alta masiva: NNA y familiares marcados viajan en una sola llamada. */
    const handleBulkAdd = async () => {
        if (!currentTaller?.id) return;
        if (selectedNnaIds.size === 0 && selectedFamiliarIds.size === 0) return;
        setIsAddingBulk(true);

        try {
            await addParticipantesBulk(currentTaller.id, {
                nnaIds: Array.from(selectedNnaIds),
                familiarIds: Array.from(selectedFamiliarIds),
            });

            const partes = [];
            if (selectedNnaIds.size) partes.push(`${selectedNnaIds.size} NNA`);
            if (selectedFamiliarIds.size) partes.push(`${selectedFamiliarIds.size} familiar${selectedFamiliarIds.size !== 1 ? 'es' : ''}`);
            toast.success(`Se agregaron ${partes.join(' y ')} al taller.`);

            const updated = await getTallerById(currentTaller.id);
            setCurrentTaller(updated);
            setTalleres(prev => prev.map(t => t.id === updated.id ? updated : t));
            setShowSelector(false);
            setSelectedNnaIds(new Set());
            setSelectedFamiliarIds(new Set());
        } catch (error: any) {
            console.error(error);
            toast.error(String(error?.message || '') || "Error al agregar participantes.");
        } finally {
            setIsAddingBulk(false);
        }
    };

    /** Marcar un NNA arrastra a su familia solo si el educador lo pide. */
    const toggleNna = (nnaId: number) => {
        setSelectedNnaIds(prev => {
            const next = new Set(prev);
            next.has(nnaId) ? next.delete(nnaId) : next.add(nnaId);
            return next;
        });
    };

    const toggleFamiliar = (familiarId: number) => {
        setSelectedFamiliarIds(prev => {
            const next = new Set(prev);
            next.has(familiarId) ? next.delete(familiarId) : next.add(familiarId);
            return next;
        });
    };

    /** Carga las evidencias ya archivadas del taller abierto. */
    const cargarEvidencias = async (tallerId: number) => {
        try {
            setEvidencias(await getEvidenciasTaller(tallerId));
        } catch (error) {
            console.error('Error cargando evidencias', error);
            setEvidencias([]);
        }
    };

    const abrirSelectorEvidencia = (tipo: string) => {
        if (!currentTaller?.id) {
            toast.info('Guarda la planificación primero.');
            return;
        }
        if (!currentTaller.participantes?.length) {
            toast.info('Agrega participantes antes de subir la evidencia.');
            return;
        }
        setTipoEvidenciaActivo(tipo);
        inputEvidenciaRef.current?.click();
    };

    const handleSubirEvidencia = async (archivo: File) => {
        if (!currentTaller?.id || !tipoEvidenciaActivo) return;
        setSubiendoEvidencia(true);

        try {
            const titulo = `${tipoEvidenciaActivo} · ${currentTaller.nombre || 'Taller'}`.slice(0, 200);
            const res = await subirEvidenciaTaller(
                currentTaller.id,
                archivo,
                tipoEvidenciaActivo,
                titulo
            );

            toast.success(`Evidencia archivada en ${res.archivados} expediente${res.archivados !== 1 ? 's' : ''}.`);
            // Un NNA sin caso abierto no puede foliarse: se avisa en vez de
            // dejar la evidencia archivada a medias sin que nadie lo note.
            if (res.sinCaso.length) {
                toast.error(`Sin caso abierto, no se archivó para: ${res.sinCaso.join(', ')}`);
            }
            await cargarEvidencias(currentTaller.id);
        } catch (error: any) {
            console.error(error);
            toast.error(String(error?.message || '') || 'No se pudo subir la evidencia.');
        } finally {
            setSubiendoEvidencia(false);
            setTipoEvidenciaActivo(null);
        }
    };

    /** Abre o cierra la familia de un NNA sin alterar la selección. */
    const toggleExpandir = (nnaId: number) => {
        setExpandidos(prev => {
            const next = new Set(prev);
            next.has(nnaId) ? next.delete(nnaId) : next.add(nnaId);
            return next;
        });
    };

    /** Marca de una vez a todos los familiares libres de un NNA. */
    const toggleFamiliaCompleta = (candidato: NnaCandidato) => {
        const libres = candidato.familiares.filter(f => !f.yaInscrito).map(f => f.familiarId);
        const yaTodos = libres.length > 0 && libres.every(id => selectedFamiliarIds.has(id));
        setSelectedFamiliarIds(prev => {
            const next = new Set(prev);
            libres.forEach(id => yaTodos ? next.delete(id) : next.add(id));
            return next;
        });
    };

    const handleRemoveParticipant = async (p: ParticipanteTaller) => {
        if (!currentTaller?.id) return;
        const esFamiliar = p.tipo === 'FAMILIAR';
        const texto = esFamiliar ? '¿Quitar a este familiar del taller?' : '¿Eliminar a este participante del taller?';
        if (!(await confirmar(texto, { titulo: esFamiliar ? 'Quitar familiar' : 'Eliminar participante', textoConfirmar: 'Sí, eliminar', peligro: true }))) return;

        try {
            if (esFamiliar) {
                await removeFamiliar(currentTaller.id, p.familiarId!);
            } else {
                await removeParticipante(currentTaller.id, p.nnaId!);
            }
            toast.info(esFamiliar ? "Familiar retirado." : "Participante eliminado.");
            const updated = await getTallerById(currentTaller.id);
            setCurrentTaller(updated);
            setTalleres(prev => prev.map(t => t.id === updated.id ? updated : t));
        } catch (error) {
            console.error(error);
            toast.error("Error al eliminar participante.");
        }
    };

    const toggleAsistencia = async (p: ParticipanteTaller) => {
        if (!currentTaller?.id) return;
        const nuevoEstado = !p.asistio;

        try {
            if (p.tipo === 'FAMILIAR') {
                await updateFamiliar(currentTaller.id, p.familiarId!, { asistio: nuevoEstado });
            } else {
                await updateParticipante(currentTaller.id, p.nnaId!, { asistio: nuevoEstado });
            }
            setCurrentTaller({
                ...currentTaller,
                participantes: currentTaller.participantes!.map(x =>
                    x.id === p.id ? { ...x, asistio: nuevoEstado } : x
                )
            });
        } catch (error) {
            console.error(error);
            toast.error("Error al actualizar asistencia.");
        }
    };

    const saveEvaluation = async () => {
        if (!currentTaller?.id || !evaluatingParticipantId) return;
        const p = currentTaller.participantes!.find(x => x.nnaId === evaluatingParticipantId);
        if (!p) return;

        try {
            await updateParticipante(currentTaller.id, evaluatingParticipantId, {
                logros: p.logros,
                limitaciones: p.limitaciones,
                sugerencias: p.sugerencias
            });
            toast.success("Evaluación guardada.");
            setEvaluatingParticipantId(null);
            const updated = await getTallerById(currentTaller.id);
            setCurrentTaller(updated);
            setTalleres(prev => prev.map(t => t.id === updated.id ? updated : t));
        } catch (error) {
            console.error(error);
            toast.error("Error al guardar evaluación.");
        }
    };

    const updateLocalEvaluation = (nnaId: number, field: 'logros' | 'limitaciones' | 'sugerencias', value: string) => {
        if (currentTaller?.participantes) {
            setCurrentTaller({
                ...currentTaller,
                participantes: currentTaller.participantes.map(p =>
                    p.nnaId === nnaId ? { ...p, [field]: value } : p
                )
            });
        }
    };

    const handleDownloadPDF = async (elementId: string, filename: string) => {
        const element = document.getElementById(elementId);
        if (!element) return;
        setIsGeneratingPDF(true);

        // Se recuerda qué formato se descargó para habilitar su botón de
        // subida: no tiene sentido "subir el F10 firmado" sin haberlo impreso.
        const formato = elementId.includes('formato-10') ? 'F10'
            : elementId.includes('formato-11') ? 'F11'
            : null;
        if (formato) setDescargados(prev => new Set(prev).add(formato));

        try {
            const iframe = document.createElement('iframe');
            iframe.style.position = 'absolute';
            iframe.style.left = '-9999px';
            iframe.style.width = '210mm';
            iframe.style.height = '297mm';
            document.body.appendChild(iframe);

            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!iframeDoc) throw new Error('No se pudo crear el documento iframe');

            iframeDoc.open();
            iframeDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { background: white; color: black; }
            </style>
          </head>
          <body>
            ${element.outerHTML}
          </body>
        </html>
      `);
            iframeDoc.close();

            await new Promise(resolve => setTimeout(resolve, 100));
            const renderedElement = iframeDoc.getElementById(elementId);
            if (!renderedElement) throw new Error('Elemento no encontrado en iframe');

            const canvas = await html2canvas(renderedElement, {
                scale: 3,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: 800,
                allowTaint: true
            });

            document.body.removeChild(iframe);

            const imgData = canvas.toDataURL('image/png', 1.0);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
            pdf.save(`${filename}.pdf`);
            toast.success("PDF descargado correctamente.");
        } catch (error) {
            console.error('Error generando PDF:', error);
            toast.error("Error al generar PDF.");
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const evaluatingParticipant = currentTaller?.participantes?.find(
        p => p.tipo !== 'FAMILIAR' && p.nnaId === evaluatingParticipantId
    );

    // El F10 lista usuarios (NNA) y el F11 familias: se separan acá.
    const participantesNna = (currentTaller?.participantes || []).filter(p => p.tipo !== 'FAMILIAR');
    const participantesFamiliares = (currentTaller?.participantes || []).filter(p => p.tipo === 'FAMILIAR');

    // La búsqueda alcanza al NNA y a sus familiares: escribir el nombre de la
    // madre también trae al chico, y viceversa.
    const terminoBusqueda = selectorSearch.trim().toLowerCase();

    const coincidePorFamiliar = (c: NnaCandidato) =>
        !!terminoBusqueda &&
        c.familiares.some(f => `${f.nombres} ${f.dni || ''}`.toLowerCase().includes(terminoBusqueda));

    const candidatosFiltrados = candidatos.filter(c => {
        if (selectorFiltro === 'FAMILIAS' && c.familiares.length === 0) return false;
        if (!terminoBusqueda) return true;

        const textoNna = `${c.nombres} ${c.apellidoPaterno || ''} ${c.apellidoMaterno || ''} ${c.numeroDoc || ''}`.toLowerCase();
        return textoNna.includes(terminoBusqueda) || coincidePorFamiliar(c);
    });

    // Si la coincidencia está en un familiar, se abre ese NNA para que se vea
    // por qué aparece en los resultados.
    useEffect(() => {
        if (!terminoBusqueda) return;
        const aAbrir = candidatos.filter(coincidePorFamiliar).map(c => c.nnaId);
        if (aAbrir.length) setExpandidos(prev => new Set([...prev, ...aAbrir]));
    }, [terminoBusqueda, candidatos]);

    const totalSeleccionado = selectedNnaIds.size + selectedFamiliarIds.size;

    /** Marca de una vez todo lo visible según el filtro activo. */
    const toggleSeleccionarTodo = () => {
        const nnaLibres = candidatosFiltrados.filter(c => !c.yaInscrito).map(c => c.nnaId);
        const famLibres = candidatosFiltrados.flatMap(c => c.familiares.filter(f => !f.yaInscrito).map(f => f.familiarId));

        const objetivoNna = selectorFiltro === 'FAMILIAS' ? [] : nnaLibres;
        const objetivoFam = selectorFiltro === 'NNA' ? [] : famLibres;

        const yaTodo =
            objetivoNna.every(id => selectedNnaIds.has(id)) &&
            objetivoFam.every(id => selectedFamiliarIds.has(id)) &&
            (objetivoNna.length > 0 || objetivoFam.length > 0);

        setSelectedNnaIds(yaTodo ? new Set() : new Set(objetivoNna));
        setSelectedFamiliarIds(yaTodo ? new Set() : new Set(objetivoFam));
    };

    if (loading && talleres.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-fg-muted">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (isFormOpen && currentTaller) {
        return (
            <div className="space-y-6 max-w-7xl mx-auto pb-12">
                {showSelector && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                        <div className="bg-surface border border-border w-full max-w-xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
                            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-surface-muted/50">
                                <div>
                                    <h3 className="font-bold text-lg text-fg">Agregar participantes</h3>
                                    <p className="text-xs text-fg-muted">
                                        Marca los NNA. Abre uno para agregar a su familia
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowSelector(false)}
                                    className="p-1.5 text-fg-muted hover:text-fg hover:bg-surface-muted rounded-lg transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="p-4 border-b border-border space-y-3 bg-surface">
                                <input
                                    type="text"
                                    value={selectorSearch}
                                    onChange={e => setSelectorSearch(e.target.value)}
                                    placeholder="Buscar por nombre o DNI (del NNA o del familiar)..."
                                    className="w-full p-2.5 bg-surface-muted border border-border rounded-xl text-xs outline-none focus:border-primary transition-all"
                                    autoFocus
                                />

                                <div className="flex items-center gap-2">
                                    {([
                                        { id: 'TODOS', label: 'Todos' },
                                        { id: 'NNA', label: 'Solo NNA' },
                                        { id: 'FAMILIAS', label: 'Con familia' },
                                    ] as const).map(op => (
                                        <button
                                            key={op.id}
                                            type="button"
                                            onClick={() => setSelectorFiltro(op.id)}
                                            className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                                                selectorFiltro === op.id
                                                    ? 'bg-primary-soft text-primary'
                                                    : 'text-fg-muted border border-border hover:text-fg'
                                            }`}
                                        >
                                            {op.label}
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={toggleSeleccionarTodo}
                                        className="w-full text-left sm:w-auto sm:ml-auto sm:text-right text-primary text-[11px] font-medium hover:underline"
                                    >
                                        Seleccionar todo
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-y-auto flex-1">
                                {isLoadingCandidatos ? (
                                    <div className="py-16 flex justify-center">
                                        <Loader2 size={20} className="animate-spin text-primary" />
                                    </div>
                                ) : candidatosFiltrados.length === 0 ? (
                                    <div className="py-16 text-center text-xs text-fg-muted italic px-8">
                                        {candidatos.length === 0
                                            ? 'No tienes NNA con casos activos para agregar a este taller.'
                                            : 'No se encontraron coincidencias con esa búsqueda.'}
                                    </div>
                                ) : (
                                    candidatosFiltrados.map(c => {
                                        const nnaMarcado = selectedNnaIds.has(c.nnaId);
                                        const abierto = expandidos.has(c.nnaId);
                                        const tieneFamilia = c.familiares.length > 0;
                                        const familiaMarcada = c.familiares.filter(f => selectedFamiliarIds.has(f.familiarId)).length;

                                        return (
                                            <Fragment key={c.nnaId}>
                                                <div
                                                    onClick={() => tieneFamilia && toggleExpandir(c.nnaId)}
                                                    className={`px-4 py-2.5 flex items-center gap-3 border-b border-border/50 transition-colors ${
                                                        c.yaInscrito ? 'opacity-50' : ''
                                                    } ${tieneFamilia ? 'cursor-pointer hover:bg-surface-muted/60' : ''} ${
                                                        abierto ? 'bg-surface-muted/40' : ''
                                                    }`}
                                                >
                                                    <button
                                                        type="button"
                                                        disabled={c.yaInscrito}
                                                        onClick={e => { e.stopPropagation(); toggleNna(c.nnaId); }}
                                                        className={`w-[18px] h-[18px] rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
                                                            nnaMarcado || c.yaInscrito
                                                                ? 'bg-primary border-primary text-white'
                                                                : 'border-border bg-surface hover:border-primary'
                                                        }`}
                                                    >
                                                        {(nnaMarcado || c.yaInscrito) && <Check size={12} strokeWidth={3} />}
                                                    </button>

                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[13px] font-bold text-fg truncate">
                                                            {c.apellidoPaterno} {c.apellidoMaterno || ''}, {c.nombres}
                                                        </p>
                                                        <p className="text-[11px] text-fg-muted truncate">
                                                            {c.numeroDoc ? `DNI ${c.numeroDoc}` : 'Sin documento'}
                                                            {/* El código de carpeta forzaba dos líneas por fila en
                                                                el celular; ahí basta con el documento. */}
                                                            <span className="hidden sm:inline">
                                                                {c.carpetaCodigo ? ` · ${c.carpetaCodigo}` : ' · Sin carpeta'}
                                                            </span>
                                                        </p>
                                                    </div>

                                                    {c.yaInscrito && (
                                                        <span className="text-[10px] font-bold text-success uppercase flex-shrink-0">En la lista</span>
                                                    )}

                                                    {tieneFamilia ? (
                                                        <div className="flex items-center gap-1.5 flex-shrink-0 text-fg-muted">
                                                            <span className={`text-[11px] font-medium ${familiaMarcada ? 'text-primary' : ''}`}>
                                                                {familiaMarcada
                                                                    ? `${familiaMarcada} de ${c.familiares.length}`
                                                                    : `${c.familiares.length} familiar${c.familiares.length !== 1 ? 'es' : ''}`}
                                                            </span>
                                                            <ChevronDown
                                                                size={15}
                                                                className={`transition-transform ${abierto ? 'rotate-180' : ''}`}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] text-warning flex-shrink-0" title="No tiene familiares en la ficha F03">
                                                            sin familia
                                                        </span>
                                                    )}
                                                </div>

                                                {abierto && tieneFamilia && (
                                                    <div className="bg-surface-muted/25 border-b border-border/50">
                                                        {c.familiares.length > 1 && (
                                                            <div className="pl-11 pr-4 pt-2 pb-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleFamiliaCompleta(c)}
                                                                    className="text-[11px] text-primary font-medium hover:underline"
                                                                >
                                                                    Marcar toda la familia
                                                                </button>
                                                            </div>
                                                        )}
                                                        {c.familiares.map(f => {
                                                            const famMarcado = selectedFamiliarIds.has(f.familiarId);
                                                            return (
                                                                <div
                                                                    key={f.familiarId}
                                                                    onClick={() => !f.yaInscrito && toggleFamiliar(f.familiarId)}
                                                                    className={`pl-11 pr-4 py-2 flex items-center gap-3 transition-colors ${
                                                                        f.yaInscrito
                                                                            ? 'opacity-50'
                                                                            : famMarcado
                                                                                ? 'bg-primary-soft/30 cursor-pointer'
                                                                                : 'hover:bg-surface-muted/60 cursor-pointer'
                                                                    }`}
                                                                >
                                                                    <div className={`w-[16px] h-[16px] rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
                                                                        famMarcado || f.yaInscrito
                                                                            ? 'bg-primary border-primary text-white'
                                                                            : 'border-border bg-surface'
                                                                    }`}>
                                                                        {(famMarcado || f.yaInscrito) && <Check size={11} strokeWidth={3} />}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-[12px] text-fg truncate">{f.nombres}</p>
                                                                        <p className="text-[11px] text-fg-muted">
                                                                            {etiquetaParentesco(f.parentesco) || 'Familiar'}
                                                                            {f.dni ? ` · DNI ${f.dni}` : ''}
                                                                        </p>
                                                                    </div>
                                                                    {f.yaInscrito && (
                                                                        <span className="text-[10px] font-bold text-success uppercase flex-shrink-0">En la lista</span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </Fragment>
                                        );
                                    })
                                )}
                            </div>

                            <div className="px-6 py-4 border-t border-border bg-surface-muted/50 flex justify-between items-center">
                                <span className="text-xs text-fg-muted font-medium">
                                    {selectedNnaIds.size} NNA · {selectedFamiliarIds.size} familiar{selectedFamiliarIds.size !== 1 ? 'es' : ''}
                                </span>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => setShowSelector(false)}>
                                        Cancelar
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleBulkAdd}
                                        disabled={totalSeleccionado === 0 || isAddingBulk}
                                    >
                                        {isAddingBulk ? (
                                            <Loader2 size={14} className="animate-spin" />
                                        ) : (
                                            `Agregar (${totalSeleccionado})`
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {evaluatingParticipantId !== null && evaluatingParticipant && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                        <div className="bg-surface border border-border w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-surface-muted">
                                <div>
                                    <h3 className="font-bold text-lg">Evaluación Individual (Formato F8)</h3>
                                    <p className="text-xs text-fg-muted">
                                        Participante: {evaluatingParticipant.nna ? `${evaluatingParticipant.nna.nombres} ${evaluatingParticipant.nna.apellidoPaterno}` : `ID ${evaluatingParticipant.nnaId}`}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setEvaluatingParticipantId(null)}
                                    className="p-1.5 text-fg-muted hover:text-fg hover:bg-surface-muted rounded-lg transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                                <div>
                                    <label className="block text-[11px] font-semibold text-fg-muted uppercase mb-1 flex items-center gap-1">
                                        <StickyNote size={14} className="text-warning" /> 5. Logros alcanzados
                                    </label>
                                    <CampoDictado
                                        label=""
                                        value={evaluatingParticipant.logros || ''}
                                        onChange={v => updateLocalEvaluation(evaluatingParticipant.nnaId!,'logros', v)}
                                        rows={3}
                                        placeholder="¿Qué cambios u objetivos logró el NNA durante el taller?"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-fg-muted uppercase mb-1 flex items-center gap-1">
                                            <AlertTriangle size={14} className="text-warning" /> 6. Limitaciones
                                        </label>
                                        <CampoDictado
                                            label=""
                                            value={evaluatingParticipant.limitaciones || ''}
                                            onChange={v => updateLocalEvaluation(evaluatingParticipant.nnaId!,'limitaciones', v)}
                                            rows={3}
                                            placeholder="Dificultades o barreras observadas..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-fg-muted uppercase mb-1 flex items-center gap-1">
                                            <Lightbulb size={14} className="text-info" /> 7. Sugerencias
                                        </label>
                                        <CampoDictado
                                            label=""
                                            value={evaluatingParticipant.sugerencias || ''}
                                            onChange={v => updateLocalEvaluation(evaluatingParticipant.nnaId!,'sugerencias', v)}
                                            rows={3}
                                            placeholder="Recomendaciones para próximas sesiones..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-4 border-t border-border bg-surface-muted flex justify-end">
                                <Button onClick={saveEvaluation}>Guardar Evaluación</Button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-surface p-4 sm:p-6 rounded-2xl border border-border shadow-sm">
                    {/* flex-wrap: en el celular el título y los botones no caben
                        en una sola fila y los de acción quedaban aplastados. */}
                    <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
                        <div>
                            <h2 className="font-bold text-lg sm:text-xl">{currentTaller.nombre || 'Nuevo Taller'}</h2>
                            <p className="text-xs text-fg-muted">Formato F7 · Talleres Socioeducativos</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {currentTaller.id && (
                                <div className="flex gap-1 border-r border-border pr-2 mr-1">
                                    <button
                                        type="button"
                                        onClick={() => handleDownloadPDF('formato-7-print-talleres', `F7_${currentTaller.nombre?.replace(/\s+/g, '_')}`)}
                                        disabled={isGeneratingPDF}
                                        className="flex items-center gap-1 px-2.5 py-1.5 border border-border rounded-lg text-xs font-semibold text-fg-muted hover:bg-surface-muted disabled:opacity-50 transition-colors"
                                    >
                                        <FileDown size={14} /> F7
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDownloadPDF('formato-10-print-talleres', `F10_${currentTaller.nombre?.replace(/\s+/g, '_')}`)}
                                        disabled={isGeneratingPDF}
                                        className="flex items-center gap-1 px-2.5 py-1.5 border border-border rounded-lg text-xs font-semibold text-fg-muted hover:bg-surface-muted disabled:opacity-50 transition-colors"
                                    >
                                        <FileDown size={14} /> F10
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDownloadPDF('formato-11-print-talleres', `F11_${currentTaller.nombre?.replace(/\s+/g, '_')}`)}
                                        disabled={isGeneratingPDF}
                                        className="flex items-center gap-1 px-2.5 py-1.5 border border-border rounded-lg text-xs font-semibold text-fg-muted hover:bg-surface-muted disabled:opacity-50 transition-colors"
                                    >
                                        <FileDown size={14} /> F11
                                    </button>
                                </div>
                            )}
                            <Button variant="ghost" onClick={() => setIsFormOpen(false)}>Cerrar</Button>
                            <Button onClick={handleSave} disabled={loading}>
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {activeTab === 'planificacion' ? 'Guardar y continuar →' : 'Guardar'}
                            </Button>
                        </div>
                    </div>

                    <div className="flex gap-4 border-b border-border mb-6">
                        <button
                            onClick={() => setActiveTab('planificacion')}
                            className={`pb-3 text-sm font-semibold transition-colors ${activeTab === 'planificacion' ? 'text-primary border-b-2 border-primary' : 'text-fg-muted'}`}
                        >
                            1. Planificación (F7)
                        </button>
                        <button
                            onClick={() => {
                                if (!currentTaller.id) {
                                    toast.info("Guarda la planificación primero.");
                                    return;
                                }
                                setActiveTab('ejecucion');
                            }}
                            className={`pb-3 text-sm font-semibold transition-colors ${activeTab === 'ejecucion' ? 'text-primary border-b-2 border-primary' : 'text-fg-muted'}`}
                        >
                            2. Asistencia (F10/F11)
                        </button>
                        <button
                            onClick={() => {
                                if (!currentTaller.id) {
                                    toast.info("Guarda la planificación primero.");
                                    return;
                                }
                                setActiveTab('evaluacion');
                            }}
                            className={`pb-3 text-sm font-semibold transition-colors ${activeTab === 'evaluacion' ? 'text-primary border-b-2 border-primary' : 'text-fg-muted'}`}
                        >
                            3. Evaluación (F8)
                        </button>
                    </div>

                    {activeTab === 'planificacion' && (
                        <div className="space-y-6 max-w-5xl">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[11px] font-semibold text-fg-muted uppercase mb-1">
                                        1. NOMBRE DEL TALLER <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        value={currentTaller.nombre || ''}
                                        onChange={e => setCurrentTaller({ ...currentTaller, nombre: e.target.value })}
                                        className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs outline-none focus:border-primary"
                                        placeholder="Ej. Taller de Habilidades Blandas"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-fg-muted uppercase mb-1">
                                            FECHA <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={currentTaller.fecha ? new Date(currentTaller.fecha).toISOString().split('T')[0] : ''}
                                            onChange={e => setCurrentTaller({ ...currentTaller, fecha: e.target.value })}
                                            className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-fg-muted uppercase mb-1">HORA</label>
                                        <input
                                            type="time"
                                            value={currentTaller.hora || '09:00'}
                                            onChange={e => setCurrentTaller({ ...currentTaller, hora: e.target.value })}
                                            className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[11px] font-semibold text-fg-muted uppercase mb-1">2. DIRIGIDO A</label>
                                    <div className="flex gap-2">
                                        {['Niños y niñas', 'Adolescentes', 'Padres de Familia'].map(opcion => (
                                            <button
                                                key={opcion}
                                                type="button"
                                                onClick={() => setCurrentTaller({ ...currentTaller, dirigidoA: opcion })}
                                                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all border ${
                                                    currentTaller.dirigidoA === opcion
                                                        ? 'bg-primary text-white border-primary shadow-sm'
                                                        : 'bg-surface border-border text-fg-muted hover:border-primary/50'
                                                }`}
                                            >
                                                {opcion}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-fg-muted uppercase mb-1">7. LUGAR</label>
                                    <input
                                        value={currentTaller.lugar || ''}
                                        onChange={e => setCurrentTaller({ ...currentTaller, lugar: e.target.value })}
                                        className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs outline-none focus:border-primary"
                                        placeholder="Ej. Loza Deportiva"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[11px] font-semibold text-fg-muted uppercase mb-1">3. OBJETIVO GENERAL</label>
                                    <CampoDictado
                                        label=""
                                        value={currentTaller.objetivo || ''}
                                        onChange={v => setCurrentTaller({ ...currentTaller, objetivo: v })}
                                        rows={3}
                                        placeholder="¿Qué queremos lograr con el grupo?"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-fg-muted uppercase mb-1">5. ACCIONES PREVIAS AL TALLER</label>
                                    <CampoDictado
                                        label=""
                                        value={currentTaller.accionesPrevias || ''}
                                        onChange={v => setCurrentTaller({ ...currentTaller, accionesPrevias: v })}
                                        rows={3}
                                        placeholder="Acciones de coordinación, preparación de materiales, convocatoria..."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-fg-muted uppercase mb-1">4. N° DE PERSONAS PLANIFICADAS</label>
                                <input
                                    type="number"
                                    value={currentTaller.numeroPersonasPlanificadas || ''}
                                    onChange={e => setCurrentTaller({ ...currentTaller, numeroPersonasPlanificadas: e.target.value ? Number(e.target.value) : undefined })}
                                    className="w-full max-w-xs p-2.5 bg-surface border border-border rounded-xl text-xs outline-none focus:border-primary"
                                    placeholder="Ej. 15"
                                />
                            </div>

                            <div className="border-t border-dashed border-border pt-6">
                                <h3 className="font-bold text-fg mb-1 flex items-center gap-2">
                                    <BookOpen size={18} className="text-fg-muted" /> 6. Esquema del Taller
                                    <span className="text-[11px] font-medium text-fg-muted normal-case">(opcional)</span>
                                </h3>
                                <p className="text-[11px] text-fg-muted mb-4">
                                    Puedes guardar el taller sin llenarlo y completarlo después.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-success-soft/30 p-4 rounded-xl border border-success/20 shadow-sm space-y-3">
                                        <span className="text-[11px] font-bold text-success tracking-widest uppercase">INICIO</span>
                                        <div>
                                            <label className="block text-[10px] font-semibold text-fg-muted uppercase mb-1">TIEMPO</label>
                                            <input
                                                value={currentTaller.inicioTiempo || ''}
                                                onChange={e => setCurrentTaller({ ...currentTaller, inicioTiempo: e.target.value })}
                                                className="w-full p-2 bg-surface border border-success/20 rounded-lg text-xs outline-none"
                                                placeholder="Ej. 10 min"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-semibold text-fg-muted uppercase mb-1">ACTIVIDAD</label>
                                            <CampoDictado
                                                label=""
                                                value={currentTaller.inicioActividad || ''}
                                                onChange={v => setCurrentTaller({ ...currentTaller, inicioActividad: v })}
                                                rows={3}
                                                placeholder="Describe la actividad..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-semibold text-fg-muted uppercase mb-1">MATERIALES</label>
                                            <input
                                                value={currentTaller.inicioMateriales || ''}
                                                onChange={e => setCurrentTaller({ ...currentTaller, inicioMateriales: e.target.value })}
                                                className="w-full p-2 bg-surface border border-success/20 rounded-lg text-xs outline-none"
                                                placeholder="Ej. Papelógrafos, plumones"
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-info-soft/30 p-4 rounded-xl border border-info/20 shadow-sm space-y-3">
                                        <span className="text-[11px] font-bold text-info tracking-widest uppercase">PROCESO</span>
                                        <div>
                                            <label className="block text-[10px] font-semibold text-fg-muted uppercase mb-1">TIEMPO</label>
                                            <input
                                                value={currentTaller.procesoTiempo || ''}
                                                onChange={e => setCurrentTaller({ ...currentTaller, procesoTiempo: e.target.value })}
                                                className="w-full p-2 bg-surface border border-info/20 rounded-lg text-xs outline-none"
                                                placeholder="Ej. 30 min"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-semibold text-fg-muted uppercase mb-1">ACTIVIDAD</label>
                                            <CampoDictado
                                                label=""
                                                value={currentTaller.procesoActividad || ''}
                                                onChange={v => setCurrentTaller({ ...currentTaller, procesoActividad: v })}
                                                rows={3}
                                                placeholder="Describe la actividad..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-semibold text-fg-muted uppercase mb-1">MATERIALES</label>
                                            <input
                                                value={currentTaller.procesoMateriales || ''}
                                                onChange={e => setCurrentTaller({ ...currentTaller, procesoMateriales: e.target.value })}
                                                className="w-full p-2 bg-surface border border-info/20 rounded-lg text-xs outline-none"
                                                placeholder="Ej. Cartulinas, tijeras"
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-primary-soft/30 p-4 rounded-xl border border-primary/20 shadow-sm space-y-3">
                                        <span className="text-[11px] font-bold text-primary tracking-widest uppercase">CIERRE</span>
                                        <div>
                                            <label className="block text-[10px] font-semibold text-fg-muted uppercase mb-1">TIEMPO</label>
                                            <input
                                                value={currentTaller.cierreTiempo || ''}
                                                onChange={e => setCurrentTaller({ ...currentTaller, cierreTiempo: e.target.value })}
                                                className="w-full p-2 bg-surface border border-primary/20 rounded-lg text-xs outline-none"
                                                placeholder="Ej. 10 min"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-semibold text-fg-muted uppercase mb-1">ACTIVIDAD</label>
                                            <CampoDictado
                                                label=""
                                                value={currentTaller.cierreActividad || ''}
                                                onChange={v => setCurrentTaller({ ...currentTaller, cierreActividad: v })}
                                                rows={3}
                                                placeholder="Describe la actividad..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-semibold text-fg-muted uppercase mb-1">MATERIALES</label>
                                            <input
                                                value={currentTaller.cierreMateriales || ''}
                                                onChange={e => setCurrentTaller({ ...currentTaller, cierreMateriales: e.target.value })}
                                                className="w-full p-2 bg-surface border border-primary/20 rounded-lg text-xs outline-none"
                                                placeholder="Ej. Fichas de evaluación"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'evaluacion' && (
                        <div className="max-w-4xl mx-auto space-y-6">
                            {/* Cabecera del F08: los puntos 1, 2, 3 y 8 del formato
                                son idénticos al F07, así que se heredan. El
                                educador no los vuelve a escribir. */}
                            <div className="bg-surface-muted/40 border border-border rounded-xl p-4">
                                <p className="text-[11px] font-semibold text-fg-muted uppercase mb-3">
                                    Datos heredados de la planificación (F7)
                                </p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[13px]">
                                    <div>
                                        <p className="text-[11px] text-fg-muted">Taller</p>
                                        <p className="text-fg font-medium">{currentTaller.nombre || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-fg-muted">Dirigido a</p>
                                        <p className="text-fg font-medium">{currentTaller.dirigidoA || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-fg-muted">Lugar, fecha y hora</p>
                                        <p className="text-fg font-medium">
                                            {[currentTaller.lugar, currentTaller.fecha?.slice(0, 10), currentTaller.hora]
                                                .filter(Boolean).join(' · ') || '—'}
                                        </p>
                                    </div>
                                    <div>
                                        {/* Punto 4 del formato: no se escribe, se cuenta.
                                            Pedirlo a mano invita a que no cuadre con el F10. */}
                                        <p className="text-[11px] text-fg-muted">Personas asistentes</p>
                                        <p className="text-fg font-semibold text-[16px]">
                                            {(currentTaller.participantes || []).filter(p => p.asistio).length}
                                            <span className="text-[12px] text-fg-muted font-normal">
                                                {' '}de {currentTaller.numeroPersonasPlanificadas || (currentTaller.participantes || []).length} previstas
                                            </span>
                                        </p>
                                    </div>
                                </div>
                                {currentTaller.objetivo && (
                                    <div className="mt-3 pt-3 border-t border-border">
                                        <p className="text-[11px] text-fg-muted">Objetivo planificado</p>
                                        <p className="text-[13px] text-fg-2">{currentTaller.objetivo}</p>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-fg-muted uppercase mb-1">
                                    5. Logros <span className="text-danger">*</span>
                                </label>
                                <CampoDictado
                                    label=""
                                    value={evalTaller.logros}
                                    onChange={v => setEvalTaller({ ...evalTaller, logros: v })}
                                    rows={4}
                                    placeholder="Indicar los cambios obtenidos luego de recibir el taller"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-fg-muted uppercase mb-1">
                                    6. Limitaciones encontradas
                                </label>
                                <CampoDictado
                                    label=""
                                    value={evalTaller.limitaciones}
                                    onChange={v => setEvalTaller({ ...evalTaller, limitaciones: v })}
                                    rows={4}
                                    placeholder="Dificultades encontradas en función a la planificación del taller"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-fg-muted uppercase mb-1">
                                    7. Sugerencias y recomendaciones
                                </label>
                                <CampoDictado
                                    label=""
                                    value={evalTaller.sugerencias}
                                    onChange={v => setEvalTaller({ ...evalTaller, sugerencias: v })}
                                    rows={4}
                                    placeholder="Qué recomendar para la próxima vez"
                                />
                            </div>

                            {/* Aviso de evaluaciones personalizadas. Nunca se pisan
                                solas: borrar lo que alguien escribió a mano para un
                                chico concreto tiene que ser una decisión suya. */}
                            {(currentTaller.participantes || []).some(p => p.evaluacionPropia) && (
                                <div className="bg-warning-soft border border-warning/30 rounded-xl p-3 flex items-start gap-3">
                                    <AlertTriangle size={16} className="text-warning shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-[12px] text-warning font-medium">
                                            {(currentTaller.participantes || []).filter(p => p.evaluacionPropia).length} participante(s)
                                            tienen una evaluación escrita aparte.
                                        </p>
                                        <p className="text-[11px] text-fg-muted mt-0.5">
                                            No se van a sobrescribir. Si quieres que todos queden con esta misma evaluación, iguálalas.
                                        </p>
                                    </div>
                                    <Button size="sm" variant="ghost" onClick={handleIgualarEvaluaciones}>
                                        Igualar todas
                                    </Button>
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-2 border-t border-border">
                                <p className="text-[11px] text-fg-muted italic max-w-md">
                                    Esta evaluación es del taller, no de cada participante. Se archiva
                                    en el expediente de cada NNA que asistió. Recuerda adjuntar la lista
                                    de asistencia firmada y las fotografías.
                                </p>
                                <Button onClick={handleGuardarEvaluacion} disabled={guardandoEval}>
                                    {guardandoEval ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    Guardar evaluación
                                </Button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'ejecucion' && (
                        <div className="max-w-5xl mx-auto space-y-8">
                            <div className="bg-warning-soft/30 p-4 rounded-xl border border-warning/20 flex gap-4 items-start shadow-sm">
                                <AlertTriangle className="text-warning shrink-0 mt-1" size={20} />
                                <div className="flex-1">
                                    <label className="block text-[11px] font-semibold text-warning uppercase mb-1 tracking-wider">
                                        INFORME DE ASUNTOS GLOBALES / INCIDENCIAS
                                    </label>
                                    <CampoDictado
                                        label=""
                                        value={currentTaller.incidenciasLogisticas || ''}
                                        onChange={v => setCurrentTaller({ ...currentTaller, incidenciasLogisticas: v })}
                                        rows={2}
                                        placeholder="Ej: Retraso por lluvia, falta de materiales, interrupciones externas..."
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row gap-8">
                                <div className="w-full md:w-1/3 space-y-4">
                                    <div className="bg-surface-muted/30 p-4 rounded-xl border border-border shadow-sm space-y-3">
                                        <label className="text-[11px] font-semibold text-fg-muted uppercase block tracking-wider">AGREGAR PARTICIPANTES</label>
                                        <button
                                            type="button"
                                            onClick={handleOpenSelector}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                                        >
                                            <ListChecks size={16} />
                                            Agregar participantes
                                        </button>
                                        <p className="text-[11px] text-fg-muted text-center">
                                            NNA y sus padres o tutores, tomados de la ficha F03
                                        </p>
                                    </div>

                                    <div className="bg-primary-soft p-4 rounded-xl text-primary text-xs shadow-sm">
                                        <p className="font-bold flex items-center gap-2">
                                            <Users size={16} /> Total Lista: {currentTaller.participantes?.length || 0}
                                        </p>
                                        <p className="text-[11px] mt-1 opacity-80">
                                            {participantesNna.length} NNA (F10) · {participantesFamiliares.length} familiar{participantesFamiliares.length !== 1 ? 'es' : ''} (F11)
                                        </p>
                                        {nnas.length > 0 && (
                                            <p className="text-[11px] mt-1 opacity-70">
                                                {Math.round((participantesNna.length / nnas.length) * 100)}% de la sede en este taller
                                            </p>
                                        )}
                                    </div>

                                    <div className="bg-surface-muted/30 p-4 rounded-xl border border-border shadow-sm space-y-3">
                                        <label className="text-[11px] font-semibold text-fg-muted uppercase block tracking-wider">
                                            EVIDENCIAS
                                        </label>
                                        {/* El resumen va primero: es la confirmación de que quedó
                                            archivado y antes caía debajo de los botones, fuera de vista. */}
                                        {evidencias.length > 0 && (
                                            <div className="bg-success-soft/40 border border-success/20 rounded-lg p-2.5 space-y-1.5">
                                                {evidencias.map(ev => (
                                                    <div key={ev.archivoUrl} className="flex items-start gap-2">
                                                        <CheckCircle2 size={13} className="text-success flex-shrink-0 mt-0.5" />
                                                        <div className="min-w-0">
                                                            <p className="text-[11px] font-semibold text-fg truncate">
                                                                {ev.tipoDocumento}
                                                            </p>
                                                            <p className="text-[10px] text-success">
                                                                Archivado en {ev.expedientes} expediente{ev.expedientes !== 1 ? 's' : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <p className="text-[11px] text-fg-muted leading-relaxed">
                                            Descarga el formato, hazlo firmar y súbelo. Se archiva en el expediente de cada participante.
                                        </p>

                                        <input
                                            ref={inputEvidenciaRef}
                                            type="file"
                                            accept="application/pdf,image/*"
                                            className="hidden"
                                            onChange={e => {
                                                const archivo = e.target.files?.[0];
                                                if (archivo) handleSubirEvidencia(archivo);
                                                e.target.value = '';
                                            }}
                                        />

                                        <div className="space-y-2">
                                            {([
                                                { tipo: TIPO_LISTA_NNA, label: 'Subir F10 firmado', requiere: 'F10' },
                                                { tipo: TIPO_LISTA_FAMILIAS, label: 'Subir F11 firmado', requiere: 'F11' },
                                                { tipo: TIPO_FOTOS, label: 'Subir fotos del taller', requiere: null },
                                            ] as const).map(op => {
                                                // No se puede subir "el F10 firmado" sin haberlo
                                                // descargado antes: el botón guía el orden del flujo.
                                                // Si ya se archivó en otra sesión, se permite reemplazar.
                                                const yaSubido = evidencias.some(ev => ev.tipoDocumento === op.tipo);
                                                const bloqueado = op.requiere !== null && !descargados.has(op.requiere) && !yaSubido;
                                                return (
                                                    <button
                                                        key={op.tipo}
                                                        type="button"
                                                        onClick={() => abrirSelectorEvidencia(op.tipo)}
                                                        disabled={subiendoEvidencia || bloqueado}
                                                        title={bloqueado ? `Descarga primero el ${op.requiere} con el botón de arriba` : undefined}
                                                        className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[11px] font-semibold transition-colors border ${
                                                            bloqueado
                                                                ? 'bg-surface-muted/40 border-border text-fg-muted/60 cursor-not-allowed'
                                                                : yaSubido
                                                                    ? 'bg-surface border-success/30 text-success hover:border-success'
                                                                    : 'bg-surface border-border text-fg hover:border-primary hover:text-primary'
                                                        } disabled:opacity-60`}
                                                    >
                                                        {subiendoEvidencia && tipoEvidenciaActivo === op.tipo
                                                            ? <Loader2 size={14} className="animate-spin" />
                                                            : yaSubido
                                                                ? <CheckCircle2 size={14} />
                                                                : <Upload size={14} />}
                                                        {yaSubido ? `${op.label.replace('Subir', 'Reemplazar')}` : op.label}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {(!descargados.has('F10') || !descargados.has('F11')) && (
                                            <p className="text-[10px] text-fg-muted italic leading-relaxed">
                                                Los botones se habilitan al descargar el formato correspondiente arriba.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1">
                                    <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
                                        <table className="w-full">
                                            <thead className="bg-surface-muted text-[11px] font-bold text-fg-muted uppercase text-left border-b border-border">
                                                <tr>
                                                    <th className="px-3 sm:px-4 py-3">PARTICIPANTE</th>
                                                    <th className="px-2 sm:px-4 py-3 text-center">ASISTENCIA</th>
                                                    {/* La evaluación F8 se hace sentado, no en campo: en el
                                                        celular estorba y aprieta las dos columnas útiles. */}
                                                    <th className="px-4 py-3 text-center hidden sm:table-cell">EVALUACIÓN F8</th>
                                                    <th className="px-4 py-3 w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {!currentTaller.participantes || currentTaller.participantes.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={4} className="p-8 text-center text-fg-muted text-xs italic">
                                                            Aún no hay participantes en la lista.
                                                        </td>
                                                    </tr>
                                                ) : [...participantesNna, ...participantesFamiliares].map((p, idx) => {
                                                    const esFamiliar = p.tipo === 'FAMILIAR';
                                                    const primerFamiliar = esFamiliar && idx === participantesNna.length;
                                                    return (
                                                    <Fragment key={`${p.tipo}-${p.id}`}>
                                                    {primerFamiliar && (
                                                        <tr className="bg-surface-muted/60">
                                                            <td colSpan={4} className="px-4 py-2 text-[10px] font-bold text-fg-muted uppercase tracking-wider">
                                                                Familias · Formato 11
                                                            </td>
                                                        </tr>
                                                    )}
                                                    <tr className="hover:bg-surface-muted/50 transition-colors">
                                                        <td className="px-4 py-3">
                                                            <p className="text-xs font-bold text-fg">
                                                                {esFamiliar
                                                                    ? (p.familiar?.nombres || `Familiar ${p.familiarId}`)
                                                                    : (p.nna ? `${p.nna.nombres} ${p.nna.apellidoPaterno}` : `Participante ${p.nnaId}`)}
                                                            </p>
                                                            {esFamiliar ? (
                                                                <p className="text-[10px] text-fg-muted mt-0.5">
                                                                    {etiquetaParentesco(p.familiar?.parentesco) || 'Familiar'}
                                                                    {p.familiar?.nnaRelacionado ? ` de ${p.familiar.nnaRelacionado}` : ''}
                                                                    {p.familiar?.dni ? ` · DNI ${p.familiar.dni}` : ''}
                                                                </p>
                                                            ) : p.logros && (
                                                                <p className="text-[10px] text-success flex items-center gap-1 mt-0.5 font-medium">
                                                                    <CheckCircle2 size={10} /> Evaluado
                                                                </p>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleAsistencia(p)}
                                                                className={`p-1 rounded-full transition-colors ${p.asistio ? 'bg-success-soft text-success' : 'bg-surface-muted text-fg-muted hover:bg-border'}`}
                                                            >
                                                                <CheckCircle2 size={24} className={!p.asistio ? "opacity-50" : ""} />
                                                            </button>
                                                        </td>
                                                        <td className="px-4 py-3 text-center hidden sm:table-cell">
                                                            {esFamiliar ? (
                                                                <span className="text-[10px] text-fg-muted italic">No aplica</span>
                                                            ) : (
                                                                <Button
                                                                    size="sm"
                                                                    variant={p.logros ? "secondary" : "ghost"}
                                                                    onClick={() => setEvaluatingParticipantId(p.nnaId!)}
                                                                    disabled={!p.asistio}
                                                                >
                                                                    <Edit size={12} /> {p.logros ? 'Editar F8' : 'Evaluar'}
                                                                </Button>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveParticipant(p)}
                                                                className="p-1 text-fg-muted hover:text-danger rounded transition-colors"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                    </Fragment>
                                                );})}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {currentTaller && (
                    <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
                        <Formato7Print taller={currentTaller} id="formato-7-print-talleres" />
                        <Formato10Print taller={currentTaller} participantes={participantesNna} id="formato-10-print-talleres" />
                        <Formato11Print taller={currentTaller} familiares={participantesFamiliares} id="formato-11-print-talleres" />
                    </div>
                )}
            </div>
        );
    }

    // Educadores que aparecen en los talleres cargados. Se saca de los datos
    // en vez de pedir la lista de usuarios: así el combo solo ofrece a quien
    // de verdad tiene talleres, y no una lista larga con opciones vacías.
    const educadoresDisponibles = Array.from(
        new Set(
            talleres
                .map(t => t.educadorResponsable?.nombreCompleto)
                .filter((n): n is string => !!n)
        )
    ).sort();

    const talleresFiltrados = talleres.filter(t => {
        if (educadorFiltro !== 'TODOS' && t.educadorResponsable?.nombreCompleto !== educadorFiltro) {
            return false;
        }
        if (estadoFiltro !== 'TODOS' && t.estado !== estadoFiltro) return false;

        if (!busqueda.trim()) return true;
        // La búsqueda cubre también al educador: quien escribe un apellido
        // espera encontrar sus talleres sin tener que usar el combo.
        const q = busqueda.toLowerCase();
        return [t.nombre, t.lugar, t.objetivo, t.educadorResponsable?.nombreCompleto]
            .some(campo => (campo || '').toLowerCase().includes(q));
    });

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            <div className="flex flex-wrap justify-between items-center gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-fg flex items-center gap-2">
                        <Presentation size={24} className="text-primary" />
                        Talleres Socioeducativos
                    </h1>
                    <p className="text-xs text-fg-muted mt-1">Planificación (F7) y evaluación grupal (F8 / F10 / F11)</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex bg-surface-muted p-1 rounded-xl border border-border">
                        <button
                            onClick={() => setViewMode('calendario')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                viewMode === 'calendario' ? 'bg-surface text-primary shadow-sm' : 'text-fg-muted hover:text-fg'
                            }`}
                        >
                            <LayoutGrid size={14} /> Calendario
                        </button>
                        <button
                            onClick={() => setViewMode('lista')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                viewMode === 'lista' ? 'bg-surface text-primary shadow-sm' : 'text-fg-muted hover:text-fg'
                            }`}
                        >
                            <ListIcon size={14} /> Listado
                        </button>
                    </div>
                    <Button onClick={() => handleNewTaller()}>
                        <Plus size={16} /> Nuevo taller
                    </Button>
                </div>
            </div>

            {viewMode === 'calendario' ? (
                <WorkshopCalendar
                    talleres={talleres}
                    onSelectTaller={handleSelectFromCalendar}
                    onNewTaller={date => handleNewTaller(date)}
                />
            ) : (
                /* Listado, no tarjetas: en una tabla los talleres se comparan
                   por fecha de un vistazo y entran muchos más en pantalla.
                   Las tarjetas gastaban un tercio del ancho por taller para
                   mostrar los mismos cinco datos. */
                <>
                <div className="bg-surface border border-border rounded-[12px] p-3 flex flex-col sm:flex-row gap-2.5 mb-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" size={15} />
                        <input
                            type="text"
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                            placeholder="Buscar por taller, educador, lugar u objetivo…"
                            className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-md text-[13px] text-fg focus:outline-none focus:border-primary transition-colors placeholder:text-fg-muted"
                        />
                    </div>

                    {/* El combo solo aparece si hay más de un educador: para un
                        educador que ve sus propios talleres, elegirse a sí
                        mismo no aporta nada. */}
                    {educadoresDisponibles.length > 1 && (
                        <select
                            value={educadorFiltro}
                            onChange={e => setEducadorFiltro(e.target.value)}
                            className="bg-surface border border-border rounded-md px-3 py-2 text-[13px] text-fg focus:outline-none focus:border-primary cursor-pointer"
                        >
                            <option value="TODOS">Todos los educadores</option>
                            {educadoresDisponibles.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    )}

                    <select
                        value={estadoFiltro}
                        onChange={e => setEstadoFiltro(e.target.value)}
                        className="bg-surface border border-border rounded-md px-3 py-2 text-[13px] text-fg focus:outline-none focus:border-primary cursor-pointer"
                    >
                        <option value="TODOS">Todos los estados</option>
                        <option value="PLANIFICADO">Planificado</option>
                        <option value="EJECUTADO">Ejecutado</option>
                        <option value="EVALUADO">Evaluado</option>
                    </select>

                    {(busqueda || educadorFiltro !== 'TODOS' || estadoFiltro !== 'TODOS') && (
                        <button
                            type="button"
                            onClick={() => { setBusqueda(''); setEducadorFiltro('TODOS'); setEstadoFiltro('TODOS'); }}
                            className="px-3 py-2 text-[12px] text-fg-secondary hover:text-fg border border-border rounded-md hover:bg-surface-muted transition-colors whitespace-nowrap"
                        >
                            Limpiar · {talleresFiltrados.length} de {talleres.length}
                        </button>
                    )}
                </div>

                <div className="bg-surface border border-border rounded-[12px] overflow-hidden">
                    {talleresFiltrados.length === 0 ? (
                        <p className="px-4 py-12 text-center text-[13px] text-fg-muted">
                            {talleres.length === 0
                                ? 'No hay talleres registrados todavía.'
                                : 'Ningún taller coincide con los filtros.'}
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-border bg-surface-muted/40">
                                        <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Fecha</th>
                                        <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Taller</th>
                                        <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-fg-muted hidden md:table-cell">Lugar</th>
                                        <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-fg-muted hidden sm:table-cell">Hora</th>
                                        <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-fg-muted hidden lg:table-cell">Educador</th>
                                        <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Estado</th>
                                        <th className="px-4 py-2.5" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {talleresFiltrados.map(taller => (
                                        <tr
                                            key={taller.id}
                                            // El ancla permite enlazar a un taller concreto
                                            // desde el bloque "Hoy" del tablero:
                                            // /talleres?tallerId=N baja hasta esta fila.
                                            id={`taller-${taller.id}`}
                                            className={`border-b border-border last:border-b-0 transition-colors ${
                                                tallerDestacado === taller.id
                                                    ? 'bg-primary-soft'
                                                    : 'hover:bg-surface-muted/50'
                                            }`}
                                        >
                                            <td className="px-4 py-3 text-[13px] text-fg-secondary whitespace-nowrap">
                                                {taller.fecha
                                                    ? new Date(taller.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: '2-digit' })
                                                    : 'S/F'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-[14px] font-medium text-fg">{taller.nombre}</p>
                                                <p className="text-[12px] text-fg-muted line-clamp-1">{taller.objetivo || 'Sin objetivo'}</p>
                                            </td>
                                            <td className="px-4 py-3 text-[13px] text-fg-secondary hidden md:table-cell">
                                                {taller.lugar || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-[13px] text-fg-secondary hidden sm:table-cell whitespace-nowrap">
                                                {taller.hora || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-[13px] text-fg-secondary hidden lg:table-cell">
                                                {taller.educadorResponsable?.nombreCompleto || '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-primary-soft text-primary whitespace-nowrap">
                                                    {taller.estado}
                                                </span>
                                            </td>
                                            {/* Acciones: llevan a la ficha que toca, sin
                                                obligar a entrar y buscar la pestaña. */}
                                            <td className="px-4 py-3 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        title="Planificación (F7)"
                                                        onClick={() => abrirTallerEn(taller, 'planificacion')}
                                                        className="p-1.5 rounded-md text-fg-muted hover:text-primary hover:bg-surface-muted transition-colors"
                                                    >
                                                        <FileText size={16} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        title="Asistencia (F10/F11)"
                                                        onClick={() => abrirTallerEn(taller, 'ejecucion')}
                                                        className="p-1.5 rounded-md text-fg-muted hover:text-primary hover:bg-surface-muted transition-colors"
                                                    >
                                                        <Users size={16} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        title={taller.evaluacionTaller?.evaluado
                                                            ? 'Evaluación (F8) — ya registrada'
                                                            : 'Evaluar el taller (F8)'}
                                                        onClick={() => abrirTallerEn(taller, 'evaluacion')}
                                                        className={`p-1.5 rounded-md transition-colors hover:bg-surface-muted ${
                                                            taller.evaluacionTaller?.evaluado
                                                                ? 'text-success'
                                                                : 'text-fg-muted hover:text-primary'
                                                        }`}
                                                    >
                                                        <ClipboardCheck size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                </>
            )}
        </div>
    );
};
