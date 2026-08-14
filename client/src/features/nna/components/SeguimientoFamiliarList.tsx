import { getToken } from '../../../utils/auth';
import { toast } from '../../../components/ui/Toast';
import React, { Fragment, useState, useEffect } from 'react';
import { Plus, Users, MapPin, X, ClipboardCheck, Pencil, FolderInput, CheckCheck, FileSignature, Save } from 'lucide-react';
import { useNnaStore } from '../../../store/nna.store';
import { useAuthStore } from '../../../store/auth.store';
import { INTERVENCION_API_URL } from '../../../config/api';
import { etiquetaParentesco, OPCIONES_VINCULO } from '../../../utils/parentesco';
import { CampoDictado } from '../../../components/ui/CampoDictado';
import { PanelFirmas } from '../../../components/ui/PanelFirmas';
import { Formato12Print } from './Formato12Print';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const LUGAR_OPTIONS = [
    { value: 'DOMICILIO',         label: 'Domicilio',       icon: '🏠' },
    { value: 'TRABAJO',           label: 'Trabajo',          icon: '💼' },
    { value: 'CENTRO_REFERENCIA', label: 'Centro de Ref.',   icon: '🏢' },
    { value: 'CALLE',             label: 'Calle',            icon: '🚶' },
];

const blankFicha = (nna: any) => ({
    zona:               '',
    entrevistado:       '',
    parentesco:         '',
    telefono:           '',
    lugarSeguimiento:   'DOMICILIO',
    direccion:          nna?.domicilioActual || '',
    fecha:              new Date().toISOString().split('T')[0],
    hora:               new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
    antecedentes:       '',
    descripcion:        '',
    acuerdos:           '',
    observaciones:      '',
    nombreUsuario:      `${nna?.nombres ?? ''} ${nna?.apellidoPaterno ?? ''}`.trim(),
});

/**
 * Educador que firma la ficha: el que tiene la sesión abierta.
 *
 * Antes era una casilla escribible que llegaba con "Usuario Actual" de relleno,
 * así que las fichas se guardaban con ese texto literal en el PDF.
 */
const educadorDeLaSesion = () => {
    const u = useAuthStore.getState().user;
    return u?.nombreCompleto || u?.nombre || '';
};

/**
 * Nombre del educador que firma una ficha ya guardada.
 *
 * Las fichas anteriores al cambio guardaron el texto de relleno "Usuario Actual"
 * en vez de un nombre, así que ese valor se descarta y se usa el de la sesión.
 */
const educadorDeLaFicha = (ficha: any): string => {
    const guardado = (ficha?.nombre_educador || ficha?.NOMBRE_EDUCADOR || '').trim();
    const esRelleno = !guardado || guardado.toLowerCase() === 'usuario actual';
    return esRelleno ? educadorDeLaSesion() : guardado;
};

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-black uppercase tracking-widest text-primary">{children}</span>
        <div className="flex-1 h-px bg-border" />
    </div>
);

/** Bloque de la fila desplegada; se omite si el campo está vacío. */
const Detalle = ({ titulo, valor }: { titulo: string; valor?: string }) =>
    !valor ? null : (
        <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-fg-muted mb-0.5">{titulo}</span>
            <p className="text-fg-2 leading-snug whitespace-pre-line">{valor}</p>
        </div>
    );

const FormField = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
        <label className="block text-[11px] font-semibold text-fg-muted uppercase tracking-wider mb-1">{label}</label>
        {children}
    </div>
);

const inputCls = "w-full px-3 py-2 text-[13px] bg-surface border border-border rounded-[6px] text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors";

export const SeguimientoFamiliarList = ({ nna, caso }: { nna: any; caso?: any }) => {
    const { saveFamiliares, fetchExpediente, uploadPhysicalDocument } = useNnaStore();
    const [expandedFichaId, setExpandedFichaId] = useState<any>(null);
    const [isRegistering, setIsRegistering]     = useState(false);
    const [isLoading, setIsLoading]             = useState(false);
    const [isSaving, setIsSaving]               = useState(false);
    const [showModal, setShowModal]             = useState(false);
    const [fichas, setFichas]                   = useState<any[]>([]);
    const [currentFicha, setCurrentFicha]       = useState<any>(blankFicha(nna));
    const [editingFicha, setEditingFicha]       = useState<any>(null);
    const [registeredIds, setRegisteredIds]     = useState<Set<number>>(new Set());

    /**
     * Familia del NNA tal como está en el Resumen del Caso (F03).
     *
     * Se lee del expediente ya cargado, no con una consulta nueva: es el mismo
     * dato que muestra "Otros Miembros de la Familia", así que si el educador
     * lo corrige ahí, aquí sale corregido.
     */
    const familiares: any[] = nna?.familiares ?? [];

    /** Ficha cuyo panel de firmas está abierto. */
    const [fichaAFirmar, setFichaAFirmar] = useState<any>(null);
    /**
     * Ficha que solo se monta fuera de pantalla para capturar su PDF, sin abrir
     * el panel: es lo que necesita "Registrar en expediente".
     */
    const [fichaParaPdf, setFichaParaPdf] = useState<any>(null);

    /** El formato oficial oculto se arma para cualquiera de los dos casos. */
    const fichaImpresa = fichaAFirmar ?? fichaParaPdf;

    /** Índice del familiar elegido; `null` = la escribe a mano. */
    const [familiarSel, setFamiliarSel]                 = useState<number | null>(null);
    const [registrarEnFamilia, setRegistrarEnFamilia]   = useState(false);

    /** Solo se ofrece dar de alta a quien no está ya en la familia. */
    const esPersonaNueva =
        familiarSel === null &&
        !!currentFicha.entrevistado?.trim() &&
        !!currentFicha.parentesco;

    const elegirFamiliar = (idx: number | null) => {
        setFamiliarSel(idx);
        setRegistrarEnFamilia(false);
        const f = idx === null ? null : familiares[idx];
        setCurrentFicha((prev: any) => ({
            ...prev,
            entrevistado: f?.nombres    ?? '',
            parentesco:   f?.parentesco ?? '',
            telefono:     f?.telefono   ?? '',
        }));
    };

    useEffect(() => {
        if (!caso?.id) return;
        const token = getToken();
        setIsLoading(true);
        fetch(`${INTERVENCION_API_URL}/seguimiento/caso/${caso.id}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.ok ? r.json() : [])
            .then(data => setFichas(Array.isArray(data) ? data : []))
            .catch(() => setFichas([]))
            .finally(() => setIsLoading(false));
    }, [caso?.id]);

    const openCreate = () => {
        setEditingFicha(null);
        setCurrentFicha(blankFicha(nna));
        setFamiliarSel(null);
        setRegistrarEnFamilia(false);
        setShowModal(true);
    };

    const openEdit = (ficha: any) => {
        setEditingFicha(ficha);
        // Si el entrevistado coincide con alguien de la familia, se deja su
        // botón marcado para que se vea de quién se trata.
        const nombreGuardado = (ficha.entrevistado || ficha.ENTREVISTADO || '').trim().toLowerCase();
        const idx = familiares.findIndex(
            (f: any) => (f.nombres || '').trim().toLowerCase() === nombreGuardado
        );
        setFamiliarSel(idx >= 0 ? idx : null);
        setRegistrarEnFamilia(false);
        const raw = (v: any) => (v ?? '').toString().split('T')[0].replace('undefined', '');
        setCurrentFicha({
            zona:             ficha.zona              || ficha.ZONA              || '',
            entrevistado:     ficha.entrevistado      || ficha.ENTREVISTADO      || '',
            parentesco:       ficha.parentesco        || ficha.PARENTESCO        || '',
            telefono:         ficha.telefono          || ficha.TELEFONO          || '',
            lugarSeguimiento: ficha.lugar_seguimiento || ficha.lugarSeguimiento  || ficha.LUGAR_SEGUIMIENTO || 'DOMICILIO',
            direccion:        ficha.direccion         || ficha.DIRECCION         || '',
            fecha:            raw(ficha.fecha         || ficha.FECHA),
            hora:             ficha.hora              || ficha.HORA              || '',
            antecedentes:     ficha.antecedentes      || ficha.ANTECEDENTES      || '',
            descripcion:      ficha.descripcion       || ficha.DESCRIPCION       || '',
            acuerdos:         ficha.acuerdos          || ficha.ACUERDOS          || '',
            observaciones:    ficha.observaciones     || ficha.OBSERVACIONES     || '',
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingFicha(null);
        setCurrentFicha(blankFicha(nna));
    };

    const handleLugarChange = (value: string) => {
        setCurrentFicha((prev: any) => ({
            ...prev,
            lugarSeguimiento: value,
            direccion: value === 'DOMICILIO' ? (nna?.domicilioActual || prev.direccion) : prev.direccion,
        }));
    };

    const up = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setCurrentFicha((prev: any) => ({ ...prev, [key]: e.target.value }));

    /** Igual que `up`, pero recibe el valor ya listo (lo usa el dictado). */
    const setCampo = (key: string, valor: string) =>
        setCurrentFicha((prev: any) => ({ ...prev, [key]: valor }));

    /**
     * Sube el entrevistado nuevo a la familia del NNA (Resumen del Caso).
     *
     * El endpoint **reemplaza** toda la familia de la carpeta con la lista que
     * recibe, así que hay que reenviar los familiares actuales junto al nuevo:
     * mandar solo el nuevo dejaría al NNA sin el resto de su familia.
     *
     * Se guarda contra `carpeta.id`, nunca contra `nna.id` — los dos viven en
     * el mismo rango de números y el equivocado escribe sobre otra familia sin
     * dar ningún error.
     */
    const agregarAFamilia = async () => {
        const carpetaId = nna?.carpeta?.id;
        if (!carpetaId) {
            toast.error('No se pudo identificar la carpeta del NNA; la persona no se agregó a la familia.');
            return;
        }
        try {
            await saveFamiliares(carpetaId, [
                ...familiares.map((f: any) => ({
                    nombres:    f.nombres,
                    parentesco: f.parentesco,
                    dni:        f.dni       || null,
                    telefono:   f.telefono  || null,
                    ocupacion:  f.ocupacion || null,
                    viveCon:    f.viveCon   || 'NO',
                })),
                {
                    nombres:    currentFicha.entrevistado.trim(),
                    parentesco: currentFicha.parentesco,
                    dni:        null,
                    telefono:   currentFicha.telefono || null,
                    ocupacion:  null,
                    viveCon:    'NO',
                },
            ]);
            if (nna?.id) await fetchExpediente(nna.id);
            toast.success(`${currentFicha.entrevistado.trim()} se agregó a la familia del NNA.`);
        } catch {
            toast.error('La ficha se guardó, pero no se pudo agregar a la persona a la familia.');
        }
    };

    /**
     * Guarda la ficha.
     *
     * `BORRADOR` deja constancia de lo escrito sin darla por cerrada: el
     * educador llena en campo, a veces sin señal ni tiempo, y perder lo
     * avanzado significa volver a visitar a la familia para reconstruirlo.
     * Una ficha en borrador no se firma ni se folia hasta finalizarla.
     */
    const handleSave = async (estado: 'BORRADOR' | 'FINALIZADA' = 'FINALIZADA') => {
        const token = getToken();
        if (!token) return;

        const payload = {
            caso_id:           caso?.id,
            zona:              currentFicha.zona,
            entrevistado:      currentFicha.entrevistado,
            parentesco:        currentFicha.parentesco,
            telefono:          currentFicha.telefono,
            lugar_seguimiento: currentFicha.lugarSeguimiento,
            direccion:         currentFicha.direccion,
            fecha:             currentFicha.fecha,
            hora:              currentFicha.hora,
            antecedentes:      currentFicha.antecedentes,
            descripcion:       currentFicha.descripcion,
            acuerdos:          currentFicha.acuerdos,
            observaciones:     currentFicha.observaciones,
            // `evaluacion`, `proxima_visita` y `fecha_termino` ya no se envían.
            // Las columnas se conservan en Oracle por las fichas ya cargadas,
            // pero el educador dejó de llenarlas: la ficha registra un hecho
            // puntual, no un proceso con cierre.
            nombre_educador:   educadorDeLaSesion(),
            estado,
        };

        setIsSaving(true);
        try {
            const isEdit = !!editingFicha;
            const url    = isEdit
                ? `${INTERVENCION_API_URL}/seguimiento/${editingFicha.id}`
                : `${INTERVENCION_API_URL}/seguimiento/caso/${caso?.id}`;

            const res = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                const saved = await res.json();
                setFichas(prev => isEdit
                    ? prev.map(f => f.id === saved.id ? saved : f)
                    : [saved, ...prev]
                );
                if (registrarEnFamilia && esPersonaNueva) await agregarAFamilia();
                toast.success(estado === 'BORRADOR'
                    ? 'Borrador guardado. Puedes continuar la ficha después.'
                    : 'Ficha de seguimiento guardada.');
            } else {
                toast.error('No se pudo guardar la ficha.');
            }
        } catch {
            toast.error('No se pudo guardar la ficha.');
        } finally {
            setIsSaving(false);
        }

        closeModal();
    };

    // ── Firmas ────────────────────────────────────────────────────────────────

    /**
     * Genera el PDF de la ficha y lo folia en el expediente.
     *
     * `firmas` trae los trazos de quienes firmaron en pantalla; vacío produce
     * la hoja en blanco para firmar con lapicero. La firma no se guarda en
     * ninguna tabla: queda estampada en el PDF, que es el documento con valor.
     */
    const construirPdf = async (
        firmas: Record<string, string>,
        soloDescargar: boolean,
        fichaExplicita?: any,
    ) => {
        // `fichaAFirmar` puede no haberse propagado todavía cuando la llamada
        // viene de "Registrar en expediente", que la fija en el mismo turno.
        const ficha = fichaExplicita ?? fichaAFirmar;
        const contenedor = document.getElementById('f12-firma-print');
        if (!contenedor || !ficha) return;

        // Un gif transparente en vez de dejar el src vacío: el navegador dibuja
        // el icono de imagen rota y saldría impreso en la ficha.
        const vacio = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        (['entrevistado', 'usuario', 'educador'] as const).forEach(clave => {
            const firma  = document.getElementById(`f12-firma-print-firma-${clave}`)  as HTMLImageElement | null;
            const huella = document.getElementById(`f12-firma-print-huella-${clave}`) as HTMLImageElement | null;
            if (firma)  firma.src  = firmas[clave]              || vacio;
            if (huella) huella.src = firmas[`${clave}-huella`]   || vacio;
        });

        /*
         * Hay que esperar a que las imágenes estén realmente decodificadas.
         *
         * Con una pausa fija html2canvas capturaba los recuadros vacíos: las
         * firmas son PNG en base64 de varios cientos de kB —el canvas se dibuja
         * a 560×224 para que no salgan pixeladas— y no siempre alcanzan a
         * pintarse en unos milisegundos.
         */
        const imagenes = Array.from(contenedor.querySelectorAll('img'));
        await Promise.all(imagenes.map(img => (
            img.complete && img.naturalWidth > 0
                ? Promise.resolve()
                : new Promise<void>(resolve => {
                    img.onload  = () => resolve();
                    img.onerror = () => resolve();
                })
        )));

        const lienzo = await html2canvas(contenedor, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: 800,
            onclone: (doc) => {
                doc.querySelectorAll('link[rel="stylesheet"], style').forEach(el => el.remove());
            },
        });

        const pdf   = new jsPDF('p', 'mm', 'a4');
        const ancho = pdf.internal.pageSize.getWidth();
        const alto  = (lienzo.height * ancho) / lienzo.width;
        pdf.addImage(lienzo.toDataURL('image/png', 1.0), 'PNG', 0, 0, ancho, alto, undefined, 'FAST');

        const fechaStr = (ficha.fecha || ficha.FECHA || '').toString().split('T')[0];
        const base     = `F12_Seguimiento_${(nna?.apellidoPaterno || '').replace(/\s+/g, '_')}_${fechaStr}`;

        if (soloDescargar) {
            pdf.save(`${base}_para_firmar.pdf`);
            return;
        }

        const hayFirmas = Object.keys(firmas).length > 0;
        const archivo   = new File(
            [pdf.output('blob')],
            `${base}${hayFirmas ? '_firmado' : ''}.pdf`,
            { type: 'application/pdf' },
        );
        await uploadPhysicalDocument(nna.id, archivo, 'FICHA DE SEGUIMIENTO FAMILIAR (FORMATO 12)', caso?.id);
        await fetchExpediente(nna.id);
    };

    const firmarEnPantalla = async (firmas: Record<string, string>) => {
        if (Object.keys(firmas).length === 0) {
            toast.error('Ninguna persona firmó todavía.');
            return;
        }
        try {
            await construirPdf(firmas, false);
            setRegisteredIds(prev => new Set(prev).add(fichaAFirmar.id));
            toast.success('Ficha firmada y registrada en el expediente digital.');
            setFichaAFirmar(null);
        } catch {
            toast.error('No se pudo generar la ficha firmada.');
        }
    };

    const descargarParaFirmar = async () => {
        try {
            await construirPdf({}, true);
        } catch {
            toast.error('No se pudo generar la ficha para imprimir.');
        }
    };

    const subirFirmadoEnPapel = async (archivo: File) => {
        try {
            await uploadPhysicalDocument(nna.id, archivo, 'FICHA DE SEGUIMIENTO FAMILIAR (FORMATO 12)', caso?.id);
            await fetchExpediente(nna.id);
            setRegisteredIds(prev => new Set(prev).add(fichaAFirmar.id));
            toast.success('Documento firmado registrado en el expediente digital.');
            setFichaAFirmar(null);
        } catch {
            toast.error('No se pudo subir el documento firmado.');
        }
    };

    /**
     * Registra la ficha en el expediente digital.
     *
     * Antes foliaba una URL al PDF que arma el servidor con reportlab, un
     * documento distinto del formato oficial: por eso el ojito del expediente
     * mostraba una ficha sin firmar aunque se acabara de firmar, y con secciones
     * —"Cierre y Evaluación"— que ya no existen en el formulario.
     *
     * Ahora se sube el mismo PDF del formato oficial que produce el panel de
     * firmas. Un solo documento, el que ve el educador es el que se archiva.
     */
    const handleRegistrarExpediente = async (ficha: any) => {
        if (registeredIds.has(ficha.id) || !caso?.id) return;

        setIsRegistering(true);
        setFichaParaPdf(ficha);   // monta el formato oficial fuera de pantalla
        try {
            // Esperar a que React pinte el formato antes de capturarlo.
            await new Promise(r => setTimeout(r, 200));
            await construirPdf({}, false, ficha);
            setRegisteredIds(prev => new Set(prev).add(ficha.id));
            toast.success('Ficha registrada en el expediente digital.');
        } catch (e) {
            console.error(e);
            toast.error('Error al registrar en el expediente digital');
        } finally {
            setFichaParaPdf(null);
            setIsRegistering(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-surface border border-border rounded-[8px] shadow-[var(--shadow-1)] px-5 py-4 flex items-center justify-between">
                <div>
                    <h3 className="text-[15px] font-semibold text-fg">Seguimiento Familiar</h3>
                    <p className="text-[12px] text-fg-secondary mt-0.5">Formato 12 · Fase 3 — Registro de visitas y consejerías</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-1.5 bg-primary text-primary-fg px-3 py-1.5 rounded-[6px] text-[13px] font-medium hover:bg-primary/90 transition-colors"
                >
                    <Plus size={15} /> Nueva Ficha (F12)
                </button>
            </div>

            {/* Lista */}
            {isLoading ? (
                <div className="bg-surface border border-border rounded-[8px] py-10 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
                    <p className="text-[12px] text-fg-muted">Cargando fichas…</p>
                </div>
            ) : fichas.length === 0 ? (
                <div className="bg-surface border-2 border-dashed border-border rounded-[8px] py-14 text-center">
                    <Users size={40} className="mx-auto mb-3 text-fg-muted opacity-40" />
                    <p className="text-[13px] font-medium text-fg-muted">Sin fichas de seguimiento registradas</p>
                    <p className="text-[12px] text-fg-muted mt-1 max-w-xs mx-auto">
                        Las fichas documentan visitas y consejerías en la Fase 3.
                    </p>
                </div>
            ) : (
                /* Tabla de registros en vez de tarjetas: un educador acumula
                   decenas de seguimientos por NNA y en mosaico no se pueden
                   recorrer por fecha ni comparar de un vistazo. La fila se
                   despliega para leer el detalle completo sin abrir la ficha. */
                <div className="bg-surface border border-border rounded-[8px] overflow-hidden">
                    <table className="w-full text-[13px]" style={{ tableLayout: 'fixed' }}>
                        <thead>
                            <tr className="bg-surface-muted text-[10px] text-fg-muted uppercase tracking-wider text-left">
                                <th style={{ width: '11%' }} className="px-3 py-2.5 font-bold">Fecha</th>
                                <th style={{ width: '14%' }} className="px-3 py-2.5 font-bold">Lugar</th>
                                <th style={{ width: '22%' }} className="px-3 py-2.5 font-bold">Entrevistado</th>
                                <th style={{ width: '43%' }} className="px-3 py-2.5 font-bold">Resultados / Compromisos</th>
                                <th style={{ width: '10%' }} className="px-3 py-2.5 font-bold text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fichas.map(ficha => {
                                const lugar      = ficha.lugar_seguimiento || ficha.lugarSeguimiento || ficha.LUGAR_SEGUIMIENTO || '';
                                const acuerdos   = ficha.acuerdos          || ficha.ACUERDOS         || '';
                                const parentesco = etiquetaParentesco(ficha.parentesco || ficha.PARENTESCO);
                                const isExpanded = expandedFichaId === ficha.id;
                                const alreadyReg = registeredIds.has(ficha.id);
                                // Las fichas anteriores a la migración no traen
                                // ESTADO: se consideran finalizadas.
                                const esBorrador = (ficha.estado || ficha.ESTADO) === 'BORRADOR';

                                return (
                                    <Fragment key={ficha.id}>
                                        <tr
                                            onClick={() => setExpandedFichaId(isExpanded ? null : ficha.id)}
                                            className={`border-t border-border cursor-pointer transition-colors align-top ${
                                                isExpanded ? 'bg-primary-soft/30' : 'hover:bg-surface-muted'
                                            }`}
                                        >
                                            <td className="px-3 py-2.5 font-semibold text-fg whitespace-nowrap">
                                                {new Date(ficha.fecha || ficha.FECHA).toLocaleDateString('es-PE')}
                                                <span className="block text-[11px] font-normal text-fg-muted">
                                                    {ficha.hora || ficha.HORA || ''}
                                                </span>
                                                {esBorrador && (
                                                    <span className="inline-block mt-1 bg-warning-soft text-warning border border-warning/20 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                                                        Borrador
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2.5 text-fg-2">
                                                <span className="flex items-center gap-1.5">
                                                    <MapPin size={12} className="text-fg-muted flex-shrink-0" />
                                                    {lugar.replace(/_/g, ' ') || '—'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 text-fg-2">
                                                <span className="font-medium text-fg">
                                                    {ficha.entrevistado || ficha.ENTREVISTADO || '(sin nombre)'}
                                                </span>
                                                {parentesco && (
                                                    <span className="block text-[11px] text-fg-muted">{parentesco}</span>
                                                )}
                                            </td>
                                            <td className={`px-3 py-2.5 text-fg-muted ${isExpanded ? '' : 'line-clamp-2'}`}>
                                                {acuerdos || <span className="italic opacity-60">Sin compromisos registrados</span>}
                                            </td>
                                            <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => openEdit(ficha)}
                                                        className="p-1.5 text-fg-muted hover:text-primary hover:bg-primary-soft rounded-[5px] transition-all"
                                                        title={esBorrador ? 'Continuar borrador' : 'Editar ficha'}
                                                    >
                                                        <Pencil size={13} />
                                                    </button>
                                                    {/* Un borrador no se firma ni se folia: iría
                                                        al expediente un documento a medio llenar. */}
                                                    <button
                                                        onClick={() => setFichaAFirmar(ficha)}
                                                        disabled={esBorrador}
                                                        className="p-1.5 text-fg-muted hover:text-primary hover:bg-primary-soft rounded-[5px] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-fg-muted"
                                                        title={esBorrador ? 'Finalice la ficha para poder firmarla' : 'Firmar ficha'}
                                                    >
                                                        <FileSignature size={13} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRegistrarExpediente(ficha)}
                                                        disabled={isRegistering || alreadyReg || esBorrador}
                                                        className={`p-1.5 rounded-[5px] transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                                                            alreadyReg
                                                                ? 'text-success bg-success-soft cursor-default'
                                                                : 'text-fg-muted hover:text-primary hover:bg-primary-soft'
                                                        }`}
                                                        title={
                                                            esBorrador ? 'Finalice la ficha para registrarla en el expediente'
                                                                : alreadyReg ? 'Ya registrada en expediente'
                                                                : 'Registrar en expediente digital'
                                                        }
                                                    >
                                                        {alreadyReg ? <CheckCheck size={14} /> : <FolderInput size={14} />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>

                                        {isExpanded && (
                                            <tr className="border-t border-border bg-primary-soft/10">
                                                <td colSpan={5} className="px-3 py-3">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-[12px]">
                                                        <Detalle titulo="Antecedentes / Motivo" valor={ficha.antecedentes || ficha.ANTECEDENTES} />
                                                        <Detalle titulo="Descripción de la visita" valor={ficha.descripcion || ficha.DESCRIPCION} />
                                                        <Detalle titulo="Observaciones" valor={ficha.observaciones || ficha.OBSERVACIONES} />
                                                        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                                            <Detalle titulo="Dirección" valor={ficha.direccion || ficha.DIRECCION} />
                                                            <Detalle titulo="Teléfono" valor={ficha.telefono || ficha.TELEFONO} />
                                                            <Detalle titulo="Zona" valor={ficha.zona || ficha.ZONA} />
                                                            <Detalle titulo="Educador" valor={ficha.nombre_educador || ficha.NOMBRE_EDUCADOR} />
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ─── Firmas ───
                Los tres firmantes del Anexo 10. Ninguno se escribe: el
                entrevistado sale de la ficha, el usuario del expediente y el
                educador de la sesión. */}
            {fichaAFirmar && (
                <>
                    <PanelFirmas
                        titulo="Firmas de la Ficha de Seguimiento Familiar"
                        subtitulo={`Formato 12 · ${new Date(fichaAFirmar.fecha || fichaAFirmar.FECHA).toLocaleDateString('es-PE')}`}
                        firmantes={[
                            {
                                clave: 'entrevistado',
                                etiqueta: 'Entrevistado',
                                rol: 'Nombre y firma del entrevistado',
                                nombre: fichaAFirmar.entrevistado || fichaAFirmar.ENTREVISTADO || '',
                                dni: familiares.find(
                                    (f: any) => (f.nombres || '').trim().toLowerCase() ===
                                        (fichaAFirmar.entrevistado || fichaAFirmar.ENTREVISTADO || '').trim().toLowerCase()
                                )?.dni,
                            },
                            {
                                clave: 'usuario',
                                etiqueta: 'Usuario/a',
                                rol: 'Nombre y firma del usuario/a',
                                nombre: `${nna?.nombres ?? ''} ${nna?.apellidoPaterno ?? ''}`.trim(),
                                dni: nna?.numeroDoc || undefined,
                            },
                            {
                                clave: 'educador',
                                etiqueta: 'Educador/a',
                                rol: 'Nombre y firma del / la educador/a',
                                nombre: educadorDeLaFicha(fichaAFirmar),
                                // El educador acredita con su firma y sello, no con huella.
                                conHuella: false,
                            },
                        ]}
                        onFirmar={firmarEnPantalla}
                        onDescargarParaFirmar={descargarParaFirmar}
                        onSubirFirmado={subirFirmadoEnPapel}
                        onClose={() => setFichaAFirmar(null)}
                    />
                </>
            )}

            {/* Formato oficial fuera de pantalla, del que se captura el PDF.
                Se monta tanto al firmar como al registrar en el expediente.
                Fuera de pantalla y no oculto: html2canvas no captura un elemento
                con display:none; y en `absolute`, no `fixed`, porque resuelve
                las coordenadas contra el documento y no contra la ventana. */}
            {fichaImpresa && (
                <div style={{ position: 'absolute', left: '-10000px', top: 0 }}>
                    <Formato12Print
                        nna={nna}
                        ficha={{
                            ...fichaImpresa,
                            nombreUsuario:  `${nna?.nombres ?? ''} ${nna?.apellidoPaterno ?? ''}`.trim(),
                            nombreEducador: educadorDeLaFicha(fichaImpresa),
                        }}
                        id="f12-firma-print"
                    />
                </div>
            )}

            {/* ─── Modal Crear / Editar ─── */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-surface rounded-[10px] shadow-3 w-full max-w-[600px] max-h-[92vh] overflow-hidden flex flex-col border border-border">

                        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-surface">
                            <div>
                                <h3 className="text-[14px] font-semibold text-fg">
                                    {editingFicha ? 'Editar Ficha de Seguimiento' : 'Nueva Ficha de Seguimiento Familiar'}
                                </h3>
                                <p className="text-[11px] text-fg-muted mt-0.5">
                                    Formato F12 · {caso?.codigoCaso || caso?.codigo_caso || 'Sin caso vinculado'}
                                </p>
                            </div>
                            <button onClick={closeModal} className="p-1.5 text-fg-muted hover:text-fg hover:bg-surface-muted rounded-[5px] transition-all">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="overflow-y-auto p-5 space-y-5 flex-1">
                            {/* Datos de la Visita */}
                            <div>
                                <SectionTitle>Datos de la Visita</SectionTitle>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <FormField label="Zona de Intervención">
                                        <input className={inputCls} value={currentFicha.zona} onChange={up('zona')} placeholder="Ej: Centro de Lima" />
                                    </FormField>
                                    <FormField label="Fecha">
                                        <input type="date" className={inputCls} value={currentFicha.fecha} onChange={up('fecha')} />
                                    </FormField>
                                </div>

                                <div className="mt-3">
                                    <FormField label="Lugar de Seguimiento">
                                        <div className="flex gap-2 flex-wrap mt-1">
                                            {LUGAR_OPTIONS.map(opt => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => handleLugarChange(opt.value)}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] border text-[12px] font-medium transition-all ${
                                                        currentFicha.lugarSeguimiento === opt.value
                                                            ? 'border-primary bg-primary-soft text-primary'
                                                            : 'border-border-strong text-fg-secondary hover:border-primary hover:text-fg'
                                                    }`}
                                                >
                                                    <span>{opt.icon}</span> {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </FormField>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                                    <FormField label="Dirección">
                                        <input className={inputCls} value={currentFicha.direccion} onChange={up('direccion')} placeholder="Dirección del lugar visitado" />
                                    </FormField>
                                    <FormField label="Hora">
                                        <input type="time" className={inputCls} value={currentFicha.hora} onChange={up('hora')} />
                                    </FormField>
                                </div>
                            </div>

                            {/* Persona Entrevistada */}
                            <div>
                                <SectionTitle>Persona Entrevistada</SectionTitle>

                                {/* La familia sale del Resumen del Caso (F03): la ficha
                                    no vuelve a pedir un dato que el expediente ya tiene. */}
                                <div className="mb-3">
                                    {familiares.length === 0 ? (
                                        <p className="text-[11px] text-fg-muted italic">
                                            Este NNA aún no tiene familiares registrados en su ficha de inscripción.
                                            Escribe los datos abajo y márcalos para agregarlos a su familia.
                                        </p>
                                    ) : (
                                        <>
                                            <label className="block text-[11px] font-semibold text-fg-muted uppercase tracking-wider mb-1">
                                                ¿A quién se entrevistó?
                                            </label>
                                            <div className="flex gap-2 flex-wrap">
                                                {familiares.map((f: any, idx: number) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => elegirFamiliar(idx)}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] border text-[12px] font-medium transition-all ${
                                                            familiarSel === idx
                                                                ? 'border-primary bg-primary-soft text-primary'
                                                                : 'border-border-strong text-fg-secondary hover:border-primary hover:text-fg'
                                                        }`}
                                                    >
                                                        <Users size={12} />
                                                        <span className="font-semibold">{etiquetaParentesco(f.parentesco)}</span>
                                                        <span className="opacity-70">· {f.nombres}</span>
                                                    </button>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => elegirFamiliar(null)}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] border text-[12px] font-medium transition-all ${
                                                        familiarSel === null
                                                            ? 'border-primary bg-primary-soft text-primary'
                                                            : 'border-border-strong text-fg-secondary hover:border-primary hover:text-fg'
                                                    }`}
                                                >
                                                    <Plus size={12} /> Otra persona
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <FormField label="Nombre Completo">
                                        <input className={inputCls} value={currentFicha.entrevistado} onChange={up('entrevistado')} placeholder="Nombre del entrevistado" />
                                    </FormField>
                                    <FormField label="Parentesco">
                                        <select className={inputCls} value={currentFicha.parentesco} onChange={up('parentesco')}>
                                            <option value="">Seleccionar…</option>
                                            {OPCIONES_VINCULO.map(o => (
                                                <option key={o.value} value={o.value}>{o.label}</option>
                                            ))}
                                            {/* Las fichas antiguas guardaron el parentesco
                                                escrito a mano; se conserva como opción para
                                                no perder el dato al editarlas. */}
                                            {currentFicha.parentesco &&
                                             !OPCIONES_VINCULO.some(o => o.value === currentFicha.parentesco) && (
                                                <option value={currentFicha.parentesco}>{currentFicha.parentesco}</option>
                                            )}
                                        </select>
                                    </FormField>
                                    <FormField label="Teléfono">
                                        <input className={inputCls} value={currentFicha.telefono} onChange={up('telefono')} placeholder="999 999 999" />
                                    </FormField>
                                </div>

                                {/* El dato sube al Resumen del Caso en vez de quedarse
                                    encerrado en esta ficha: desde la próxima visita la
                                    persona ya aparece como botón, aquí y en el F11. */}
                                {esPersonaNueva && (
                                    <label className="mt-3 flex items-start gap-2.5 px-3 py-2.5 rounded-[6px] border border-primary/30 bg-primary-soft/40 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="mt-0.5 w-4 h-4 cursor-pointer accent-primary"
                                            checked={registrarEnFamilia}
                                            onChange={e => setRegistrarEnFamilia(e.target.checked)}
                                        />
                                        <span className="text-[12px] text-fg-2 leading-snug">
                                            Agregar a <strong className="text-fg">{currentFicha.entrevistado}</strong> a la
                                            familia del NNA
                                            <span className="block text-[11px] text-fg-muted mt-0.5">
                                                Quedará registrada en el Resumen del Caso y la próxima vez podrás elegirla directamente.
                                            </span>
                                        </span>
                                    </label>
                                )}
                            </div>

                            {/* Contenido de la Visita */}
                            <div>
                                <SectionTitle>Contenido de la Visita</SectionTitle>
                                {/* Las cuatro casillas largas llevan dictado por voz,
                                    igual que la narración del Diario de Campo: el
                                    educador las llena en campo, desde el celular. */}
                                <div className="space-y-3">
                                    <CampoDictado
                                        label="Antecedentes / Motivo de la Visita"
                                        value={currentFicha.antecedentes}
                                        onChange={v => setCampo('antecedentes', v)}
                                        placeholder="Motivo o contexto de la visita…"
                                    />
                                    <CampoDictado
                                        label="Descripción de la Visita"
                                        value={currentFicha.descripcion}
                                        onChange={v => setCampo('descripcion', v)}
                                        placeholder="Relato detallado de lo ocurrido en la visita…"
                                        rows={3}
                                    />
                                    <CampoDictado
                                        label="Resultados / Compromisos"
                                        value={currentFicha.acuerdos}
                                        onChange={v => setCampo('acuerdos', v)}
                                        placeholder="Acuerdos y compromisos alcanzados con la familia…"
                                    />
                                    <CampoDictado
                                        label="Observaciones"
                                        value={currentFicha.observaciones}
                                        onChange={v => setCampo('observaciones', v)}
                                        placeholder="Observaciones adicionales…"
                                    />
                                    {/* Se quitaron "Cierre y Evaluación" y "Término del
                                        Seguimiento": la ficha registra un hecho puntual
                                        —una consejería, un acuerdo— y no un proceso con
                                        inicio y fin, así que la fecha de término y la
                                        evaluación de la visita no aplican (reunión SEC
                                        del 11/08/2026).

                                        El educador responsable tampoco se pide: es quien
                                        tiene la sesión abierta. Escribirlo a mano abría
                                        la puerta a que una ficha saliera firmada con el
                                        nombre de otro. */}
                                </div>
                            </div>
                        </div>

                        <div className="px-5 py-3 border-t border-border flex justify-end gap-2 bg-surface-muted">
                            <button
                                onClick={closeModal}
                                className="px-4 py-2 bg-surface border border-border-strong text-fg text-[13px] font-medium rounded-[6px] hover:bg-surface-muted transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleSave('BORRADOR')}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-4 py-2 bg-warning text-white text-[13px] font-medium rounded-[6px] hover:bg-warning/90 transition-colors disabled:opacity-60"
                            >
                                <Save size={14} /> Guardar Borrador
                            </button>
                            <button
                                onClick={() => handleSave('FINALIZADA')}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-fg text-[13px] font-medium rounded-[6px] hover:bg-primary/90 transition-colors disabled:opacity-60"
                            >
                                {isSaving && <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-primary-fg" />}
                                <ClipboardCheck size={14} />
                                {isSaving ? 'Guardando…' : editingFicha ? 'Actualizar Ficha' : 'Guardar Ficha'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
