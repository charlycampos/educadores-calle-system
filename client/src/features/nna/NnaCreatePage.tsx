import { useState, useEffect } from 'react';
import { useForm, useFieldArray, useWatch, FormProvider } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useNnaStore } from '../../store/nna.store';
import { MapPin, Users, Briefcase, School, HeartPulse, Home, Plus, Trash2, AlertCircle, Zap, Calendar, X, Edit2, Search, AlertTriangle, CheckCircle, XCircle, Info, Menu } from 'lucide-react';
import { clsx } from 'clsx';
import { InputField, SelectField, SectionHeader, FooterButtons } from '../../components/ui/FormFields';
import { UbigeoFields } from '../../components/forms/UbigeoFields';
import { DISCAPACIDADES_CONADIS } from '../../data/ubigeo';
import { ActividadesCalleSection } from './components/ActividadesCalleSection';
import { DuplicateDrawer } from './components/DuplicateDrawer';
import { FamiliarModal } from './components/FamiliarModal';
import { DatosGeneralesSection } from './components/DatosGeneralesSection';
import { DatosPersonalesSection } from './components/DatosPersonalesSection';
import { DatosPerfilSection } from './components/DatosPerfilSection';
import { EducacionSection } from './components/EducacionSection';
import { SaludSection } from './components/SaludSection';
import { FamiliaSection } from './components/FamiliaSection';
import { defaultAgenda } from './components/actividades.types';
import type { ActividadPerfil, AgendaSemanal } from './components/actividades.types';

import type {
    UsoTiempoDia,
    ActividadTiempoLibre,
    NnaPersonalData,
    CasoExpedienteData,
    LegacyJornadaDia,
    LegacyActividadJornada,
    LegacyActividadPerfil,
    DatosF03,
    HorariosActividad,
    NnaConDatos,
    ExpedienteNna,
    NnaPayloadItem,
    RegistrarNnaPayload,
    FamiliarFormDataItem,
    NnaFormData,
    DuplicateCheckResult
} from './types/nna-form.types';

// COMPONENTES AUXILIARES

const DuplicateSemaphore = ({ status, onClick }: { status: 'unique' | 'homonym' | 'duplicate'; onClick: () => void }) => {
    const configs = {
        unique: { color: 'bg-green-100 border-green-300', icon: '✓', label: 'Único', textColor: 'text-green-700' },
        homonym: { color: 'bg-yellow-100 border-yellow-300', icon: '⚠', label: 'Homónimos', textColor: 'text-yellow-700' },
        duplicate: { color: 'bg-red-100 border-red-300', icon: '🛑', label: 'DNI Duplicado', textColor: 'text-red-700' }
    };
    const config = configs[status];
    return (
        <button
            type="button"
            onClick={onClick}
            className={`${config.color} ${config.textColor} px-3 py-1.5 rounded-lg border font-bold text-xs flex items-center gap-1.5 hover:shadow-md transition-all cursor-pointer`}
        >
            <span>{config.icon}</span>
            <span>{config.label}</span>
        </button>
    );
};

const TimeActivityModal = ({ isOpen, onClose, onSave, initialData }: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: ActividadTiempoLibre) => void;
    initialData?: ActividadTiempoLibre;
}) => {
    const [nombre, setNombre] = useState(initialData?.nombre || '');
    const [categoria, setCategoria] = useState<ActividadTiempoLibre['categoria']>(initialData?.categoria || 'ESTUDIAR');
    const [horarios, setHorarios] = useState<HorariosActividad>(initialData?.horarios || initializeHorarios());
    const [error, setError] = useState('');

    function initializeHorarios(): HorariosActividad {
        const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const h: HorariosActividad = {};
        dias.forEach(dia => {
            h[dia] = { turno1: { inicio: '', fin: '' }, turno2: { inicio: '', fin: '' } };
        });
        return h;
    }

    const calculateHours = () => {
        const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        let total = 0;
        dias.forEach(dia => {
            const h = horarios[dia]?.turno1;
            if (h?.inicio && h?.fin) {
                const [hI, mI] = h.inicio.split(':').map(Number);
                const [hF, mF] = h.fin.split(':').map(Number);
                const minutos = (hF * 60 + mF) - (hI * 60 + mI);
                total += Math.max(0, minutos / 60);
            }
            const h2 = horarios[dia]?.turno2;
            if (h2?.inicio && h2?.fin) {
                const [hI, mI] = h2.inicio.split(':').map(Number);
                const [hF, mF] = h2.fin.split(':').map(Number);
                const minutos = (hF * 60 + mF) - (hI * 60 + mI);
                total += Math.max(0, minutos / 60);
            }
        });
        return Math.round(total * 10) / 10;
    };

    const handleQuickSelect = (tipo: 'todos' | 'lunvie' | 'sabdom' | 'limpiar') => {
        const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const nuevosHorarios = { ...horarios };
        const diaSeleccionados = tipo === 'todos' ? dias : tipo === 'lunvie' ? dias.slice(0, 5) : tipo === 'sabdom' ? dias.slice(5) : [];
        
        if (tipo === 'limpiar') {
            dias.forEach(dia => {
                nuevosHorarios[dia] = { turno1: { inicio: '', fin: '' } };
            });
        } else {
            diaSeleccionados.forEach(dia => {
                if (!nuevosHorarios[dia].turno1.inicio) {
                    nuevosHorarios[dia].turno1 = { inicio: '08:00', fin: '12:00' };
                }
            });
        }
        setHorarios(nuevosHorarios);
    };

    const handleCopySchedule = () => {
        const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const primerConHorario = dias.find(d => horarios[d]?.turno1?.inicio);
        if (!primerConHorario) return;

        const nuevosHorarios = { ...horarios };
        const templado = horarios[primerConHorario];
        dias.forEach(dia => {
            if (!nuevosHorarios[dia].turno1.inicio) {
                nuevosHorarios[dia] = templado;
            }
        });
        setHorarios(nuevosHorarios);
    };

    const handleSave = () => {
        if (!nombre.trim()) {
            setError('Por favor ingrese un nombre de actividad');
            return;
        }
        setError('');
        onSave({
            id: initialData?.id || Math.random().toString(36).substr(2, 9),
            nombre,
            categoria,
            horarios,
            horasSemana: calculateHours(),
            horasMes: Math.round(calculateHours() * 4.28 * 10) / 10
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Agregar Actividad de Tiempo Libre</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg border border-red-200 text-xs font-semibold">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Nombre de Actividad</label>
                            <input
                                type="text"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                placeholder="Ej: Estudiar, Dormir, Jugar"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Categoría</label>
                            <select
                                value={categoria}
                                onChange={(e) => setCategoria(e.target.value as ActividadTiempoLibre['categoria'])}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="ESTUDIAR">Estudiar</option>
                                <option value="DORMIR">Dormir</option>
                                <option value="JUGAR">Jugar</option>
                                <option value="DEPORTES">Deportes</option>
                                <option value="ARTE">Arte</option>
                                <option value="TAREAS">Tareas del Hogar</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={() => handleQuickSelect('todos')}
                            className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200"
                        >
                            Todos los días
                        </button>
                        <button
                            type="button"
                            onClick={() => handleQuickSelect('lunvie')}
                            className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200"
                        >
                            Lun-Vie
                        </button>
                        <button
                            type="button"
                            onClick={() => handleQuickSelect('sabdom')}
                            className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200"
                        >
                            Sáb-Dom
                        </button>
                        <button
                            type="button"
                            onClick={() => handleQuickSelect('limpiar')}
                            className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200"
                        >
                            Limpiar
                        </button>
                        <button
                            type="button"
                            onClick={handleCopySchedule}
                            className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-bold hover:bg-yellow-200 flex items-center gap-1"
                        >
                            <Zap size={14} /> Copiar Horario
                        </button>
                    </div>

                    <div className="border rounded-lg p-4 bg-gray-50">
                        <h3 className="font-bold text-sm text-gray-800 mb-4">Horarios Semanales</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((dia) => (
                                <div key={dia} className="border border-gray-200 rounded-lg p-3 bg-white">
                                    <label className="block text-xs font-bold text-gray-700 mb-2">{dia}</label>
                                    <div className="space-y-2">
                                        <div className="flex gap-2 items-center">
                                            <span className="text-xs text-gray-600 font-bold w-12">Turno 1</span>
                                            <input
                                                type="time"
                                                value={horarios[dia]?.turno1?.inicio || ''}
                                                onChange={(e) => {
                                                    const nuevo = { ...horarios };
                                                    nuevo[dia] = { ...nuevo[dia], turno1: { ...nuevo[dia].turno1, inicio: e.target.value } };
                                                    setHorarios(nuevo);
                                                }}
                                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                                            />
                                            <span className="text-xs text-gray-600">-</span>
                                            <input
                                                type="time"
                                                value={horarios[dia]?.turno1?.fin || ''}
                                                onChange={(e) => {
                                                    const nuevo = { ...horarios };
                                                    nuevo[dia] = { ...nuevo[dia], turno1: { ...nuevo[dia].turno1, fin: e.target.value } };
                                                    setHorarios(nuevo);
                                                }}
                                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                                            />
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            <span className="text-xs text-gray-600 font-bold w-12">Turno 2</span>
                                            <input
                                                type="time"
                                                value={horarios[dia]?.turno2?.inicio || ''}
                                                onChange={(e) => {
                                                    const nuevo = { ...horarios };
                                                    nuevo[dia] = { ...nuevo[dia], turno2: { inicio: e.target.value, fin: nuevo[dia].turno2?.fin || '' } };
                                                    setHorarios(nuevo);
                                                }}
                                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                                            />
                                            <span className="text-xs text-gray-600">-</span>
                                            <input
                                                type="time"
                                                value={horarios[dia]?.turno2?.fin || ''}
                                                onChange={(e) => {
                                                    const nuevo = { ...horarios };
                                                    nuevo[dia] = { ...nuevo[dia], turno2: { inicio: nuevo[dia].turno2?.inicio || '', fin: e.target.value } };
                                                    setHorarios(nuevo);
                                                }}
                                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm font-bold text-blue-900">
                            📊 Total Semanal: <span className="text-blue-600">{calculateHours()} horas</span> | 
                            Mensual: <span className="text-blue-600">{Math.round(calculateHours() * 4.28 * 10) / 10} horas</span>
                        </p>
                    </div>

                    <div className="flex gap-2 justify-end pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-bold hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
                        >
                            Guardar Actividad
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};



const VIVE_CON_OPTIONS = ['Madre', 'Padre', 'Abuelos', 'Tíos', 'Hermanos', 'Pareja', 'Hijos', 'Amigos', 'Solo en Calle', 'Albergue', 'Institución', 'Otro'] as const;
const LUGAR_PERNOCTE_OPTIONS = ['Casa Propia', 'Casa Familiar', 'Calle', 'Albergue', 'Refugio Temporal', 'Obra', 'Otro'] as const;

const normalizeCatalogText = (value: unknown): string => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

const toDateInput = (value: unknown): string => {
    if (!value) return '';
    const raw = String(value).trim();
    const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
    const directMatch = normalized.match(/^(\d{4}-\d{2}-\d{2})/);
    if (directMatch) return directMatch[1];
    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
    return '';
};

const toBoolean = (value: unknown): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    const normalized = normalizeCatalogText(value);
    if (['1', 'SI', 'S', 'TRUE', 'YES'].includes(normalized)) return true;
    if (['0', 'NO', 'N', 'FALSE'].includes(normalized)) return false;
    return Boolean(value);
};

const mapExactOption = (value: unknown, options: readonly string[]): string => {
    const normalized = normalizeCatalogText(value);
    if (!normalized) return '';
    const exact = options.find((opt) => normalizeCatalogText(opt) === normalized);
    return exact || '';
};

const normalizeViveCon = (value: unknown): string => {
    const exact = mapExactOption(value, VIVE_CON_OPTIONS);
    if (exact) return exact;
    const normalized = normalizeCatalogText(value);
    if (!normalized) return '';
    if (normalized.includes('SOLO PADRE')) return 'Padre';
    if (normalized.includes('SOLO MADRE')) return 'Madre';
    if (normalized.includes('ABUEL')) return 'Abuelos';
    if (normalized.includes('TIO')) return 'Tíos';
    if (normalized.includes('HERMAN')) return 'Hermanos';
    if (normalized.includes('PAREJA')) return 'Pareja';
    if (normalized.includes('HIJO')) return 'Hijos';
    if (normalized.includes('AMIG')) return 'Amigos';
    if (normalized.includes('SOLO') || normalized.includes('CALLE')) return 'Solo en Calle';
    if (normalized.includes('ALBERGUE')) return 'Albergue';
    if (normalized.includes('INSTITUC')) return 'Institución';
    if (normalized.includes('PADRE')) return 'Padre';
    if (normalized.includes('MADRE')) return 'Madre';
    return normalized.includes('OTRO') ? 'Otro' : '';
};

const normalizeLugarPernocte = (value: unknown): string => {
    const exact = mapExactOption(value, LUGAR_PERNOCTE_OPTIONS);
    if (exact) return exact;
    const normalized = normalizeCatalogText(value);
    if (!normalized) return '';
    if (normalized.includes('SU CASA') || normalized.includes('CASA PROPIA')) return 'Casa Propia';
    if (normalized.includes('CASA FAMILIAR') || normalized.includes('FAMILIAR')) return 'Casa Familiar';
    if (normalized.includes('CALLE') || normalized.includes('PARQUE')) return 'Calle';
    if (normalized.includes('ALBERGUE')) return 'Albergue';
    if (normalized.includes('REFUGIO') || normalized.includes('TEMPORAL') || normalized.includes('CUARTO ALQUILADO')) return 'Refugio Temporal';
    if (normalized.includes('OBRA')) return 'Obra';
    return '';
};

const SEGUROS_PREDEFINIDOS = [
    "EsSalud",
    "Seguro Privado / EPS",
    "Seguro de FF.AA. o Policiales",
    "Seguro Escolar Privado",
    "Seguro Universitario"
];

const normalizeEstudiaActualmente = (value: unknown): string => {
    if (value === null || value === undefined) return 'NO';
    const str = String(value).toUpperCase().trim();
    if (str === '1' || str === 'SI' || str === 'TRUE') return 'SI';
    if (str === '0' || str === 'NO' || str === 'FALSE') return 'NO';
    if (str === '3' || str === 'PROCESO') return 'PROCESO';
    if (str === '99' || str === 'NO_APLICA' || str === 'NO APLICA') return 'NO_APLICA';
    return str; // Dejar pasar cualquier otro valor guardado como código directo
};

const normalizeNivelEducativo = (value: unknown): string => {
    const normalized = normalizeCatalogText(value);
    if (!normalized) return '';
    // Dejar pasar códigos numéricos directos (1-11)
    if (['1','2','3','4','5','6','7','8','9','10','11'].includes(normalized)) return normalized;
    // Mapeos legacy de compatibilidad
    if (normalized.includes('INICIAL')) return '2';
    if (normalized.includes('PRIMARIA INCOMPLETA')) return '3';
    if (normalized.includes('PRIMARIA COMPLETA') || normalized === 'PRIMARIA') return '4';
    if (normalized.includes('SECUNDARIA INCOMPLETA')) return '5';
    if (normalized.includes('SECUNDARIA COMPLETA') || normalized === 'SECUNDARIA') return '6';
    if (normalized.includes('SIN NIVEL') || normalized.includes('NO ESCOLAR')) return '1';
    return normalized;
};

const normalizeModalidadEstudio = (value: unknown): string => {
    const normalized = normalizeCatalogText(value);
    if (!normalized) return '';
    // Dejar pasar códigos numéricos directos (1-6)
    if (['1','2','3','4','5','6'].includes(normalized)) return normalized;
    // Mapeos legacy de compatibilidad
    if (normalized.includes('EBR') || normalized.includes('REGULAR')) return '1';
    if (normalized.includes('EBA') || normalized.includes('ALTERNAT')) return '2';
    if (normalized.includes('EBE') || normalized.includes('ESPECIAL')) return '3';
    if (normalized.includes('CETPRO')) return '6';
    return normalized;
};

const normalizeTipoDoc = (value: unknown): string => {
    const normalized = normalizeCatalogText(value);
    if (!normalized) return '1';
    // Si ya es un código numérico válido (1-7), devolverlo tal cual
    if (['1','2','3','4','5','6','7'].includes(normalized)) return normalized;
    // Mapeo de valores legacy a código numérico SEC 2026
    if (normalized.includes('SIN DOC') || normalized === 'SIN_DOC') return '7';
    if (normalized === 'CEDULA' || normalized.includes('CARNE') || normalized.includes('EXTRANJERIA')) return '2';
    if (normalized === 'PARTIDA' || normalized.includes('ACTA') || normalized.includes('CUI')) return '5';
    if (normalized.includes('PASAPORTE')) return '3';
    if (normalized.includes('CNV') || normalized.includes('NACIDO VIVO')) return '6';
    if (normalized.includes('DNI')) return '1';
    return '1';
};

export const NnaCreatePage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { createNna, updateExpediente, fetchExpediente, selectedExpediente, error: storeError, parametros, fetchParametros, checkNnaDuplicates } = useNnaStore();

    // Hook para prellenado desde F15
    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const prefillId = queryParams.get('prefillFromUrgencia');
        if (prefillId && !id) {
            const loadPrefillData = async () => {
                try {
                    const { getPrefillF03 } = await import('../../api/urgencia.api');
                    const prefill = await getPrefillF03(Number(prefillId)) as any;
                    
                    const familiaresList: any[] = [];
                    if (prefill.tutor_nombre) {
                        familiaresList.push({
                            nombres: prefill.tutor_nombre,
                            priApeTutApo: '',
                            segApeTutApo: '',
                            nomApeTutApo: prefill.tutor_nombre,
                            tipDocTutApo: 'DNI',
                            nroDocTutApo: prefill.tutor_dni || '',
                            vinTutUsu: prefill.tutor_parentesco || '',
                            telefonoReferencia: prefill.tutor_telefono || '',
                            esTutorPrincipal: true
                        });
                    }

                    // Resetear formulario con los valores importados de F15
                    reset({
                        zonaIntervencion: prefill.lugar_pernocte || '',
                        perfil: prefill.perfil || '',
                        situacionCalle: prefill.situacion_calle || '',
                        actividadRealizada: prefill.caracteristicas || '',
                        domicilioActual: prefill.domicilio_actual || '',
                        departamentoDom: prefill.departamento_dom || '',
                        provinciaDom: prefill.provincia_dom || '',
                        distritoDom: prefill.distrito_dom || '',
                        lugarPernocte: prefill.lugar_pernocte || '',
                        detalleLugarPernocte: prefill.detalle_lugar_pernocte || '',
                        diasTrabajo: prefill.dias_trabajo || '',
                        
                        tieneTutorApo: prefill.tutor_nombre ? 'true' : 'false',
                        nomApeTutApo: prefill.tutor_nombre || '',
                        nombreTutor: prefill.tutor_nombre || '',
                        vinTutUsu: prefill.tutor_parentesco || '',
                        nroDocTutApo: prefill.tutor_dni || '',
                        tipDocTutApo: prefill.tutor_dni ? 'DNI' : '',
                        viveCon: prefill.vive_con || '3',
                        detalleViveCon: prefill.detalle_vive_con || '',
                        
                        familiares: familiaresList,
                        nnas: [{
                            nombres: prefill.nombres || '',
                            apellidoPaterno: prefill.apellido_paterno || '',
                            apellidoMaterno: prefill.apellido_materno || '',
                            tipoDoc: prefill.tipo_doc || '7',
                            numeroDoc: prefill.numero_doc || '',
                            fechaNacimiento: prefill.fecha_nacimiento || '',
                            sexo: prefill.sexo || '',
                            edad: prefill.edad || '',
                            unidadEdad: prefill.unidad_edad || 'ANIOS',
                            tienePartidaNacimiento: prefill.tiene_partida_nacimiento ? "true" : "false",
                            estudiaActualmente: prefill.estudia_actualmente !== undefined ? prefill.estudia_actualmente : 0,
                            nivelEducativo: prefill.nivel_educativo || '',
                            gradoEstudio: prefill.grado_estudio || '',
                            institucionEducativa: prefill.institucion_educativa || '',
                            modalidadEstudio: prefill.modalidad_estudio || '',
                            detalleNoEstudia: prefill.detalle_no_estudia || '',
                            afiliadoSIS: prefill.afiliado_sis || 'NO_SABE',
                            afiliadoOtroSeguro: prefill.afiliado_otro_seguro || 'NO',
                            detalleOtroSeguro: prefill.detalle_otro_seguro || '',
                            observacionesSalud: prefill.observaciones_salud || '',
                            usoTiempo: {} as any,
                            actividadesTiempoLibreLista: []
                        }],
                        // Almacenamos el urgencia_id para asociarlo luego de registrar
                        urgencia_id: prefill.urgencia_id,
                        actividadesCalle: prefill.datos_extra?.actividadesCalle || []
                    });
                    
                    if (prefill.datos_extra?.actividadesCalle && prefill.datos_extra.actividadesCalle.length > 0) {
                        replaceActividadesCalle(prefill.datos_extra.actividadesCalle);
                    }
                    
                    // Mapear sección actual
                    setActiveSection('paso2_personales');
                } catch (err) {
                    console.error("Error al prellenar desde Urgencia:", err);
                }
            };
            loadPrefillData();
        }
    }, [id]);

    useEffect(() => {
        fetchParametros();
    }, [fetchParametros]);
    const [submitting, setSubmitting] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [activeSection, setActiveSection] = useState('paso1_generales');
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [showTimeActivityModal, setShowTimeActivityModal] = useState(false);
    const [editingActivityIndex, setEditingActivityIndex] = useState<number | null>(null);
    const [showDuplicateDrawer, setShowDuplicateDrawer] = useState(false);
    const [duplicateCheckResults, setDuplicateCheckResults] = useState<DuplicateCheckResult | null>(null);
    const [currentNnaIndexForDuplicate, setCurrentNnaIndexForDuplicate] = useState<number>(0);
    const [showTutorModal, setShowTutorModal] = useState(false);
    const [editingFamiliarIndex, setEditingFamiliarIndex] = useState<number | null>(null);
    const [isCheckingDuplicates, setIsCheckingDuplicates] = useState<boolean>(false);
    const [alertModal, setAlertModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'success' | 'warning' | 'error' | 'info';
        onConfirm?: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });

    const showAlert = (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info', onConfirm?: () => void) => {
        setAlertModal({ isOpen: true, title, message, type, onConfirm });
    };
    const handleSaveFamiliar = (finalFamiliar: FamiliarFormDataItem) => {
        let updatedList = [...(watch('familiares') || [])];

        if (editingFamiliarIndex !== null) {
            updatedList[editingFamiliarIndex] = finalFamiliar;
        } else {
            updatedList.push(finalFamiliar);
        }

        const isTutor = finalFamiliar.esTutorPrincipal === 'true' || finalFamiliar.esTutorPrincipal === true;
        if (isTutor) {
            // Mark all others as non-tutor principal
            updatedList = updatedList.map((fam, idx) => {
                if (editingFamiliarIndex !== null && idx === editingFamiliarIndex) return fam;
                if (editingFamiliarIndex === null && idx === updatedList.length - 1) return fam;
                return { ...fam, esTutorPrincipal: 'false' };
            });

            const parts = [
                finalFamiliar.priApeTutApo || '',
                finalFamiliar.segApeTutApo || '',
                finalFamiliar.nomApeTutApo || finalFamiliar.nombres || ''
            ];
            const fullName = parts.map(p => p.trim()).filter(Boolean).join(' ');
            setValue('tieneTutorApo', 'true');
            setValue('priApeTutApo', finalFamiliar.priApeTutApo || '');
            setValue('segApeTutApo', finalFamiliar.segApeTutApo || '');
            setValue('nomApeTutApo', finalFamiliar.nomApeTutApo || '');
            setValue('sexoApo', finalFamiliar.sexoApo || '');
            setValue('fechaNacApo', finalFamiliar.fechaNacApo || '');
            setValue('nacionalidadApo', finalFamiliar.nacionalidadApo || 'PERUANA');
            setValue('tipDocTutApo', finalFamiliar.tipDocTutApo || 'DNI');
            setValue('nroDocTutApo', finalFamiliar.nroDocTutApo || '');
            setValue('vinTutUsu', finalFamiliar.vinTutUsu || '');
            setValue('lenMatApo', finalFamiliar.lenMatApo || 'CASTELLANO');
            setValue('lenMatEspApo', finalFamiliar.lenMatEspApo || '');
            setValue('autIdeEtApo', finalFamiliar.autIdeEtApo || 'MESTIZO');
            setValue('autIdeEtEspApo', finalFamiliar.autIdeEtEspApo || '');
            setValue('tipoDiscapApo', finalFamiliar.tipoDiscapApo || '');
            setValue('certDiscapApo', finalFamiliar.certDiscapApo || 'NO');
            setValue('nombreTutor', fullName);
        } else {
            // Check if there is any other tutor left
            const anyTutorLeft = updatedList.some(f => f.esTutorPrincipal === 'true' || f.esTutorPrincipal === true);
            if (!anyTutorLeft) {
                setValue('tieneTutorApo', 'false');
                setValue('priApeTutApo', '');
                setValue('segApeTutApo', '');
                setValue('nomApeTutApo', '');
                setValue('sexoApo', '');
                setValue('fechaNacApo', '');
                setValue('nacionalidadApo', 'PERUANA');
                setValue('tipDocTutApo', 'DNI');
                setValue('nroDocTutApo', '');
                setValue('vinTutUsu', '');
                setValue('lenMatApo', 'CASTELLANO');
                setValue('lenMatEspApo', '');
                setValue('autIdeEtApo', 'MESTIZO');
                setValue('autIdeEtEspApo', '');
                setValue('tipoDiscapApo', '');
                setValue('certDiscapApo', 'NO');
                setValue('nombreTutor', '');
            }
        }

        setValue('familiares', updatedList);
        replaceFamiliares(updatedList);
        setShowTutorModal(false);
        setEditingFamiliarIndex(null);
    };

    const sections = [
        { id: 'paso1_generales', label: 'I. Datos Generales', icon: MapPin, description: 'Intervención y Fechas' },
        { id: 'paso2_personales', label: 'II. Datos Personales', icon: Users, description: 'Identidad, Domicilio y Contacto' },
        { id: 'paso3_perfil', label: 'III. Datos Perfil', icon: Briefcase, description: 'Actividad en Calle' },
        { id: 'paso4_educacion', label: 'IV. Educación', icon: School, description: 'Situación Educativa' },
        { id: 'paso5_salud', label: 'V. Salud', icon: HeartPulse, description: 'Seguro y Discapacidad' },
        { id: 'paso6_familia', label: 'VI. Familia / Otros', icon: Home, description: 'Vivienda y Observaciones' },
    ];

    const methods = useForm<NnaFormData>({
        defaultValues: {
             nnas: [{
                 nombres: '', apellidoPaterno: '', apellidoMaterno: '', numeroDoc: '', fechaNacimiento: '',
                 tipoDoc: '', sexo: '', estudiaActualmente: '', tieneDiscapacidad: false,
                 tienePartidaNacimiento: "true",
                 edad: '',
                 unidadEdad: 'ANIOS',
                 nacionalidad: 'PERUANA',
                 lenMatNna: '',
                 lenMatEspNna: '',
                 autIdeEtNna: '',
                 autIdeEtEspNna: '',
                 certDiscapNna: '',
                 detalleDiscapacidad: '',
                 usoTiempo: {} as Record<string, UsoTiempoDia>,
                 actividadesTiempoLibreLista: []
             }],
             situacionCalle: '',
             perfil: '',
             victimaExplotacion: 'NO',
             condicion: '',
             diasTrabajo: '',
             tieneHermanos: 'false',
             cantHermanos: 0,
             detallesHermanos: '',
             tieneTutorApo: 'false',
             priApeTutApo: '',
             segApeTutApo: '',
             nomApeTutApo: '',
             sexoApo: '',
             fechaNacApo: '',
             nacionalidadApo: 'PERUANA',
             tipDocTutApo: '',
             nroDocTutApo: '',
             vinTutUsu: '',
             lenMatApo: '',
             lenMatEspApo: '',
             autIdeEtApo: '',
             autIdeEtEspApo: '',
             tipoDiscapApo: '',
             certDiscapApo: '',
             familiares: [],
             actividadesCalle: []
        }
    });
    const { register, control, handleSubmit, watch, setValue, reset, getValues, formState: { errors } } = methods;

    const { fields, append, remove } = useFieldArray({ control, name: "nnas" });
    const { replace: replaceActividadesCalle } = useFieldArray({ control, name: "actividadesCalle" });
    const { fields: familiaresFields, replace: replaceFamiliares } = useFieldArray({ control, name: "familiares" });
    const nnasList = useWatch({ control, name: "nnas" });

    // Auto-calcular edad y unidad_edad basado en la fechaNacimiento
    useEffect(() => {
        if (!nnasList) return;
        nnasList.forEach((nna, index) => {
            const fechaStr = nna?.fechaNacimiento;
            if (fechaStr) {
                const fechaNac = new Date(fechaStr + 'T00:00:00');
                if (!isNaN(fechaNac.getTime())) {
                    const hoy = new Date();
                    let edadCalculada = hoy.getFullYear() - fechaNac.getFullYear();
                    const m = hoy.getMonth() - fechaNac.getMonth();
                    if (m < 0 || (m === 0 && hoy.getDate() < fechaNac.getDate())) {
                        edadCalculada--;
                    }

                    let edadFinal = edadCalculada;
                    let unidadFinal = 'ANIOS';

                    if (edadCalculada < 0) {
                        edadFinal = 0;
                        unidadFinal = 'ANIOS';
                    } else if (edadCalculada === 0) {
                        const diffTime = Math.abs(hoy.getTime() - fechaNac.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        const diffMonths = Math.floor(diffDays / 30.44);

                        if (diffMonths > 0) {
                            edadFinal = diffMonths;
                            unidadFinal = 'MESES';
                        } else {
                            edadFinal = diffDays;
                            unidadFinal = 'DIAS';
                        }
                    }

                    const edadActual = nnasList[index]?.edad;
                    const unidadActual = nnasList[index]?.unidadEdad;
                    if (String(edadActual) !== String(edadFinal)) {
                        setValue(`nnas.${index}.edad` as const, edadFinal);
                    }
                    if (unidadActual !== unidadFinal) {
                        setValue(`nnas.${index}.unidadEdad` as const, unidadFinal);
                    }
                }
            }
        });
    }, [nnasList, setValue]);

    useEffect(() => {
        if (id) {
            setIsEditMode(true);
            fetchExpediente(Number(id));
        }
    }, [id, fetchExpediente]);

    useEffect(() => {
        if (isEditMode && selectedExpediente && selectedExpediente.length > 0) {
            const expediente = selectedExpediente as unknown as ExpedienteNna[];
            const mainNna = expediente[0];
            const activeCase = mainNna.casos?.find((c) => c.estado !== 'CERRADO') || mainNna.casos?.[0];

            const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
            const emptyUso = (): Record<string, UsoTiempoDia> => {
                const u: Record<string, UsoTiempoDia> = {};
                DIAS.forEach(d => { u[d] = { estudiar: 0, trabajar: 0, dormir: 0, jugar: 0 }; });
                return u;
            };

            const parseUsoTiempo = (nna: ExpedienteNna): Record<string, UsoTiempoDia> => {
                if (nna.datosF03) {
                    try {
                        const parsed: DatosF03 = typeof nna.datosF03 === 'string' ? JSON.parse(nna.datosF03) : nna.datosF03;
                        if (parsed?.usoTiempo) return parsed.usoTiempo;
                        if (parsed?.grid) return parsed.grid;
                    } catch {
                        return emptyUso();
                    }
                }
                const saved = nna.actividadesTiempoLibre || '';
                if (saved.startsWith('JSON:')) {
                    try {
                        const parts = saved.split(' | ');
                        const parsed: DatosF03 = JSON.parse(parts[0].slice(5));
                        if (parsed?.usoTiempo) return parsed.usoTiempo;
                        if (parsed?.grid) return parsed.grid;
                    } catch {
                        return emptyUso();
                    }
                }
                return emptyUso();
            };

            const parseActividadesTiempoLibre = (nna: ExpedienteNna): ActividadTiempoLibre[] => {
                if (nna.datosF03) {
                    try {
                        const parsed: DatosF03 = typeof nna.datosF03 === 'string' ? JSON.parse(nna.datosF03) : nna.datosF03;
                        if (parsed?.actividadesTiempoLibreLista && Array.isArray(parsed.actividadesTiempoLibreLista)) {
                            return parsed.actividadesTiempoLibreLista;
                        }
                    } catch {
                        return [];
                    }
                }
                const saved = nna.actividadesTiempoLibre || '';
                if (saved.startsWith('JSON:')) {
                    try {
                        const parts = saved.split(' | ');
                        const parsed: DatosF03 = JSON.parse(parts[0].slice(5));
                        if (parsed?.actividadesTiempoLibreLista && Array.isArray(parsed.actividadesTiempoLibreLista)) {
                            return parsed.actividadesTiempoLibreLista;
                        }
                    } catch {
                        return [];
                    }
                }
                return [];
            };

            const normalizeDiaKey = (dia: string): keyof AgendaSemanal | null => {
                const key = normalizeText(dia)
                    .replace(/[.\-_]+/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();

                if (['lunes', 'lun'].includes(key)) return 'lunes';
                if (['martes', 'mar'].includes(key)) return 'martes';
                if (['miercoles', 'mier', 'mie'].includes(key)) return 'miercoles';
                if (['jueves', 'jue'].includes(key)) return 'jueves';
                if (['viernes', 'vie'].includes(key)) return 'viernes';
                if (['sabado', 'sab'].includes(key)) return 'sabado';
                if (['domingo', 'dom'].includes(key)) return 'domingo';
                return null;
            };

            const normalizeHorario = (value: unknown, fallback = ''): string =>
                typeof value === 'string' && value.trim() ? value : fallback;

            const hasHorarioValue = (value: unknown): boolean =>
                typeof value === 'string' && value.trim().length > 0;

            const inferActivoFromHorario = (horarioDia: Record<string, unknown>): boolean =>
                hasHorarioValue(horarioDia.turno1Inicio) ||
                hasHorarioValue(horarioDia.inicio) ||
                hasHorarioValue(horarioDia.turno1Fin) ||
                hasHorarioValue(horarioDia.fin) ||
                hasHorarioValue(horarioDia.turno2Inicio) ||
                hasHorarioValue(horarioDia.inicio2) ||
                hasHorarioValue(horarioDia.turno2Fin) ||
                hasHorarioValue(horarioDia.fin2);

            const resolveActivo = (horarioDia: Record<string, unknown>, defaultWhenMissing = false): boolean => {
                const hasActivoProp = Object.prototype.hasOwnProperty.call(horarioDia, 'activo');
                if (hasActivoProp) {
                    return toBoolean(horarioDia.activo);
                }
                return inferActivoFromHorario(horarioDia) || defaultWhenMissing;
            };

            const hasActiveAgenda = (agenda?: AgendaSemanal): boolean =>
                !!agenda && Object.values(agenda).some((dia) => Boolean(dia?.activo));

            const normalizeAgenda = (agendaData: unknown): AgendaSemanal => {
                const agenda = buildDefaultAgenda();
                if (!agendaData || typeof agendaData !== 'object') {
                    return agenda;
                }

                Object.entries(agendaData as Record<string, unknown>).forEach(([dia, value]) => {
                    const diaKey = normalizeDiaKey(dia);
                    if (!diaKey || !value || typeof value !== 'object') {
                        return;
                    }

                    const horarioDia = value as Record<string, unknown>;
                    agenda[diaKey] = {
                        ...agenda[diaKey],
                        activo: resolveActivo(horarioDia),
                        turno1Inicio: normalizeHorario(horarioDia.turno1Inicio ?? horarioDia.inicio, agenda[diaKey].turno1Inicio),
                        turno1Fin: normalizeHorario(horarioDia.turno1Fin ?? horarioDia.fin, agenda[diaKey].turno1Fin),
                        turno2Inicio: normalizeHorario(horarioDia.turno2Inicio ?? horarioDia.inicio2),
                        turno2Fin: normalizeHorario(horarioDia.turno2Fin ?? horarioDia.fin2)
                    };
                });

                return agenda;
            };

            const buildAgendaFromLegacy = (
                legacyJornada?: LegacyActividadJornada[],
                jornadaSemanal?: Record<string, LegacyJornadaDia>
            ): AgendaSemanal => {
                const agenda = buildDefaultAgenda();

                if (Array.isArray(legacyJornada) && legacyJornada.length > 0) {
                    legacyJornada.forEach((jornadaDia) => {
                        const diaKey = normalizeDiaKey(String(jornadaDia?.dia || ''));
                        if (!diaKey) return;

                        const jornadaDiaRecord = (jornadaDia || {}) as Record<string, unknown>;
                        agenda[diaKey] = {
                            ...agenda[diaKey],
                            activo: resolveActivo(jornadaDiaRecord, true),
                            turno1Inicio: normalizeHorario(jornadaDia?.inicio, agenda[diaKey].turno1Inicio),
                            turno1Fin: normalizeHorario(jornadaDia?.fin, agenda[diaKey].turno1Fin),
                            turno2Inicio: normalizeHorario(jornadaDia?.inicio2),
                            turno2Fin: normalizeHorario(jornadaDia?.fin2)
                        };
                    });

                    if (hasActiveAgenda(agenda)) {
                        return agenda;
                    }
                }

                Object.entries(jornadaSemanal || {}).forEach(([dia, jornadaDia]) => {
                    const diaKey = normalizeDiaKey(dia);
                    if (!diaKey || !jornadaDia || typeof jornadaDia !== 'object') return;

                    const jornadaDiaRecord = jornadaDia as unknown as Record<string, unknown>;
                    agenda[diaKey] = {
                        ...agenda[diaKey],
                        activo: resolveActivo(jornadaDiaRecord),
                        turno1Inicio: normalizeHorario(jornadaDia?.inicio, agenda[diaKey].turno1Inicio),
                        turno1Fin: normalizeHorario(jornadaDia?.fin, agenda[diaKey].turno1Fin),
                        turno2Inicio: normalizeHorario(jornadaDia?.inicio2),
                        turno2Fin: normalizeHorario(jornadaDia?.fin2)
                    };
                });

                return agenda;
            };

            const parseLegacyActividadesCalle = (parsed: DatosF03): ActividadPerfil[] => {
                const legacyActividades = Array.isArray(parsed?.actividadesPerfil) ? parsed.actividadesPerfil : [];
                if (legacyActividades.length === 0) {
                    return [];
                }

                const jornadaSemanal = parsed.jornadaSemanal || parsed.jornada_semanal || {};

                return legacyActividades.map((legacyActividad) => {
                    const actividadNormalizada = normalizeActividadCalle(String(legacyActividad?.actividad || ''));
                    const agenda = buildAgendaFromLegacy(legacyActividad?.jornada, jornadaSemanal);

                    const tiempoValorRaw = legacyActividad?.tiempoValor;
                    const tiempoDetalleRaw = legacyActividad?.tiempoDetalle;
                    const tiempoValor = tiempoValorRaw !== undefined && tiempoValorRaw !== null
                        ? String(tiempoValorRaw)
                        : (tiempoDetalleRaw ? String(tiempoDetalleRaw) : '');
                    const tiempoUnidad = legacyActividad?.tiempoUnidad || (tiempoDetalleRaw ? 'Detalle' : 'Meses');

                    return {
                        actividad: actividadNormalizada.actividad,
                        actividadEspecifique: actividadNormalizada.actividadEspecifique,
                        acompanamiento: legacyActividad?.condicion || 'SOLO',
                        tiempoValor,
                        tiempoUnidad,
                        agenda
                    };
                });
            };

            const parseActividadesCalleFromDatos = (parsed: DatosF03): ActividadPerfil[] => {
                if (!parsed?.actividadesCalle || !Array.isArray(parsed.actividadesCalle) || parsed.actividadesCalle.length === 0) {
                    return [];
                }

                const jornadaSemanal = parsed.jornadaSemanal || parsed.jornada_semanal || {};
                const legacyActividades = Array.isArray(parsed.actividadesPerfil) ? parsed.actividadesPerfil : [];

                return parsed.actividadesCalle.map((actividad, index) => {
                    const actividadRecord = (actividad || {}) as unknown as Record<string, unknown>;
                    const agendaFromActividad = normalizeAgenda(actividadRecord.agenda);
                    const agendaFromActividadJornada = buildAgendaFromLegacy(
                        Array.isArray(actividadRecord.jornada) ? (actividadRecord.jornada as LegacyActividadJornada[]) : undefined,
                        jornadaSemanal
                    );
                    const agendaFromActividadSemanal = buildAgendaFromLegacy(
                        undefined,
                        (actividadRecord.jornadaSemanal || actividadRecord.jornada_semanal) as Record<string, LegacyJornadaDia> | undefined
                    );
                    const agendaFromLegacyIndex = buildAgendaFromLegacy(legacyActividades[index]?.jornada, jornadaSemanal);

                    const actividadActual = normalizeActividadCalle(String(actividadRecord.actividad || ''));
                    const legacyByName = legacyActividades.find((legacyActividad) => {
                        const legacyNormalizada = normalizeActividadCalle(String(legacyActividad?.actividad || ''));
                        if (legacyNormalizada.actividad === actividadActual.actividad && actividadActual.actividad !== 'Otro (especificar)') {
                            return true;
                        }

                        const currentSpec = normalizeText(String(actividadRecord.actividadEspecifique || ''));
                        const legacySpec = normalizeText(String(legacyActividad?.actividad || ''));
                        return Boolean(currentSpec) && currentSpec === legacySpec;
                    });
                    const agendaFromLegacyName = buildAgendaFromLegacy(legacyByName?.jornada, jornadaSemanal);
                    const agendaFromGlobal = buildAgendaFromLegacy(undefined, jornadaSemanal);

                    const agendaCandidates = [
                        agendaFromActividad,
                        agendaFromActividadJornada,
                        agendaFromActividadSemanal,
                        agendaFromLegacyIndex,
                        agendaFromLegacyName,
                        agendaFromGlobal
                    ];
                    const resolvedAgenda = agendaCandidates.find((agendaCandidate) => hasActiveAgenda(agendaCandidate)) || agendaFromActividad;

                    return {
                        ...actividad,
                        agenda: resolvedAgenda
                    };
                });
            };

            const parseActividadesCalle = (nna: ExpedienteNna): ActividadPerfil[] => {
                if (nna.datosF03) {
                    try {
                        const parsed: DatosF03 = typeof nna.datosF03 === 'string' ? JSON.parse(nna.datosF03) : nna.datosF03;
                        const actividadesCalle = parseActividadesCalleFromDatos(parsed);
                        if (actividadesCalle.length > 0) {
                            return actividadesCalle;
                        }

                        const legacyActividades = parseLegacyActividadesCalle(parsed);
                        if (legacyActividades.length > 0) {
                            return legacyActividades;
                        }
                    } catch {
                        return [];
                    }
                }
                const saved = nna.actividadesTiempoLibre || '';
                if (saved.startsWith('JSON:')) {
                    try {
                        const parts = saved.split(' | ');
                        const parsed: DatosF03 = JSON.parse(parts[0].slice(5));
                        const actividadesCalle = parseActividadesCalleFromDatos(parsed);
                        if (actividadesCalle.length > 0) {
                            return actividadesCalle;
                        }

                        const legacyActividades = parseLegacyActividadesCalle(parsed);
                        if (legacyActividades.length > 0) {
                            return legacyActividades;
                        }
                    } catch {
                        return [];
                    }
                }
                return [];
            };

            const OPCIONES_ACTIVIDAD_CALLE = [
                'Venta de golosinas',
                'Venta de productos en transporte',
                'Limpieza de parabrisas',
                'Lustrabotas',
                'Reciclaje',
                'Mendicidad',
                'Malabares / Arte callejero',
                'Otro (especificar)'
            ] as const;

            const normalizeText = (value: string): string => value
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .trim();

            const normalizeActividadCalle = (actividad: string): { actividad: string; actividadEspecifique?: string } => {
                const cleanActividad = actividad.trim();
                if (!cleanActividad) {
                    return { actividad: '' };
                }

                const exactMatch = OPCIONES_ACTIVIDAD_CALLE.find((opt) => normalizeText(opt) === normalizeText(cleanActividad));
                if (exactMatch) {
                    return { actividad: exactMatch };
                }

                const normalized = normalizeText(cleanActividad);
                if (/(dulces|golosinas|caramelos)/.test(normalized)) return { actividad: 'Venta de golosinas' };
                if (/(transporte|bus|micro|vehiculo)/.test(normalized)) return { actividad: 'Venta de productos en transporte' };
                if (/parabris/.test(normalized)) return { actividad: 'Limpieza de parabrisas' };
                if (/lustrabot/.test(normalized)) return { actividad: 'Lustrabotas' };
                if (/recicl/.test(normalized)) return { actividad: 'Reciclaje' };
                if (/mendig/.test(normalized)) return { actividad: 'Mendicidad' };
                if (/(malabar|arte callejer)/.test(normalized)) return { actividad: 'Malabares / Arte callejero' };

                return { actividad: 'Otro (especificar)', actividadEspecifique: cleanActividad };
            };

            const buildDefaultAgenda = (): AgendaSemanal => ({
                lunes: { ...defaultAgenda.lunes },
                martes: { ...defaultAgenda.martes },
                miercoles: { ...defaultAgenda.miercoles },
                jueves: { ...defaultAgenda.jueves },
                viernes: { ...defaultAgenda.viernes },
                sabado: { ...defaultAgenda.sabado },
                domingo: { ...defaultAgenda.domingo }
            });

            const parseActividadesCalleFromCaso = (caso?: CasoExpedienteData): ActividadPerfil[] => {
                const rawActividad = (caso?.actividadRealizada || '').trim();
                if (!rawActividad) {
                    return [];
                }

                return rawActividad
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean)
                    .map((item) => {
                        const actividadNormalizada = normalizeActividadCalle(item);
                        return {
                            actividad: actividadNormalizada.actividad,
                            actividadEspecifique: actividadNormalizada.actividadEspecifique,
                            acompanamiento: caso?.condicion || 'SOLO',
                            tiempoValor: caso?.tiempoEnCalle || '',
                            tiempoUnidad: 'Detalle',
                            agenda: buildDefaultAgenda()
                        };
                    });
            };

            const mappedNnas: NnaConDatos[] = expediente.map((nna) => ({
                id: nna.id,
                nombres: nna.nombres || '',
                apellidoPaterno: nna.apellidoPaterno || '',
                apellidoMaterno: nna.apellidoMaterno || '',
                numeroDoc: nna.numeroDoc || '',
                fechaNacimiento: toDateInput(nna.fechaNacimiento),
                tipoDoc: normalizeTipoDoc(nna.tipoDoc),
                sexo: nna.sexo || '',
                edad: nna.edad !== null && nna.edad !== undefined ? nna.edad : '',
                unidadEdad: nna.unidadEdad || 'ANIOS',
                nacionalidad: nna.nacionalidad || 'PERUANA',
                lenMatNna: nna.lenMatNna || '10',
                lenMatEspNna: nna.lenMatEspNna || '',
                autIdeEtNna: nna.autIdeEtNna || '7',
                autIdeEtEspNna: nna.autIdeEtEspNna || '',
                certDiscapNna: nna.certDiscapNna || '99',
                detalleDiscapacidad: nna.detalleDiscapacidad || '',
                tienePartidaNacimiento: toBoolean(nna.tienePartidaNacimiento) ? "true" : "false",
                detalleSinDoc: nna.detalleSinDoc || '',

                departamentoNac: nna.departamentoNac || '',
                provinciaNac: nna.provinciaNac || '',
                distritoNac: nna.distritoNac || '',

                estudiaActualmente: normalizeEstudiaActualmente(nna.estudiaActualmente),
                nivelEducativo: normalizeNivelEducativo(nna.nivelEducativo),
                gradoEstudio: nna.gradoEstudio || '',
                institucionEducativa: nna.institucionEducativa || '',
                modalidadEstudio: normalizeModalidadEstudio(nna.modalidadEstudio),
                detalleNoEstudia: nna.detalleNoEstudia || '',

                afiliadoSIS: nna.afiliadoSIS || '',
                afiliadoOtroSeguro: nna.afiliadoOtroSeguro || '',
                detalleOtroSeguro: nna.detalleOtroSeguro || '',
                sufreEnfermedad: toBoolean(nna.sufreEnfermedad) ? 'SI' : 'NO',
                detalleEnfermedad: nna.detalleEnfermedad || '',
                observacionesSalud: nna.observacionesSalud || '',
                tieneDiscapacidad: toBoolean(nna.tieneDiscapacidad),
                tipoDiscapacidad: nna.tipoDiscapacidad || '',

                actividadesTiempoLibre: nna.actividadesTiempoLibre || '',
                caracteristicas: nna.caracteristicas || '',
                tieneAntecedenteAlbergue: toBoolean(nna.tieneAntecedenteAlbergue),
                detalleAntecedenteAlbergue: nna.detalleAntecedenteAlbergue || '',
                usoTiempo: parseUsoTiempo(nna),
                actividadesTiempoLibreLista: parseActividadesTiempoLibre(nna)
            }));

            // Parsear actividades antes del reset
            const actividadesCalleDataFromF03 = parseActividadesCalle(mainNna);
            const actividadesCalleData = actividadesCalleDataFromF03.length > 0
                ? actividadesCalleDataFromF03
                : parseActividadesCalleFromCaso(activeCase);
            const mainNnaAny = mainNna as any;
            const loadedFamiliares = mainNnaAny.familiares || [];
            const mappedFamiliares: FamiliarFormDataItem[] = loadedFamiliares.map((fam: any) => {
                const isTutor = (mainNnaAny.tieneTutorApo === 1 || mainNnaAny.tieneTutorApo === true) &&
                    mainNnaAny.nroDocTutApo &&
                    fam.dni === mainNnaAny.nroDocTutApo;

                const namesSplit = (fam.nombres || '').split(' ');
                const pri = namesSplit[0] || '';
                const seg = namesSplit[1] || '';
                const nom = namesSplit.slice(2).join(' ') || fam.nombres || '';

                return {
                    nombres: fam.nombres || '',
                    parentesco: fam.parentesco || 'Otro',
                    dni: fam.dni || '',
                    telefono: fam.telefono || '',
                    ocupacion: fam.ocupacion || '',
                    viveCon: fam.vive_con === 'S' || fam.vive_con === 'SI' || fam.vive_con === 'true' ? 'SI' : 'NO',
                    priApeTutApo: isTutor ? mainNnaAny.priApeTutApo : pri,
                    segApeTutApo: isTutor ? mainNnaAny.segApeTutApo : seg,
                    nomApeTutApo: isTutor ? mainNnaAny.nomApeTutApo : nom,
                    sexoApo: isTutor ? mainNnaAny.sexoApo : '',
                    fechaNacApo: isTutor ? toDateInput(mainNnaAny.fechaNacApo) : '',
                    nacionalidadApo: isTutor ? mainNnaAny.nacionalidadApo : 'PERUANA',
                    tipDocTutApo: isTutor ? mainNnaAny.tipDocTutApo : 'DNI',
                    nroDocTutApo: isTutor ? mainNnaAny.nroDocTutApo : fam.dni || '',
                    vinTutUsu: isTutor ? mainNnaAny.vinTutUsu : fam.parentesco || '',
                    lenMatApo: isTutor ? mainNnaAny.lenMatApo : 'CASTELLANO',
                    lenMatEspApo: isTutor ? mainNnaAny.lenMatEspApo : '',
                    autIdeEtApo: isTutor ? mainNnaAny.autIdeEtApo : 'MESTIZO',
                    autIdeEtEspApo: isTutor ? mainNnaAny.autIdeEtEspApo : '',
                    tipoDiscapApo: isTutor ? mainNnaAny.tipoDiscapApo : '',
                    certDiscapApo: isTutor ? mainNnaAny.certDiscapApo : 'NO',
                    esTutorPrincipal: isTutor ? 'true' : 'false'
                };
            });

            reset({
                zonaIntervencion: activeCase?.zonaIntervencion || '',
                perfil: activeCase?.perfil || '',
                situacionCalle: activeCase?.situacionCalle || '',
                victimaExplotacion: activeCase?.victimaExplotacion || activeCase?.victima_explotacion || 'NO',
                fechaAbordaje: toDateInput(activeCase?.fechaAbordaje),
                fechaIngreso: toDateInput(activeCase?.fechaIngreso),
                fechaReingreso: toDateInput(activeCase?.fechaReingreso),
                fechaCambioPerfil: toDateInput(activeCase?.fechaCambioPerfil),
                actividadRealizada: activeCase?.actividadRealizada || '',
                tiempoEnCalle: activeCase?.tiempoEnCalle || '',
                condicion: activeCase?.condicion || '',
                horarioInicio: activeCase?.horarioInicio || '',
                horarioFin: activeCase?.horarioFin || '',
                horarioInicio2: activeCase?.horarioInicio2 || '',
                horarioFin2: activeCase?.horarioFin2 || '',
                diasTrabajo: activeCase?.diasTrabajo || '',

                domicilioActual: mainNna.domicilioActual || '',
                referenciaDomicilio: mainNna.referenciaDomicilio || '',
                departamentoDom: mainNna.departamentoDom || '',
                provinciaDom: mainNna.provinciaDom || '',
                distritoDom: mainNna.distritoDom || '',
                telefonoContacto: mainNna.telefonoContacto || '',
                viveCon: normalizeViveCon(mainNna.viveCon),
                detalleViveCon: mainNna.detalleViveCon || '',
                lugarPernocte: normalizeLugarPernocte(mainNna.lugarPernocte),
                detalleLugarPernocte: mainNna.detalleLugarPernocte || '',
                nombreTutor: mainNna.nombreTutor || '',

                // Hermanos (SEC 2026)
                tieneHermanos: mainNnaAny.tieneHermanos ? 'true' : 'false',
                cantHermanos: mainNnaAny.cantHermanos !== null && mainNnaAny.cantHermanos !== undefined ? mainNnaAny.cantHermanos : 0,
                detallesHermanos: mainNnaAny.detallesHermanos || '',

                // Tutor / Apoderado (SEC 2026)
                tieneTutorApo: mainNnaAny.tieneTutorApo === 1 || mainNnaAny.tieneTutorApo === true ? 'true' : 'false',
                priApeTutApo: mainNnaAny.priApeTutApo || '',
                segApeTutApo: mainNnaAny.segApeTutApo || '',
                nomApeTutApo: mainNnaAny.nomApeTutApo || '',
                sexoApo: mainNnaAny.sexoApo || '',
                fechaNacApo: toDateInput(mainNnaAny.fechaNacApo),
                nacionalidadApo: mainNnaAny.nacionalidadApo || 'PERUANA',
                tipDocTutApo: mainNnaAny.tipDocTutApo || 'DNI',
                nroDocTutApo: mainNnaAny.nroDocTutApo || '',
                vinTutUsu: mainNnaAny.vinTutUsu || '',
                lenMatApo: mainNnaAny.lenMatApo || 'CASTELLANO',
                lenMatEspApo: mainNnaAny.lenMatEspApo || '',
                autIdeEtApo: mainNnaAny.autIdeEtApo || 'MESTIZO',
                autIdeEtEspApo: mainNnaAny.autIdeEtEspApo || '',
                tipoDiscapApo: mainNnaAny.tipoDiscapApo || '',
                certDiscapApo: mainNnaAny.certDiscapApo || 'NO',

                actividadesCalle: actividadesCalleData,
                familiares: mappedFamiliares,
                nnas: mappedNnas
            });

            // Forzar actualización de los useFieldArray correspondientes
            if (actividadesCalleData.length > 0) {
                setTimeout(() => {
                    replaceActividadesCalle(actividadesCalleData);
                }, 0);
            }
            if (mappedFamiliares.length > 0) {
                setTimeout(() => {
                    replaceFamiliares(mappedFamiliares);
                }, 0);
            }
        }
    }, [isEditMode, selectedExpediente, reset, replaceActividadesCalle, replaceFamiliares]);

    const checkDuplicates = async (index: number, isManual: boolean = false) => {
        const nna = watch(`nnas.${index}`);
        if (!nna) {
            return;
        }

        const numeroDocNna = (nna.numeroDoc || '').trim();
        const apellidoPaternoNna = (nna.apellidoPaterno || '').trim();
        const apellidoMaternoNna = (nna.apellidoMaterno || '').trim();
        const nombresNna = (nna.nombres || '').trim();

        // Evitar validaciones vacías molestas al salir del campo
        if (!numeroDocNna && !apellidoPaternoNna) {
            if (isManual) {
                showAlert("Falta información", "Por favor ingrese al menos el documento o el apellido paterno del NNA para verificar.", "warning");
            }
            return;
        }

        setIsCheckingDuplicates(true);
        try {
            const res = await checkNnaDuplicates({
                nombres: nombresNna,
                apellidoPaterno: apellidoPaternoNna,
                apellidoMaterno: apellidoMaternoNna,
                numeroDoc: numeroDocNna
            });

            setCurrentNnaIndexForDuplicate(index);
            setDuplicateCheckResults({
                status: res.status,
                message: res.message || `${res.matches?.length || 0} coincidencia(s) encontrada(s)`,
                matches: res.matches || []
            });

            if (res.status === 'duplicate' || res.status === 'homonym') {
                setShowDuplicateDrawer(true);
            } else if (isManual) {
                showAlert("Ficha Única", "¡Excelente! No se encontraron homónimos ni duplicados en el sistema nacional.", "success");
            }
        } catch (error) {
            console.error("Error checking duplicates:", error);
            if (isManual) {
                showAlert("Error de Conexión", "No se pudo conectar al servidor para validar duplicados.", "error");
            }
        } finally {
            setIsCheckingDuplicates(false);
        }
    };

    const onSubmit = async (data: NnaFormData, esBorrador: boolean = false) => {
        setSubmitting(true);
        
        if (!esBorrador) {
            // Strict check of all mandatory fields for final registration
            if (!data.perfil?.trim()) {
                showAlert("Campo Requerido", "El perfil del caso es obligatorio para finalizar el registro.", "warning");
                setSubmitting(false);
                return;
            }
            if (!data.zonaIntervencion?.trim()) {
                showAlert("Campo Requerido", "La zona de intervención es obligatoria para finalizar el registro.", "warning");
                setSubmitting(false);
                return;
            }
            if (!data.distritoDom?.trim()) {
                showAlert("Campo Requerido", "El distrito de intervención / domicilio es obligatorio para finalizar el registro.", "warning");
                setSubmitting(false);
                return;
            }
            if (!data.nnas || data.nnas.length === 0) {
                showAlert("Beneficiarios Requeridos", "Debe agregar al menos un beneficiario (NNA) para registrar.", "warning");
                setSubmitting(false);
                return;
            }
            for (let i = 0; i < data.nnas.length; i++) {
                const nna = data.nnas[i];
                const label = data.nnas.length > 1 ? ` del NNA ${i + 1}` : "";
                if (!nna.nombres?.trim()) {
                    showAlert("Campo Requerido", `El nombre${label} es obligatorio para finalizar el registro.`, "warning");
                    setSubmitting(false);
                    return;
                }
                if (!nna.apellidoPaterno?.trim()) {
                    showAlert("Campo Requerido", `El apellido paterno${label} es obligatorio para finalizar el registro.`, "warning");
                    setSubmitting(false);
                    return;
                }
                if (!nna.sexo?.trim()) {
                    showAlert("Campo Requerido", `El sexo${label} es obligatorio para finalizar el registro.`, "warning");
                    setSubmitting(false);
                    return;
                }
                if (!nna.fechaNacimiento?.trim() && !nna.edad) {
                    showAlert("Campo Requerido", `La fecha de nacimiento o edad${label} es obligatoria para finalizar el registro.`, "warning");
                    setSubmitting(false);
                    return;
                }
                if (!nna.tipoDoc?.trim()) {
                    showAlert("Campo Requerido", `El tipo de documento${label} es obligatorio para finalizar el registro.`, "warning");
                    setSubmitting(false);
                    return;
                }
                if (nna.tipoDoc !== "SIN_DOC" && !nna.numeroDoc?.trim()) {
                    showAlert("Campo Requerido", `El número de documento${label} es obligatorio para tipos de documento distintos a SIN DOCUMENTO.`, "warning");
                    setSubmitting(false);
                    return;
                }
                if (nna.tipoDoc === "DNI" && nna.numeroDoc?.trim()) {
                    const cleanDoc = nna.numeroDoc.trim();
                    if (!/^\d{8}$/.test(cleanDoc)) {
                        showAlert("Documento Inválido", `El número de DNI${label} debe contener exactamente 8 dígitos numéricos.`, "warning");
                        setSubmitting(false);
                        return;
                    }
                }
                if (nna.tipoDoc === "CEX" && nna.numeroDoc?.trim()) {
                    const cleanDoc = nna.numeroDoc.trim();
                    if (!/^[a-zA-Z0-9]{9,12}$/.test(cleanDoc)) {
                        showAlert("Documento Inválido", `El Carnet de Extranjería (CEX)${label} debe ser alfanumérico y tener entre 9 y 12 caracteres.`, "warning");
                        setSubmitting(false);
                        return;
                    }
                }
                if (nna.tipoDoc === "SIN_DOC" && !nna.detalleSinDoc?.trim()) {
                    showAlert("Campo Requerido", `Debe especificar el detalle o motivo de la falta de documento${label}.`, "warning");
                    setSubmitting(false);
                    return;
                }
            }

            // Tutor Document verification validation
            const tieneTutor = data.tieneTutorApo === "true" || data.tieneTutorApo === true;
            if (tieneTutor) {
                const tipoDocTutor = data.tipDocTutApo?.trim();
                const nroDocTutor = data.nroDocTutApo?.trim();
                if (tipoDocTutor === "DNI" && nroDocTutor) {
                    if (!/^\d{8}$/.test(nroDocTutor)) {
                        showAlert("Documento Inválido (Tutor)", "El número de DNI del tutor/apoderado debe contener exactamente 8 dígitos numéricos.", "warning");
                        setSubmitting(false);
                        return;
                    }
                }
                if (tipoDocTutor === "CEX" && nroDocTutor) {
                    if (!/^[a-zA-Z0-9]{9,12}$/.test(nroDocTutor)) {
                        showAlert("Documento Inválido (Tutor)", "El Carnet de Extranjería (CEX) del tutor/apoderado debe ser alfanumérico y tener entre 9 y 12 caracteres.", "warning");
                        setSubmitting(false);
                        return;
                    }
                }
            }
        }
        
        // 1. Process Activities & Uso de Tiempo for each NNA
        const nnasWithBackup: NnaConDatos[] = data.nnas.map((nna) => {
            const actList = nna.actividadesTiempoLibreLista || [];
            const totales = {
                estudiar: actList.filter(a => a.categoria === 'ESTUDIAR').reduce((s, a) => s + a.horasSemana, 0),
                trabajar: nna.usoTiempo ? Object.values(nna.usoTiempo).reduce((s, d) => s + (d.trabajar || 0), 0) : 0,
                dormir: actList.filter(a => a.categoria === 'DORMIR').reduce((s, a) => s + a.horasSemana, 0),
                jugar: actList.filter(a => a.categoria === 'JUGAR').reduce((s, a) => s + a.horasSemana, 0)
            };

            const promSueño = Math.round((totales.dormir / 7) * 10) / 10;
            let riesgo = 'Sin Riesgo';
            if (totales.trabajar > 30 || promSueño < 6) riesgo = 'Riesgo Crítico';
            else if (totales.trabajar > 14 || promSueño < 8 || totales.trabajar > totales.estudiar) riesgo = 'Riesgo Moderado';
            else if (totales.trabajar > 0) riesgo = 'Riesgo Leve';

            const diag = `[${riesgo}] Semanal→ Est:${totales.estudiar}h Tra:${totales.trabajar}h Dor:${totales.dormir}h Jug:${totales.jugar}h | Prom.sueño:${promSueño}h/día`;
            const datosF03 = {
                usoTiempo: nna.usoTiempo || {},
                actividadesTiempoLibreLista: actList,
                actividadesCalle: data.actividadesCalle || [],
                diagnostico: riesgo
            };

            return {
                ...nna,
                actividadesTiempoLibre: diag,
                datosF03Backup: JSON.stringify(datosF03)
            };
        });

        // 2. Build the mapped request payload matching RegistrarNnaRequest and Oracle schemas
        const parseDate = (d: string | null | undefined) => {
            if (!d) return null;
            return `${d}T00:00:00`;
        };

        const mappedNnas: NnaPayloadItem[] = nnasWithBackup.map((nna) => {
            const tienePartida = nna.tienePartidaNacimiento === "true";
            const tieneDiscapacidad = nna.tieneDiscapacidad === true;
            
            // Mapeo correcto de las opciones de matrícula a código número para la base de datos
            let estudiaActualmenteVal = 0;
            if (nna.estudiaActualmente === 'SI' || nna.estudiaActualmente === 'true') estudiaActualmenteVal = 1;
            else if (nna.estudiaActualmente === 'NO' || nna.estudiaActualmente === 'false') estudiaActualmenteVal = 0;
            else if (nna.estudiaActualmente === 'PROCESO') estudiaActualmenteVal = 3;
            else if (nna.estudiaActualmente === 'NO_APLICA') estudiaActualmenteVal = 99;

            const tieneAntecedenteAlbergue = nna.tieneAntecedenteAlbergue === true;
            const sufreEnfermedad = nna.sufreEnfermedad === "SI" || nna.sufreEnfermedad === "true";

            const nnaObj: NnaPayloadItem = {
                id: nna.id || undefined,
                nombres: nna.nombres,
                apellido_paterno: nna.apellidoPaterno,
                apellido_materno: nna.apellidoMaterno || null,
                tipo_doc: nna.tipoDoc,
                numero_doc: nna.numeroDoc || null,
                fecha_nacimiento: parseDate(nna.fechaNacimiento),
                sexo: nna.sexo || null,
                nacionalidad: nna.nacionalidad || "PERUANA",
                tiene_partida_nacimiento: tienePartida,
                detalle_sin_doc: nna.detalleSinDoc || null,

                departamento_nac: nna.departamentoNac || null,
                provincia_nac: nna.provinciaNac || null,
                distrito_nac: nna.distritoNac || null,

                domicilio_actual: data.domicilioActual || null,
                referencia_domicilio: data.referenciaDomicilio || null,
                departamento_dom: data.departamentoDom || null,
                provincia_dom: data.provinciaDom || null,
                distrito_dom: data.distritoDom || null,
                telefono_contacto: data.telefonoContacto || null,

                nombre_tutor: data.nombreTutor || null,
                vive_con: data.viveCon || null,
                detalle_vive_con: data.detalleViveCon || null,
                tiene_hermanos: data.tieneHermanos === "true" || data.tieneHermanos === true,
                cant_hermanos: data.cantHermanos !== undefined && data.cantHermanos !== null && data.cantHermanos !== "" ? Number(data.cantHermanos) : 0,
                detalles_hermanos: data.detallesHermanos || null,
                lugar_pernocte: data.lugarPernocte || null,
                detalle_lugar_pernocte: data.detalleLugarPernocte || null,
                tiene_antecedente_albergue: tieneAntecedenteAlbergue,
                detalle_antecedente_albergue: nna.detalleAntecedenteAlbergue || null,

                afiliado_sis: nna.afiliadoSIS || null,
                afiliado_otro_seguro: nna.afiliadoOtroSeguro || null,
                detalle_otro_seguro: nna.detalleOtroSeguro || null,
                sufre_enfermedad: sufreEnfermedad,
                detalle_enfermedad: nna.detalleEnfermedad || null,
                observaciones_salud: nna.observacionesSalud || null,
                tiene_discapacidad: tieneDiscapacidad,
                tipo_discapacidad: nna.tipoDiscapacidad || null,
                detalle_discapacidad: nna.detalleDiscapacidad || null,

                estudia_actualmente: estudiaActualmenteVal,
                nivel_educativo: nna.nivelEducativo || null,
                grado_estudio: nna.gradoEstudio || null,
                institucion_educativa: nna.institucionEducativa || null,
                modalidad_estudio: nna.modalidadEstudio || null,
                detalle_no_estudia: nna.detalleNoEstudia || null,

                edad: nna.edad !== undefined && nna.edad !== '' && nna.edad !== null ? Number(nna.edad) : null,
                unidad_edad: nna.unidadEdad || "ANIOS",

                // Variables de Tutor / Adulto Responsable (SEC 2026)
                tiene_tutor_apo: data.tieneTutorApo === "true" || data.tieneTutorApo === true ? 1 : 0,
                pri_ape_tut_apo: data.priApeTutApo || null,
                seg_ape_tut_apo: data.segApeTutApo || null,
                nom_ape_tut_apo: data.nomApeTutApo || null,
                sexo_apo: data.sexoApo || null,
                fecha_nac_apo: parseDate(data.fechaNacApo),
                nacionalidad_apo: data.nacionalidadApo || "PERUANA",
                tip_doc_tut_apo: data.tipDocTutApo || null,
                nro_doc_tut_apo: data.nroDocTutApo || null,
                vin_tut_usu: data.vinTutUsu || null,
                len_mat_apo: data.lenMatApo || "CASTELLANO",
                len_mat_esp_apo: data.lenMatEspApo || null,
                aut_ide_et_apo: data.autIdeEtApo || "MESTIZO",
                aut_ide_et_esp_apo: data.autIdeEtEspApo || null,
                tipo_discap_apo: data.tipoDiscapApo || null,
                cert_discap_apo: data.certDiscapApo || "NO",

                // Identidad Cultural NNA
                len_mat_nna: nna.lenMatNna || "CASTELLANO",
                len_mat_esp_nna: nna.lenMatEspNna || null,
                aut_ide_et_nna: nna.autIdeEtNna || "MESTIZO",
                aut_ide_et_esp_nna: nna.autIdeEtEspNna || null,
                cert_discap_nna: nna.certDiscapNna || "NO",

                actividades_tiempo_libre: nna.actividadesTiempoLibre || null,
                caracteristicas: nna.caracteristicas || null,
                datos_f03: nna.datosF03Backup || null
            };

            return nnaObj;
        });

        const actividadRealizada = data.actividadesCalle && data.actividadesCalle.length > 0
            ? data.actividadesCalle.map((a) => a.actividad === 'OTROS' ? a.actividadEspecifique : a.actividad?.replace(/_/g, ' ')).join(', ')
            : data.actividadRealizada || null;

        const mappedFamiliares = (data.familiares || []).map((fam) => ({
            nombres: fam.nombres || `${fam.priApeTutApo || ''} ${fam.segApeTutApo || ''} ${fam.nomApeTutApo || ''}`.trim().replace(/\s+/g, ' '),
            parentesco: fam.parentesco || fam.vinTutUsu || 'Otro',
            dni: fam.dni || fam.nroDocTutApo || null,
            telefono: fam.telefono || null,
            ocupacion: fam.ocupacion || null,
            viveCon: fam.viveCon || 'NO'
        }));

        const payload: RegistrarNnaPayload = {
            nnas: mappedNnas,
            perfil: data.perfil,
            zona_intervencion: data.zonaIntervencion || null,
            distrito_intervencion: data.distritoDom || null,
            situacion_calle: data.situacionCalle || null,
            actividad_realizada: actividadRealizada,
            tiempo_en_calle: data.tiempoEnCalle || null,
            condicion: data.condicion || null,
            victima_explotacion: data.victimaExplotacion || 'NO',
            fecha_abordaje: parseDate(data.fechaAbordaje),
            fecha_ingreso: parseDate(data.fechaIngreso),
            fecha_reingreso: parseDate(data.fechaReingreso),
            fecha_cambio_perfil: parseDate(data.fechaCambioPerfil),
            horario_inicio: data.horarioInicio || null,
            horario_fin: data.horarioFin || null,
            horario_inicio2: data.horarioInicio2 || null,
            horario_fin2: data.horarioFin2 || null,
            dias_trabajo: data.diasTrabajo || null,
            familiares: mappedFamiliares,
            es_borrador: esBorrador
        };

        try {
            if (isEditMode) {
                const expediente = selectedExpediente as unknown as ExpedienteNna[] | null;
                const carpetaId = expediente?.[0]?.carpetaId;
                payload.carpeta_id = carpetaId;
                await updateExpediente(payload);
                
                if (esBorrador) {
                    showAlert("Borrador Actualizado", "El borrador ha sido actualizado exitosamente.", "success", () => navigate('/nna'));
                } else {
                    showAlert("Cambios Guardados", "Los cambios han sido guardados exitosamente.", "success", () => navigate('/nna'));
                }
            } else {
                payload.crear_nueva_carpeta = true;
                const result = await createNna(payload);
                
                if (esBorrador) {
                    const newNna = result?.[0]?.nna;
                    if (newNna && newNna.id) {
                        // Extraemos la lista de nnas creados para el expediente
                        const createdNnas = result.map((r: any) => r.nna);
                        
                        // Actualizamos el selectedExpediente en el store instantáneamente
                        useNnaStore.setState({ selectedExpediente: createdNnas });
                        
                        // Cambiamos el modo a edición
                        setIsEditMode(true);
                        
                        // Navegamos a la ruta de edición con replace para actualizar la URL sin recargar
                        navigate(`/nna/editar/${newNna.id}`, { replace: true });
                        
                        showAlert("Borrador Guardado", "Borrador guardado. Puedes retomarlo más tarde para completar el registro.", "success", () => navigate('/nna'));
                    } else {
                        showAlert("Borrador Guardado", "Borrador guardado con éxito.", "success", () => navigate('/nna'));
                    }
                } else {
                    const createdNnaId = result?.[0]?.nna?.id;
                    const urgenciaId = getValues('urgencia_id' as any);
                    if (urgenciaId && createdNnaId) {
                        try {
                            const { updateEstadoUrgencia } = await import('../../api/urgencia.api');
                            await updateEstadoUrgencia(Number(urgenciaId), 'PROMOVIDO_F03', createdNnaId);
                        } catch (err) {
                            console.error("Error al actualizar estado de la urgencia:", err);
                        }
                    }

                    const codigoF03 = result?.[0]?.nna?.codigo_ficha03 || result?.[0]?.nna?.codigoFicha03;
                    const msgCodigo = codigoF03 ? ` Código asignado: ${codigoF03}.` : '';
                    showAlert("Registro Creado", `El expediente ha sido registrado de manera exitosa.${msgCodigo}`, "success", () => navigate('/nna'));
                }
            }
        } catch (e: any) {
            console.error("Error saving NNA:", e);
            const serverMessage = e.response?.data?.detail || e.response?.data?.message || e.message || String(e);
            showAlert("Error al guardar", "Ocurrió un error al guardar los datos: " + serverMessage, "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleSaveDraft = async () => {
        const values = getValues();
        
        // Validar el mínimo indispensable para base de datos (Nombres y Apellido Paterno)
        const nnas = values.nnas || [];
        const missingFields = nnas.some((nna: any) => !nna.nombres?.trim() || !nna.apellidoPaterno?.trim());
        
        if (nnas.length === 0 || missingFields) {
            showAlert("Campos Requeridos", "Para guardar un borrador, debes ingresar al menos los Nombres y el Apellido Paterno del beneficiario.", "warning");
            return;
        }
        
        await onSubmit(values, true);
    };

    const handleNext = () => {
        const currentIndex = sections.findIndex(s => s.id === activeSection);
        if (currentIndex < sections.length - 1) setActiveSection(sections[currentIndex + 1].id);
    };

    const handlePrev = () => {
        const currentIndex = sections.findIndex(s => s.id === activeSection);
        if (currentIndex > 0) setActiveSection(sections[currentIndex - 1].id);
    };

    const handleAddActivityToNna = (nnaIndex: number, activity: ActividadTiempoLibre) => {
        const currentList = watch(`nnas.${nnaIndex}.actividadesTiempoLibreLista`) || [];
        const newList = editingActivityIndex !== null
            ? currentList.map((a, i) => i === editingActivityIndex ? activity : a)
            : [...currentList, activity];
        setValue(`nnas.${nnaIndex}.actividadesTiempoLibreLista`, newList);
        setEditingActivityIndex(null);
        setShowTimeActivityModal(false);
    };

    const handleDeleteActivity = (nnaIndex: number, activityIndex: number) => {
        const currentList = watch(`nnas.${nnaIndex}.actividadesTiempoLibreLista`) || [];
        setValue(`nnas.${nnaIndex}.actividadesTiempoLibreLista`, currentList.filter((_, i) => i !== activityIndex));
    };

    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-7rem)] lg:h-[calc(100vh-3.5rem)] gap-0 bg-slate-50 overflow-hidden">

            {/* MOBILE NAV — visible solo en móvil */}
            {(() => {
                const mIdx = sections.findIndex(s => s.id === activeSection);
                return (
                    <div className="md:hidden flex-shrink-0 bg-white border-b border-gray-200 z-20">
                        <div className="px-4 py-3 bg-blue-600 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-white font-bold text-sm leading-tight">Ficha F03</p>
                                <p className="text-blue-200 text-[11px] truncate">
                                    {mIdx + 1}/{sections.length} · {sections[mIdx].label.replace(/^[IVX]+\.\s/, '')}
                                </p>
                            </div>
                            <button type="button" onClick={() => setMobileNavOpen(v => !v)}
                                className="flex-shrink-0 text-white p-1 rounded hover:bg-blue-700 transition-colors">
                                {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
                            </button>
                        </div>
                        <div className="px-4 py-1.5 bg-white">
                            <div className="w-full bg-gray-200 rounded-full h-1">
                                <div className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                                    style={{ width: `${((mIdx + 1) / sections.length) * 100}%` }} />
                            </div>
                        </div>
                        {mobileNavOpen && (
                            <nav className="px-3 pb-3 pt-2 space-y-1 border-t border-gray-100 bg-white">
                                {sections.map((section, idx) => {
                                    const isAct = activeSection === section.id;
                                    const isPast = mIdx > idx;
                                    const Icon = section.icon;
                                    return (
                                        <button key={section.id} type="button"
                                            onClick={() => { setActiveSection(section.id); setMobileNavOpen(false); }}
                                            className={clsx("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left",
                                                isAct ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:bg-blue-50 hover:text-blue-700")}>
                                            <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0",
                                                isAct ? "bg-white/20 text-white" : isPast ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400")}>
                                                {idx + 1}
                                            </div>
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Icon size={14} className="flex-shrink-0" />
                                                <span className="text-xs font-semibold truncate">{section.label.replace(/^[IVX]+\.\s/, '')}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </nav>
                        )}
                    </div>
                );
            })()}

            {/* SIDEBAR — visible solo en md+ */}
            <aside className="hidden md:flex md:w-52 flex-shrink-0 bg-white border-r border-gray-200 flex-col overflow-hidden">
                <div className="px-4 py-4 border-b border-gray-100 bg-blue-600">
                    <p className="text-white font-bold text-sm leading-tight">Ficha de Inscripción</p>
                    <p className="text-blue-200 text-[11px] mt-0.5">Formato F03 · Registro Oficial</p>
                </div>

                {isEditMode && selectedExpediente && selectedExpediente.length > 0 && (
                    <div className="px-4 py-3 border-b border-gray-100 bg-blue-50/50 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                                Edición Activa
                            </span>
                            {!(selectedExpediente[0] as any).codigoFicha03 && (
                                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                    Borrador
                                </span>
                            )}
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Beneficiario (NNA)</p>
                            <p className="text-xs font-bold text-gray-800 truncate" title={`${(selectedExpediente[0] as any).nombres || ''} ${(selectedExpediente[0] as any).apellidoPaterno || ''}`}>
                                {`${(selectedExpediente[0] as any).nombres || ''} ${(selectedExpediente[0] as any).apellidoPaterno || ''}`}
                            </p>
                        </div>
                        <div className="mt-1 space-y-1">
                            <p className="text-xs text-gray-600">
                                <span className="font-bold text-gray-800">Nº Ficha:</span> {(selectedExpediente[0] as any).codigoFicha03 || 'Sin Código'}
                            </p>
                            <p className="text-xs text-gray-600">
                                <span className="font-bold text-gray-800">Expediente:</span> {((selectedExpediente[0] as any).casos?.find((c: any) => c.estado !== 'CERRADO') || (selectedExpediente[0] as any).casos?.[0])?.codigoCaso || `ID: ${id}`}
                            </p>
                        </div>
                    </div>
                )}

                <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
                    {sections.map((section, idx) => {
                        const isActive = activeSection === section.id;
                        const isPast = sections.findIndex(s => s.id === activeSection) > idx;
                        const Icon = section.icon;
                        return (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                type="button"
                                className={clsx(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-left",
                                    isActive
                                        ? "bg-blue-600 text-white shadow-sm"
                                        : isPast
                                            ? "text-gray-500 hover:bg-blue-50 hover:text-blue-700"
                                            : "text-gray-500 hover:bg-blue-50 hover:text-blue-700"
                                )}
                            >
                                <div className={clsx(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0",
                                    isActive
                                        ? "bg-white/20 text-white"
                                        : isPast
                                            ? "bg-blue-100 text-blue-600"
                                            : "bg-gray-100 text-gray-400"
                                )}>
                                    {idx + 1}
                                </div>
                                <div className="flex items-center gap-2 min-w-0">
                                    <Icon size={14} className="flex-shrink-0" />
                                    <span className="text-xs font-semibold truncate leading-tight">
                                        {section.label.replace(/^[IVX]+\.\s/, '')}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </nav>

                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-gray-400 font-medium">Progreso</span>
                        <span className="text-[10px] text-blue-600 font-bold">
                            {sections.findIndex(s => s.id === activeSection) + 1}/{sections.length}
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1">
                        <div
                            className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${((sections.findIndex(s => s.id === activeSection) + 1) / sections.length) * 100}%` }}
                        />
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 bg-white flex flex-col overflow-hidden relative min-w-0">
                <FormProvider {...methods}>
                    <form onSubmit={handleSubmit((d) => onSubmit(d, false))} className="flex-1 flex flex-col min-h-0">
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                        {storeError && (
                            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                {storeError}
                            </div>
                        )}

                        {/* PASO 1: I. DATOS GENERALES */}
                        {activeSection === 'paso1_generales' && <DatosGeneralesSection />}

                        {/* PASO 2: II. DATOS PERSONALES */}
                        {activeSection === 'paso2_personales' && (
                            <DatosPersonalesSection 
                                duplicateCheckResults={duplicateCheckResults}
                                isCheckingDuplicates={isCheckingDuplicates}
                                checkDuplicates={checkDuplicates}
                            />
                        )}

                        {/* PASO 3: III. DATOS SEGÚN PERFIL */}
                        {activeSection === 'paso3_perfil' && <DatosPerfilSection />}

                        {/* PASO 4: IV. EDUCACIÓN */}
                        {activeSection === 'paso4_educacion' && <EducacionSection />}

                        {/* PASO 5: V. SALUD */}
                        {activeSection === 'paso5_salud' && <SaludSection />}

                        {/* PASO 6: VI. FAMILIA y VII. TIEMPO LIBRE */}
                        {activeSection === 'paso6_familia' && (
                            <FamiliaSection 
                                setEditingFamiliarIndex={setEditingFamiliarIndex}
                                setShowTutorModal={setShowTutorModal}
                                setEditingActivityIndex={setEditingActivityIndex}
                                setShowTimeActivityModal={setShowTimeActivityModal}
                                setCurrentNnaIndexForDuplicate={setCurrentNnaIndexForDuplicate}
                                handleDeleteActivity={handleDeleteActivity}
                            />
                        )}
                    </div>

                    {(() => {
                        const idx = sections.findIndex(s => s.id === activeSection);
                        const isFirst = idx === 0;
                        const isLast  = idx === sections.length - 1;
                        return (
                            <FooterButtons
                                onBack={!isFirst ? handlePrev : undefined}
                                onNext={!isLast ? handleNext : undefined}
                                onSave={isLast ? () => handleSubmit((d) => onSubmit(d, false))() : undefined}
                                onSaveDraft={handleSaveDraft}
                                loading={submitting}
                                submitLabel="Finalizar"
                            />
                        );
                    })()}
                </form>
            </FormProvider>
            </main>

            {/* MODAL DE TIEMPO LIBRE */}
            <TimeActivityModal
                isOpen={showTimeActivityModal}
                onClose={() => {
                    setShowTimeActivityModal(false);
                    setEditingActivityIndex(null);
                }}
                onSave={(activity) => handleAddActivityToNna(currentNnaIndexForDuplicate, activity)}
                initialData={editingActivityIndex !== null ? (watch(`nnas.${currentNnaIndexForDuplicate}.actividadesTiempoLibreLista`) || [])[editingActivityIndex] : undefined}
            />

            {/* MODAL DETALLES DEL TUTOR / APODERADO */}
            <FamiliarModal
                isOpen={showTutorModal}
                onClose={() => {
                    setShowTutorModal(false);
                    setEditingFamiliarIndex(null);
                }}
                onSave={handleSaveFamiliar}
                initialData={editingFamiliarIndex !== null ? (watch('familiares') || [])[editingFamiliarIndex] : null}
                parametros={parametros}
                editingIndex={editingFamiliarIndex}
            />

            {/* DUPLICATE CHECKER DRAWER */}
            <DuplicateDrawer
                isOpen={showDuplicateDrawer}
                onClose={() => setShowDuplicateDrawer(false)}
                results={duplicateCheckResults}
            />
            {/* PREMIUM ALERTA CUSTOM MODAL */}
            {alertModal.isOpen && (
                <div className="fixed inset-0 flex items-center justify-center z-[100] animate-fadeIn">
                    {/* Glass backdrop blur overlay */}
                    <div 
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300"
                        onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                    />
                    
                    {/* Modal Card */}
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden border border-slate-100 transform scale-100 transition-all duration-300 z-10 animate-scaleUp">
                        {/* Status bar header indicator */}
                        <div className={clsx(
                            "h-2 w-full bg-gradient-to-r",
                            alertModal.type === 'success' && "from-emerald-400 to-teal-500",
                            alertModal.type === 'warning' && "from-amber-400 to-orange-500",
                            alertModal.type === 'error' && "from-rose-500 to-red-600",
                            alertModal.type === 'info' && "from-blue-500 to-indigo-600"
                        )} />

                        <div className="p-6 flex flex-col items-center text-center">
                            {/* Animated Icon Container */}
                            <div className={clsx(
                                "w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-transform duration-500 hover:scale-110",
                                alertModal.type === 'success' && "bg-emerald-50 text-emerald-600",
                                alertModal.type === 'warning' && "bg-amber-50 text-amber-600",
                                alertModal.type === 'error' && "bg-rose-50 text-rose-600",
                                alertModal.type === 'info' && "bg-blue-50 text-blue-600"
                            )}>
                                {alertModal.type === 'success' && <CheckCircle size={32} className="animate-bounce" />}
                                {alertModal.type === 'warning' && <AlertTriangle size={32} className="animate-pulse" />}
                                {alertModal.type === 'error' && <XCircle size={32} className="animate-shake" />}
                                {alertModal.type === 'info' && <Info size={32} />}
                            </div>

                            {/* Heading */}
                            <h3 className="text-gray-900 font-bold text-base leading-tight mb-2 tracking-tight">
                                {alertModal.title}
                            </h3>
                            
                            {/* Body Message */}
                            <p className="text-gray-500 text-xs font-semibold leading-relaxed mb-6 px-2">
                                {alertModal.message}
                            </p>

                            {/* Accept Button */}
                            <button
                                type="button"
                                onClick={() => {
                                    const cb = alertModal.onConfirm;
                                    setAlertModal(prev => ({ ...prev, isOpen: false, onConfirm: undefined }));
                                    cb?.();
                                }}
                                className={clsx(
                                    "w-full py-2.5 px-4 rounded-xl text-xs font-black text-white shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 uppercase tracking-wider",
                                    alertModal.type === 'success' && "bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-emerald-100",
                                    alertModal.type === 'warning' && "bg-gradient-to-r from-amber-500 to-orange-600 hover:shadow-amber-100",
                                    alertModal.type === 'error' && "bg-gradient-to-r from-rose-500 to-red-600 hover:shadow-rose-100",
                                    alertModal.type === 'info' && "bg-gradient-to-r from-blue-600 to-indigo-700 hover:shadow-blue-100"
                                )}
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};