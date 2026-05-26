import { useState, useEffect } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useNnaStore } from '../../store/nna.store';
import { MapPin, Users, Briefcase, School, HeartPulse, Home, Plus, Trash2, AlertCircle, Zap, Calendar, X, Edit2 } from 'lucide-react';
import { clsx } from 'clsx';
import { InputField, SelectField, SectionHeader, FooterButtons } from '../../components/ui/FormFields';
import { UbigeoFields } from '../../components/forms/UbigeoFields';
import { DISCAPACIDADES_CONADIS } from '../../data/ubigeo';
import { ActividadesCalleSection } from './components/ActividadesCalleSection';

// TIPOS DE DATOS
interface UsoTiempoDia {
    estudiar: number;
    trabajar: number;
    dormir: number;
    jugar: number;
}

interface ActividadTiempoLibre {
    id: string;
    nombre: string;
    categoria: 'ESTUDIAR' | 'DORMIR' | 'JUGAR' | 'DEPORTES' | 'ARTE' | 'TAREAS';
    horarios: {
        [dia: string]: {
            turno1: { inicio: string; fin: string };
            turno2?: { inicio: string; fin: string };
        };
    };
    horasSemana: number;
    horasMes: number;
}

interface NnaPersonalData {
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    sexo: string;
    fechaNacimiento: string;

    departamentoNac: string;
    provinciaNac: string;
    distritoNac: string;

    tipoDoc: string;
    numeroDoc: string;
    tienePartidaNacimiento: string;
    detalleSinDoc: string;

    estudiaActualmente: boolean;
    nivelEducativo: string;
    gradoEstudio: string;
    institucionEducativa: string;
    modalidadEstudio: string;
    detalleNoEstudia: string;
    afiliadoSIS: string;
    afiliadoOtroSeguro: string;
    detalleOtroSeguro: string;
    sufreEnfermedad: string;
    detalleEnfermedad: string;
    observacionesSalud: string;
    tieneDiscapacidad: boolean;
    tipoDiscapacidad: string;

    actividadesTiempoLibre: string;
    caracteristicas: string;
    tieneAntecedenteAlbergue: boolean;
    detalleAntecedenteAlbergue: string;
    usoTiempo?: Record<string, UsoTiempoDia>;
    actividadesTiempoLibreLista?: ActividadTiempoLibre[];
}

interface NnaFormData {
    zonaIntervencion: string;
    departamentoDom: string;
    provinciaDom: string;
    distritoDom: string;

    perfil: string;
    situacionCalle: string;
    fechaAbordaje: string;
    fechaIngreso: string;
    fechaReingreso: string;
    fechaCambioPerfil: string;

    domicilioActual: string;
    referenciaDomicilio: string;
    telefonoContacto: string;

    nnas: NnaPersonalData[];

    actividadRealizada: string;
    tiempoEnCalle: string;
    horarioInicio: string;
    horarioFin: string;
    horarioInicio2: string;
    horarioFin2: string;
    diasTrabajo: string;
    condicion: string;

    viveCon: string;
    detalleViveCon: string;
    lugarPernocte: string;
    detalleLugarPernocte: string;
    nombreTutor: string;
}

interface DuplicateCheckResult {
    status: 'unique' | 'homonym' | 'duplicate';
    message: string;
    matches?: any[];
}

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
    const [horarios, setHorarios] = useState(initialData?.horarios || initializeHorarios());

    function initializeHorarios() {
        const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const h: any = {};
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
            alert('Por favor ingrese un nombre de actividad');
            return;
        }
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
                                onChange={(e) => setCategoria(e.target.value as any)}
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

const RiskAssessmentPanel = ({ nnaData, actividadesList }: { nnaData: NnaPersonalData; actividadesList: ActividadTiempoLibre[] }) => {
    const calcularTotales = () => {
        let estudiar = 0, trabajar = 0, dormir = 0, jugar = 0;
        
        // Sumar desde actividades de tiempo libre
        actividadesList.forEach(act => {
            if (act.categoria === 'ESTUDIAR') estudiar += act.horasSemana;
            if (act.categoria === 'DORMIR') dormir += act.horasSemana;
            if (act.categoria === 'JUGAR') jugar += act.horasSemana;
        });

        // Sumar trabajo desde usoTiempo si existe
        if (nnaData.usoTiempo) {
            Object.values(nnaData.usoTiempo).forEach(dia => {
                trabajar += dia.trabajar || 0;
            });
        }

        return { estudiar, trabajar, dormir, jugar };
    };

    const totales = calcularTotales();
    const promedioDiarioSueño = Math.round((totales.dormir / 7) * 10) / 10;

    let nivelRiesgo: 'critico' | 'moderado' | 'leve' | 'sin_riesgo' = 'sin_riesgo';
    let alertas: string[] = [];

    if (totales.trabajar > 30 || promedioDiarioSueño < 6) {
        nivelRiesgo = 'critico';
        alertas.push('🔴 Riesgo CRÍTICO: Explotación laboral o privación grave de sueño');
    } else if (totales.trabajar > 14 || promedioDiarioSueño < 8 || totales.trabajar > totales.estudiar) {
        nivelRiesgo = 'moderado';
        alertas.push('🟠 Riesgo MODERADO: Interferencia con educación o sueño insuficiente');
    } else if (totales.trabajar > 0) {
        nivelRiesgo = 'leve';
        alertas.push('🟡 Riesgo LEVE: Trabajo infantil moderado');
    }

    if (promedioDiarioSueño < 8) {
        alertas.push(`😴 Privación de sueño: ${promedioDiarioSueño}h/día (recomendado 8-10h)`);
    }
    if (totales.trabajar > totales.estudiar) {
        alertas.push(`📚 Interferencia educativa: Trabajo ${totales.trabajar}h > Estudio ${totales.estudiar}h`);
    }

    const colores = {
        critico: 'bg-red-100 border-red-300 text-red-900',
        moderado: 'bg-orange-100 border-orange-300 text-orange-900',
        leve: 'bg-yellow-100 border-yellow-300 text-yellow-900',
        sin_riesgo: 'bg-green-100 border-green-300 text-green-900'
    };

    return (
        <div className={`border rounded-lg p-4 ${colores[nivelRiesgo]}`}>
            <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                <AlertCircle size={16} />
                Panel de Evaluación de Riesgo
            </h4>
            <div className="space-y-2 text-sm">
                <p className="font-bold">
                    Semanal: Estudiar {totales.estudiar}h | Trabajar {totales.trabajar}h | Dormir {totales.dormir}h | Jugar {totales.jugar}h
                </p>
                {alertas.map((alerta, i) => (
                    <p key={i} className="text-xs">{alerta}</p>
                ))}
            </div>
        </div>
    );
};

const ActivityCard = ({ activity, onEdit, onDelete }: { activity: ActividadTiempoLibre; onEdit: () => void; onDelete: () => void }) => {
    const diasActivos = Object.entries(activity.horarios)
        .filter(([_, v]) => v.turno1.inicio && v.turno1.fin)
        .map(([k]) => k.substring(0, 3))
        .join(', ');

    return (
        <div className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-2">
                <div>
                    <h4 className="font-bold text-gray-800">{activity.nombre}</h4>
                    <p className="text-xs text-gray-600">{activity.categoria}</p>
                </div>
                <div className="flex gap-1">
                    <button onClick={onEdit} className="p-1.5 hover:bg-blue-100 rounded text-blue-600">
                        <Edit2 size={16} />
                    </button>
                    <button onClick={onDelete} className="p-1.5 hover:bg-red-100 rounded text-red-600">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
            <div className="flex justify-between mb-2">
                <span className="text-xs font-bold text-blue-600">{activity.horasSemana}h/sem</span>
                <span className="text-xs font-bold text-green-600">{activity.horasMes}h/mes</span>
            </div>
            <div className="flex gap-1 flex-wrap">
                {diasActivos ? diasActivos.split(', ').map((d, i) => (
                    <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-bold rounded">
                        {d}
                    </span>
                )) : <span className="text-xs text-gray-400">Sin horarios</span>}
            </div>
        </div>
    );
};

export const NnaCreatePage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { createNna, updateExpediente, fetchExpediente, selectedExpediente, error: storeError } = useNnaStore();
    const [submitting, setSubmitting] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [activeSection, setActiveSection] = useState('paso1_generales');
    const [showTimeActivityModal, setShowTimeActivityModal] = useState(false);
    const [editingActivityIndex, setEditingActivityIndex] = useState<number | null>(null);
    const [showDuplicateDrawer, setShowDuplicateDrawer] = useState(false);
    const [duplicateCheckResults, setDuplicateCheckResults] = useState<DuplicateCheckResult | null>(null);
    const [currentNnaIndexForDuplicate, setCurrentNnaIndexForDuplicate] = useState<number>(0);

    const sections = [
        { id: 'paso1_generales', label: 'I. Datos Generales', icon: MapPin, description: 'Intervención y Fechas' },
        { id: 'paso2_personales', label: 'II. Datos Personales', icon: Users, description: 'Identidad, Domicilio y Contacto' },
        { id: 'paso3_perfil', label: 'III. Datos Perfil', icon: Briefcase, description: 'Actividad en Calle' },
        { id: 'paso4_educacion', label: 'IV. Educación', icon: School, description: 'Situación Educativa' },
        { id: 'paso5_salud', label: 'V. Salud', icon: HeartPulse, description: 'Seguro y Discapacidad' },
        { id: 'paso6_familia', label: 'VI. Familia / Otros', icon: Home, description: 'Vivienda y Observaciones' },
    ];

    const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<NnaFormData>({
        defaultValues: {
            nnas: [{
                nombres: '', apellidoPaterno: '', apellidoMaterno: '', numeroDoc: '', fechaNacimiento: '',
                tipoDoc: 'DNI', sexo: '', estudiaActualmente: false, tieneDiscapacidad: false,
                tienePartidaNacimiento: "true",
                usoTiempo: {} as Record<string, UsoTiempoDia>,
                actividadesTiempoLibreLista: []
            }],
            situacionCalle: '',
            perfil: '',
            condicion: '',
            diasTrabajo: ''
        }
    });

    const { fields, append, remove } = useFieldArray({ control, name: "nnas" });
    const nnasList = useWatch({ control, name: "nnas" });

    useEffect(() => {
        if (id) {
            setIsEditMode(true);
            fetchExpediente(Number(id));
        }
    }, [id, fetchExpediente]);

    useEffect(() => {
        if (isEditMode && selectedExpediente && selectedExpediente.length > 0) {
            const mainNna = selectedExpediente[0];
            const activeCase = mainNna.casos?.find((c: any) => c.estado !== 'CERRADO') || mainNna.casos?.[0];

            const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
            const emptyUso = (): Record<string, UsoTiempoDia> => {
                const u: any = {};
                DIAS.forEach(d => { u[d] = { estudiar: 0, trabajar: 0, dormir: 0, jugar: 0 }; });
                return u;
            };

            const parseUsoTiempo = (nna: any): Record<string, UsoTiempoDia> => {
                if (nna.datosF03) {
                    try {
                        const parsed = typeof nna.datosF03 === 'string' ? JSON.parse(nna.datosF03) : nna.datosF03;
                        if (parsed?.usoTiempo) return parsed.usoTiempo;
                    } catch {}
                }
                const saved = nna.actividadesTiempoLibre || '';
                if (saved.startsWith('JSON:')) {
                    try {
                        const parsed = JSON.parse(saved.slice(5));
                        if (parsed?.grid) return parsed.grid;
                    } catch {}
                }
                return emptyUso();
            };

            const parseActividadesTiempoLibre = (nna: any): ActividadTiempoLibre[] => {
                if (nna.datosF03) {
                    try {
                        const parsed = typeof nna.datosF03 === 'string' ? JSON.parse(nna.datosF03) : nna.datosF03;
                        if (parsed?.actividadesTiempoLibreLista && Array.isArray(parsed.actividadesTiempoLibreLista)) {
                            return parsed.actividadesTiempoLibreLista;
                        }
                    } catch {}
                }
                return [];
            };

            const mappedNnas = selectedExpediente.map((nna: any) => ({
                id: nna.id,
                nombres: nna.nombres,
                apellidoPaterno: nna.apellidoPaterno,
                apellidoMaterno: nna.apellidoMaterno,
                numeroDoc: nna.numeroDoc || '',
                fechaNacimiento: nna.fechaNacimiento ? nna.fechaNacimiento.split('T')[0] : '',
                tipoDoc: nna.tipoDoc,
                sexo: nna.sexo || '',
                tienePartidaNacimiento: nna.tienePartidaNacimiento ? "true" : "false",
                detalleSinDoc: nna.detalleSinDoc || '',

                departamentoNac: nna.departamentoNac || '',
                provinciaNac: nna.provinciaNac || '',
                distritoNac: nna.distritoNac || '',

                estudiaActualmente: nna.estudiaActualmente,
                nivelEducativo: nna.nivelEducativo || '',
                gradoEstudio: nna.gradoEstudio || '',
                institucionEducativa: nna.institucionEducativa || '',
                modalidadEstudio: nna.modalidadEstudio || '',
                detalleNoEstudia: nna.detalleNoEstudia || '',

                afiliadoSIS: nna.afiliadoSIS || '',
                afiliadoOtroSeguro: nna.afiliadoOtroSeguro || '',
                detalleOtroSeguro: nna.detalleOtroSeguro || '',
                sufreEnfermedad: nna.sufreEnfermedad || '',
                detalleEnfermedad: nna.detalleEnfermedad || '',
                observacionesSalud: nna.observacionesSalud || '',
                tieneDiscapacidad: nna.tieneDiscapacidad,
                tipoDiscapacidad: nna.tipoDiscapacidad || '',

                actividadesTiempoLibre: nna.actividadesTiempoLibre || '',
                caracteristicas: nna.caracteristicas || '',
                tieneAntecedenteAlbergue: nna.tieneAntecedenteAlbergue,
                detalleAntecedenteAlbergue: nna.detalleAntecedenteAlbergue || '',
                usoTiempo: parseUsoTiempo(nna),
                actividadesTiempoLibreLista: parseActividadesTiempoLibre(nna)
            }));

            reset({
                zonaIntervencion: activeCase?.zonaIntervencion || '',
                perfil: activeCase?.perfil || '',
                situacionCalle: activeCase?.situacionCalle || '',
                fechaAbordaje: activeCase?.fechaAbordaje ? activeCase.fechaAbordaje.split('T')[0] : '',
                fechaIngreso: activeCase?.fechaIngreso ? activeCase.fechaIngreso.split('T')[0] : '',
                fechaReingreso: activeCase?.fechaReingreso ? activeCase.fechaReingreso.split('T')[0] : '',
                fechaCambioPerfil: activeCase?.fechaCambioPerfil ? activeCase.fechaCambioPerfil.split('T')[0] : '',
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
                viveCon: mainNna.viveCon || '',
                detalleViveCon: mainNna.detalleViveCon || '',
                lugarPernocte: mainNna.lugarPernocte || '',
                detalleLugarPernocte: mainNna.detalleLugarPernocte || '',
                nombreTutor: mainNna.nombreTutor || '',

                nnas: mappedNnas
            });
        }
    }, [isEditMode, selectedExpediente, reset]);

    const checkDuplicates = (index: number) => {
        const nna = watch(`nnas.${index}`);
        const otrosNnas = nnasList.filter((_, i) => i !== index);
        
        let status: 'unique' | 'homonym' | 'duplicate' = 'unique';
        let matches: any[] = [];

        for (const otro of otrosNnas) {
            if (nna.numeroDoc && otro.numeroDoc === nna.numeroDoc) {
                status = 'duplicate';
                matches.push(otro);
            } else if (
                nna.apellidoPaterno.toLowerCase() === otro.apellidoPaterno.toLowerCase() &&
                nna.apellidoMaterno.toLowerCase() === otro.apellidoMaterno.toLowerCase() &&
                nna.nombres.toLowerCase().includes(otro.nombres.toLowerCase())
            ) {
                if (status !== 'duplicate') status = 'homonym';
                matches.push(otro);
            }
        }

        setCurrentNnaIndexForDuplicate(index);
        setDuplicateCheckResults({ status, message: `${matches.length} coincidencia(s) encontrada(s)`, matches });
        if (status === 'duplicate' || status === 'homonym') {
            setShowDuplicateDrawer(true);
        }
    };

    const onSubmit = async (data: NnaFormData) => {
        setSubmitting(true);
        
        // 1. Process Activities & Uso de Tiempo for each NNA
        data.nnas = data.nnas.map(nna => {
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
                diagnostico: riesgo
            };

            // Guardamos la cadena corta para actividades_tiempo_libre y guardamos el JSON rico en datosF03Backup
            nna.actividadesTiempoLibre = diag;
            (nna as any).datosF03Backup = JSON.stringify(datosF03);
            return nna;
        });

        // 2. Build the mapped request payload matching RegistrarNnaRequest and Oracle schemas
        const parseDate = (d: string | null | undefined) => {
            if (!d) return null;
            return `${d}T00:00:00`;
        };

        const mappedNnas = data.nnas.map(nna => {
            const tienePartida = (nna.tienePartidaNacimiento as any) === "true" || (nna.tienePartidaNacimiento as any) === true;
            const tieneDiscapacidad = nna.tieneDiscapacidad === true;
            const estudiaActualmente = nna.estudiaActualmente === true;
            const tieneAntecedenteAlbergue = nna.tieneAntecedenteAlbergue === true;
            const sufreEnfermedad = (nna.sufreEnfermedad as any) === "SI" || (nna.sufreEnfermedad as any) === "true" || (nna.sufreEnfermedad as any) === true;

            const nnaObj: any = {
                id: (nna as any).id || undefined,
                nombres: nna.nombres,
                apellido_paterno: nna.apellidoPaterno,
                apellido_materno: nna.apellidoMaterno || null,
                tipo_doc: nna.tipoDoc,
                numero_doc: nna.numeroDoc || null,
                fecha_nacimiento: parseDate(nna.fechaNacimiento),
                sexo: nna.sexo || null,
                nacionalidad: "PERUANA",
                tiene_partida_nacimiento: tienePartida,
                detalle_sin_doc: nna.detalleSinDoc || null,

                // Ubicación Nacimiento
                departamento_nac: nna.departamentoNac || null,
                provincia_nac: nna.provinciaNac || null,
                distrito_nac: nna.distritoNac || null,

                // Domicilio - Copied from parent level
                domicilio_actual: data.domicilioActual || null,
                referencia_domicilio: data.referenciaDomicilio || null,
                departamento_dom: data.departamentoDom || null,
                provincia_dom: data.provinciaDom || null,
                distrito_dom: data.distritoDom || null,
                telefono_contacto: data.telefonoContacto || null,

                // Familia / Tutor - Copied from parent level
                nombre_tutor: data.nombreTutor || null,
                vive_con: data.viveCon || null,
                detalle_vive_con: data.detalleViveCon || null,
                tiene_hermanos: false,
                cant_hermanos: 0,
                detalles_hermanos: null,
                lugar_pernocte: data.lugarPernocte || null,
                detalle_lugar_pernocte: data.detalleLugarPernocte || null,
                tiene_antecedente_albergue: tieneAntecedenteAlbergue,
                detalle_antecedente_albergue: nna.detalleAntecedenteAlbergue || null,

                // Salud
                afiliado_sis: nna.afiliadoSIS || null,
                afiliado_otro_seguro: nna.afiliadoOtroSeguro || null,
                detalle_otro_seguro: nna.detalleOtroSeguro || null,
                sufre_enfermedad: sufreEnfermedad,
                detalle_enfermedad: nna.detalleEnfermedad || null,
                observaciones_salud: nna.observacionesSalud || null,
                tiene_discapacidad: tieneDiscapacidad,
                tipo_discapacidad: nna.tipoDiscapacidad || null,
                detalle_discapacidad: null,

                // Educación
                estudia_actualmente: estudiaActualmente,
                nivel_educativo: nna.nivelEducativo || null,
                grado_estudio: nna.gradoEstudio || null,
                institucion_educativa: nna.institucionEducativa || null,
                modalidad_estudio: nna.modalidadEstudio || null,
                detalle_no_estudia: nna.detalleNoEstudia || null,

                // Edad
                edad: null,
                unidad_edad: "ANIOS",

                // Otros / Calle
                actividades_tiempo_libre: nna.actividadesTiempoLibre || null,
                caracteristicas: nna.caracteristicas || null,
                datos_f03: (nna as any).datosF03Backup || null
            };

            return nnaObj;
        });

        // Construct the root payload
        const payload: any = {
            nnas: mappedNnas,
            perfil: data.perfil,
            zona_intervencion: data.zonaIntervencion || null,
            distrito_intervencion: data.distritoDom || null,
            situacion_calle: data.situacionCalle || null,
            actividad_realizada: data.actividadRealizada || null,
            tiempo_en_calle: data.tiempoEnCalle || null,
            condicion: data.condicion || null,
            fecha_abordaje: parseDate(data.fechaAbordaje),
            fecha_ingreso: parseDate(data.fechaIngreso),
            fecha_reingreso: parseDate(data.fechaReingreso),
            fecha_cambio_perfil: parseDate(data.fechaCambioPerfil),
            horario_inicio: data.horarioInicio || null,
            horario_fin: data.horarioFin || null,
            horario_inicio2: data.horarioInicio2 || null,
            horario_fin2: data.horarioFin2 || null,
            dias_trabajo: data.diasTrabajo || null
        };

        try {
            if (isEditMode) {
                const carpetaId = (selectedExpediente?.[0] as any)?.carpetaId;
                payload.carpeta_id = carpetaId;
                await updateExpediente(payload);
                navigate('/nna');
            } else {
                payload.crear_nueva_carpeta = true;
                await createNna(payload);
                navigate('/nna');
            }
        } catch (e) {
            console.error("Submission failed", e);
            alert("Error al guardar: " + e);
        } finally {
            setSubmitting(false);
        }
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
        setValue(`nnas.${nnaIndex}.actividadesTiempoLibreLista` as any, newList);
        setEditingActivityIndex(null);
        setShowTimeActivityModal(false);
    };

    const handleDeleteActivity = (nnaIndex: number, activityIndex: number) => {
        const currentList = watch(`nnas.${nnaIndex}.actividadesTiempoLibreLista`) || [];
        setValue(`nnas.${nnaIndex}.actividadesTiempoLibreLista` as any, currentList.filter((_, i) => i !== activityIndex));
    };

    return (
        <div className="flex h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-0px)] gap-0 bg-slate-50 overflow-hidden">
            {/* SIDEBAR */}
            <aside className="w-52 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
                <div className="px-4 py-4 border-b border-gray-100 bg-blue-600">
                    <p className="text-white font-bold text-sm leading-tight">Ficha de Inscripción</p>
                    <p className="text-blue-200 text-[11px] mt-0.5">Formato F03 · Registro Oficial</p>
                </div>

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
            <main className="flex-1 bg-white flex flex-col overflow-hidden relative">
                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
                    <div className="flex-1 overflow-y-auto p-8">
                        {storeError && (
                            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                {storeError}
                            </div>
                        )}

                        {/* PASO 1: I. DATOS GENERALES */}
                        {activeSection === 'paso1_generales' && (
                            <div className="space-y-6 animate-fadeIn">
                                <SectionHeader title="I. Datos Generales" subtitle="Ubicación de la intervención y marco temporal." />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <InputField
                                            label="Zona de Intervención (Lugar específico)"
                                            register={register('zonaIntervencion', { required: 'La zona es obligatoria' })}
                                            placeholder="Ej: Plaza de Armas, Jr. Comercio..."
                                            error={errors.zonaIntervencion}
                                        />
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 pt-6 mt-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-3">Perfil del NNA (Situación Identificada)</label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {['TRABAJO_EN_CALLE', 'MENDICIDAD', 'VIDA_EN_CALLE', 'EXPLOTACION_SEXUAL'].map((perf) => (
                                            <label key={perf} className={clsx(
                                                "cursor-pointer border rounded-xl p-4 flex flex-col items-center gap-2 transition-all hover:bg-gray-50",
                                                watch('perfil') === perf ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-500" : "border-gray-200"
                                            )}>
                                                <input type="radio" value={perf} {...register('perfil', { required: true })} className="sr-only" />
                                                <span className="font-bold text-xs text-gray-600 block text-center uppercase">{perf.replace(/_/g, ' ')}</span>
                                                <div className={clsx("w-4 h-4 rounded-full border flex items-center justify-center", watch('perfil') === perf ? "border-blue-600 bg-blue-600" : "border-gray-300")}>
                                                    {watch('perfil') === perf && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 pt-6 mt-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Modalidad de Permanencia (Situación)</label>
                                    <div className="flex gap-6">
                                        <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-lg border border-yellow-200 shadow-sm transition-all hover:bg-yellow-50">
                                            <input type="radio" value="TRANSITO_EN_CALLE" {...register('situacionCalle', { required: 'Debe marcar la situación' })} className="text-yellow-600 focus:ring-yellow-500" />
                                            <span className="font-bold text-sm text-gray-800">Tránsito en Calle</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-lg border border-yellow-200 shadow-sm transition-all hover:bg-yellow-50">
                                            <input type="radio" value="CONVIVENCIA_EN_CALLE" {...register('situacionCalle', { required: 'Debe marcar la situación' })} className="text-yellow-600 focus:ring-yellow-500" />
                                            <span className="font-bold text-sm text-gray-800">Convivencia en Calle (Pernocte)</span>
                                        </label>
                                    </div>
                                    {errors.situacionCalle && <span className="text-red-500 text-xs font-bold mt-1">Este campo es requerido.</span>}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 border-t border-gray-100 pt-6">
                                    <InputField type="date" label="Fecha de Abordaje" register={register('fechaAbordaje')} />
                                    <InputField type="date" label="Fecha de Ingreso" register={register('fechaIngreso')} />
                                    <InputField type="date" label="Fecha Reingreso" register={register('fechaReingreso')} />
                                    <InputField type="date" label="Fecha Cambio Perfil" register={register('fechaCambioPerfil')} />
                                </div>
                            </div>
                        )}

                        {/* PASO 2: II. DATOS PERSONALES */}
                        {activeSection === 'paso2_personales' && (
                            <div className="space-y-8 animate-fadeIn">
                                <SectionHeader title="II. Datos Personales del NNA" subtitle="Información de identidad y ubicación." />

                                <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 mb-6 group hover:border-blue-300 transition-all">
                                    <h3 className="text-sm font-black text-blue-900 uppercase mb-4 flex items-center gap-2">
                                        <MapPin size={16} /> Domicilio Actual y Contacto
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div className="md:col-span-2">
                                            <InputField label="Domicilio Actual" register={register('domicilioActual')} placeholder="Dirección exacta" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <InputField label="Referencia" register={register('referenciaDomicilio')} placeholder="Referencia de ubicación" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="label"><span className="label-text font-bold text-gray-700">Ubicación Geográfica</span></label>
                                            <UbigeoFields
                                                departamento={watch('departamentoDom')}
                                                provincia={watch('provinciaDom')}
                                                distrito={watch('distritoDom')}
                                                onChange={({ departamento, provincia, distrito }) => {
                                                    setValue('departamentoDom', departamento);
                                                    setValue('provinciaDom', provincia);
                                                    setValue('distritoDom', distrito);
                                                }}
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <InputField label="Teléfono de Referencia" register={register('telefonoContacto')} placeholder="999..." />
                                        </div>
                                    </div>
                                </div>

                                {fields.map((field, index) => (
                                    <div key={field.id} className="bg-gray-50 rounded-xl border border-gray-200 p-5 relative mt-6">
                                        <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-2">
                                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                                <span className="bg-gray-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">{index + 1}</span>
                                                Datos del NNA {index > 0 ? '(Hermano)' : ''}
                                            </h3>
                                            {index > 0 && (
                                                <button type="button" onClick={() => remove(index)} className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1">
                                                    <Trash2 size={14} /> Eliminar
                                                </button>
                                            )}
                                        </div>

                                        {/* Duplicate Check Semaphore */}
                                        <div className="mb-3 flex items-center justify-between">
                                            <DuplicateSemaphore
                                                status={duplicateCheckResults?.status || 'unique'}
                                                onClick={() => checkDuplicates(index)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => checkDuplicates(index)}
                                                className="text-xs font-bold text-blue-600 hover:text-blue-800"
                                            >
                                                Verificar
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <InputField label="Apellido Paterno" register={register(`nnas.${index}.apellidoPaterno` as const, { required: true })} placeholder="Ap. Paterno" />
                                            <InputField label="Apellido Materno" register={register(`nnas.${index}.apellidoMaterno` as const)} placeholder="Ap. Materno" />
                                            <InputField label="Nombres" register={register(`nnas.${index}.nombres` as const, { required: true })} placeholder="Nombres" />

                                            <div className="md:col-span-1">
                                                <SelectField label="Sexo" register={register(`nnas.${index}.sexo` as const)} options={[
                                                    { value: 'M', label: 'Masculino' },
                                                    { value: 'F', label: 'Femenino' }
                                                ]} />
                                            </div>
                                            <InputField type="date" label="Fecha Nacimiento (DD/MM/AAAA)" register={register(`nnas.${index}.fechaNacimiento` as const)} />

                                            <div className="md:col-span-3 grid grid-cols-3 gap-2 bg-white p-3 rounded border border-gray-200">
                                                <label className="col-span-3 text-[10px] font-bold text-gray-500 uppercase">Lugar de Nacimiento</label>
                                                <div className="col-span-3">
                                                    <UbigeoFields
                                                        departamento={watch(`nnas.${index}.departamentoNac`)}
                                                        provincia={watch(`nnas.${index}.provinciaNac`)}
                                                        distrito={watch(`nnas.${index}.distritoNac`)}
                                                        onChange={({ departamento, provincia, distrito }) => {
                                                            setValue(`nnas.${index}.departamentoNac` as const, departamento);
                                                            setValue(`nnas.${index}.provinciaNac` as const, provincia);
                                                            setValue(`nnas.${index}.distritoNac` as const, distrito);
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="md:col-span-3 bg-white p-4 rounded border border-gray-200 mt-2">
                                                <h4 className="text-xs font-bold text-gray-700 uppercase mb-3 border-b pb-1">Documento de Identidad</h4>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <SelectField label="Tipo Documento" register={register(`nnas.${index}.tipoDoc` as const)} options={[
                                                        { value: 'DNI', label: 'DNI' },
                                                        { value: 'SIN_DOC', label: 'Sin Documento' },
                                                        { value: 'CEDULA', label: 'Cédula Ext.' },
                                                        { value: 'PARTIDA', label: 'Partida Nac.' }
                                                    ]} />

                                                    <div className="md:col-span-2">
                                                        <InputField label="Nº de Documento / DNI" register={register(`nnas.${index}.numeroDoc` as const)} placeholder="Ingrese número si tiene" />
                                                    </div>

                                                    <div className="flex flex-col justify-end pb-2">
                                                        <label className="text-xs font-bold text-gray-500 mb-1 block">¿Tiene Partida Nac.?</label>
                                                        <div className="flex gap-4">
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input type="radio" value="true" {...register(`nnas.${index}.tienePartidaNacimiento` as const)} className="text-blue-600" />
                                                                <span className="text-sm">Sí</span>
                                                            </label>
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input type="radio" value="false" {...register(`nnas.${index}.tienePartidaNacimiento` as const)} className="text-blue-600" />
                                                                <span className="text-sm">NO</span>
                                                            </label>
                                                        </div>
                                                    </div>

                                                    <div className="md:col-span-2">
                                                        <InputField label="¿Por qué? (En caso no tenga documento)" register={register(`nnas.${index}.detalleSinDoc` as const)} placeholder="Especifique motivo..." />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <button type="button" onClick={() => {
                                    const primerNna = watch('nnas.0');
                                    append({
                                        nombres: '',
                                        apellidoPaterno: primerNna?.apellidoPaterno || '',
                                        apellidoMaterno: primerNna?.apellidoMaterno || '',
                                        tipoDoc: 'DNI',
                                        departamentoNac: primerNna?.departamentoNac || '',
                                        provinciaNac: primerNna?.provinciaNac || '',
                                        distritoNac: primerNna?.distritoNac || '',
                                        institucionEducativa: primerNna?.institucionEducativa || '',
                                        estudiaActualmente: true,
                                        tienePartidaNacimiento: "true",
                                        tieneDiscapacidad: false,
                                        sexo: '',
                                        fechaNacimiento: '',
                                        numeroDoc: '',
                                        detalleSinDoc: '',
                                        detalleNoEstudia: '',
                                        modalidadEstudio: '',
                                        nivelEducativo: '',
                                        gradoEstudio: '',
                                        tipoDiscapacidad: '',
                                        afiliadoSIS: '',
                                        afiliadoOtroSeguro: '',
                                        detalleOtroSeguro: '',
                                        sufreEnfermedad: '',
                                        detalleEnfermedad: '',
                                        observacionesSalud: '',
                                        actividadesTiempoLibre: '',
                                        caracteristicas: '',
                                        tieneAntecedenteAlbergue: false,
                                        detalleAntecedenteAlbergue: '',
                                        usoTiempo: {} as Record<string, UsoTiempoDia>,
                                        actividadesTiempoLibreLista: []
                                    });
                                }} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 text-gray-500 hover:text-blue-600 font-bold transition-all flex items-center justify-center gap-2">
                                    <Plus size={20} /> Agregar Hermano (Copiar apellidos)
                                </button>
                            </div>
                        )}

                        {/* PASO 3: III. DATOS SEGÚN PERFIL */}
                        {activeSection === 'paso3_perfil' && (
                            <div className="space-y-6 animate-fadeIn">
                                <SectionHeader title="III. Datos Según Perfil" subtitle="Características de la situación en calle (Entrevista)." />

                                <ActividadesCalleSection control={control} />
                            </div>
                        )}

                        {/* PASO 4: IV. EDUCACIÓN */}
                        {activeSection === 'paso4_educacion' && (
                            <div className="space-y-8 animate-fadeIn">
                                <SectionHeader title="IV. Educación" subtitle="Situación educativa de cada NNA." />

                                {fields.map((field, index) => (
                                    <div key={field.id} className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
                                        <h3 className="font-bold text-gray-800 text-sm mb-4 bg-gray-100 px-3 py-1 rounded inline-block">
                                            {index + 1}. {watch(`nnas.${index}.nombres`) || 'NNA Sin Nombre'} {watch(`nnas.${index}.apellidoPaterno`)}
                                        </h3>

                                        <div className="mb-2">
                                            <div className="flex items-center gap-4 mb-4">
                                                <label className="flex items-center gap-2 cursor-pointer bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
                                                    <input type="checkbox" {...register(`nnas.${index}.estudiaActualmente` as const)} className="w-4 h-4 text-blue-600 rounded" />
                                                    <span className="font-bold text-sm text-blue-900">¿Estudia Actualmente?</span>
                                                </label>
                                            </div>

                                            {watch(`nnas.${index}.estudiaActualmente`) ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slideDown">
                                                    <SelectField label="Nivel Educativo" register={register(`nnas.${index}.nivelEducativo` as const)} options={[
                                                        { value: 'INICIAL', label: 'Inicial' },
                                                        { value: 'PRIMARIA', label: 'Primaria' },
                                                        { value: 'SECUNDARIA', label: 'Secundaria' },
                                                        { value: 'NO_ESCOLARIZADO', label: 'No Escolarizado' }
                                                    ]} />
                                                    <InputField label="Grado / Año" register={register(`nnas.${index}.gradoEstudio` as const)} placeholder="Ej: 3ro" />
                                                    <InputField label="Institución Educativa" register={register(`nnas.${index}.institucionEducativa` as const)} placeholder="Nombre del Colegio" />
                                                    <SelectField label="Modalidad" register={register(`nnas.${index}.modalidadEstudio` as const)} options={[
                                                        { value: 'EBR', label: 'EBR (Regular)' },
                                                        { value: 'EBA', label: 'EBA (Alternativa)' },
                                                        { value: 'EBE', label: 'EBE (Especial)' },
                                                        { value: 'CETPRO', label: 'CETPRO' }
                                                    ]} />
                                                </div>
                                            ) : (
                                                <div className="bg-red-50 p-4 rounded-lg border border-red-100 animate-fadeIn">
                                                    <InputField label="¿Por qué no estudia?" register={register(`nnas.${index}.detalleNoEstudia` as const)} placeholder="Motivo de deserción..." />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* PASO 5: V. SALUD */}
                        {activeSection === 'paso5_salud' && (
                            <div className="space-y-8 animate-fadeIn">
                                <SectionHeader title="V. Salud" subtitle="Aseguramiento y condición de salud." />

                                {fields.map((field, index) => (
                                    <div key={field.id} className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
                                        <h3 className="font-bold text-gray-800 text-sm mb-4 bg-gray-100 px-3 py-1 rounded inline-block">
                                            {index + 1}. {watch(`nnas.${index}.nombres`) || 'NNA Sin Nombre'} {watch(`nnas.${index}.apellidoPaterno`)}
                                        </h3>

                                        <div className="space-y-6">
                                            <div className="border rounded-lg overflow-hidden">
                                                <div className="grid grid-cols-[2fr_1fr_1fr_1fr] border-b divide-x items-center bg-gray-50">
                                                    <div className="p-3 text-sm font-bold text-gray-700">¿Estás afiliado al Seguro Universal de Salud (SIS)?</div>
                                                    {['SI', 'NO', 'NO_SABE'].map((opt) => (
                                                        <label key={opt} className={`p-3 flex items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors h-full ${watch(`nnas.${index}.afiliadoSIS` as const) === opt ? 'bg-blue-100 text-blue-900 font-bold' : ''}`}>
                                                            <input type="radio" value={opt} {...register(`nnas.${index}.afiliadoSIS` as const)} className="mr-2" />
                                                            <span className="text-xs font-bold">{opt.replace('_', ' ')}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                                <div className="grid grid-cols-[2fr_1fr_1fr_1fr] divide-x items-center bg-white">
                                                    <div className="p-3 text-sm font-bold text-gray-700">¿Estás afiliado a algún otro tipo de seguro de salud?</div>
                                                    {['SI', 'NO', 'NO_SABE'].map((opt) => (
                                                        <label key={opt} className={`p-3 flex items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors h-full ${watch(`nnas.${index}.afiliadoOtroSeguro` as const) === opt ? 'bg-blue-100 text-blue-900 font-bold' : ''}`}>
                                                            <input type="radio" value={opt} {...register(`nnas.${index}.afiliadoOtroSeguro` as const)} className="mr-2" />
                                                            <span className="text-xs font-bold">{opt.replace('_', ' ')}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                                {watch(`nnas.${index}.afiliadoOtroSeguro` as const) === 'SI' && (
                                                    <div className="p-3 bg-blue-50 animate-slideDown border-t">
                                                        <InputField label="De ser afirmativo especificar: ¿Cuál?" register={register(`nnas.${index}.detalleOtroSeguro` as const)} placeholder="Especifique el seguro..." />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="border rounded-lg overflow-hidden">
                                                <div className="grid grid-cols-[2fr_1fr_1fr] border-b divide-x items-center bg-gray-50">
                                                    <div className="p-3 text-sm font-bold text-gray-700">¿Sufres alguna enfermedad actualmente?</div>
                                                    {['SI', 'NO'].map((opt) => (
                                                        <label key={opt} className={`p-3 flex items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors h-full ${watch(`nnas.${index}.sufreEnfermedad` as const) === opt ? 'bg-blue-100 text-blue-900 font-bold' : ''}`}>
                                                            <input type="radio" value={opt} {...register(`nnas.${index}.sufreEnfermedad` as const)} className="mr-2" />
                                                            <span className="text-xs font-bold">{opt}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                                {watch(`nnas.${index}.sufreEnfermedad` as const) === 'SI' && (
                                                    <div className="p-3 bg-red-50 animate-slideDown">
                                                        <InputField label="De ser afirmativo especificar: ¿Cuál?" register={register(`nnas.${index}.detalleEnfermedad` as const)} placeholder="Especifique la enfermedad..." />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="border rounded-lg overflow-hidden">
                                                <div className="grid grid-cols-[2fr_1fr_1fr] border-b divide-x items-center bg-gray-50">
                                                    <div className="p-3 text-sm font-bold text-gray-700">¿Presenta algún tipo de discapacidad?</div>
                                                    <label className={`p-3 flex items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors h-full ${watch(`nnas.${index}.tieneDiscapacidad` as const) === true ? 'bg-blue-100 text-blue-900 font-bold' : ''}`}>
                                                        <input
                                                            type="radio"
                                                            value="true"
                                                            {...register(`nnas.${index}.tieneDiscapacidad` as const)}
                                                            className="mr-2"
                                                            checked={String(watch(`nnas.${index}.tieneDiscapacidad`)) === 'true'}
                                                            onChange={() => setValue(`nnas.${index}.tieneDiscapacidad`, true)}
                                                        />
                                                        <span className="text-xs font-bold">Sí</span>
                                                    </label>
                                                    <label className={`p-3 flex items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors h-full ${watch(`nnas.${index}.tieneDiscapacidad` as const) === false ? 'bg-blue-100 text-blue-900 font-bold' : ''}`}>
                                                        <input
                                                            type="radio"
                                                            value="false"
                                                            {...register(`nnas.${index}.tieneDiscapacidad` as const)}
                                                            className="mr-2"
                                                            checked={String(watch(`nnas.${index}.tieneDiscapacidad`)) === 'false'}
                                                            onChange={() => setValue(`nnas.${index}.tieneDiscapacidad`, false)}
                                                        />
                                                        <span className="text-xs font-bold">NO</span>
                                                    </label>
                                                </div>

                                                {(String(watch(`nnas.${index}.tieneDiscapacidad`)) === 'true') && (
                                                    <div className="p-4 bg-gray-50 animate-slideDown">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            {DISCAPACIDADES_CONADIS.map((discap) => (
                                                                <label key={discap} className={`flex items-center gap-3 p-3 rounded border cursor-pointer hover:bg-white transition-all ${watch(`nnas.${index}.tipoDiscapacidad` as const) === discap ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 bg-white'}`}>
                                                                    <input
                                                                        type="radio"
                                                                        value={discap}
                                                                        {...register(`nnas.${index}.tipoDiscapacidad` as const)}
                                                                        className="h-4 w-4 text-blue-600"
                                                                    />
                                                                    <span className="text-sm text-gray-700 font-medium">{discap}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="pt-2">
                                                <InputField label="Observaciones Salud / Lugar de Atención" register={register(`nnas.${index}.observacionesSalud` as const)} />
                                            </div>

                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* PASO 6: VI. FAMILIA y VII. TIEMPO LIBRE */}
                        {activeSection === 'paso6_familia' && (
                            <div className="space-y-8 animate-fadeIn">
                                <SectionHeader title="VI. Familia / VII. Tiempo Libre" subtitle="Datos de vivienda y actividades de tiempo libre." />

                                {/* VI. FAMILIA */}
                                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
                                    <h3 className="bg-purple-50 text-purple-900 font-bold px-4 py-3 border-b border-purple-100 flex items-center gap-2">
                                        <Home size={18} /> VI. FAMILIA
                                    </h3>
                                    <div className="p-5 space-y-6">

                                        <div className="space-y-3">
                                            <div className="text-sm font-bold text-gray-800">¿Con quiénes vives?</div>
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                                {[
                                                    'Madre', 'Padre', 'Abuelos', 'Tíos', 'Hermanos',
                                                    'Pareja', 'Hijos', 'Amigos', 'Solo en Calle', 'Albergue',
                                                    'Institución', 'Otro'
                                                ].map((opt) => (
                                                    <label key={opt} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${watch('viveCon') === opt ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                                                        <input type="radio" value={opt} {...register('viveCon')} className="text-blue-600" />
                                                        <span className="text-xs font-bold text-gray-700">{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {watch('viveCon') === 'Otro' && (
                                            <div className="animate-slideDown">
                                                <InputField label="Especifique" register={register('detalleViveCon')} placeholder="Detalle..." />
                                            </div>
                                        )}

                                        <div className="space-y-3">
                                            <div className="text-sm font-bold text-gray-800">¿Dónde pernocta generalmente?</div>
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                                {['Casa Propia', 'Casa Familiar', 'Calle', 'Albergue', 'Refugio Temporal', 'Obra'].map((opt) => (
                                                    <label key={opt} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${watch('lugarPernocte') === opt ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                                                        <input type="radio" value={opt} {...register('lugarPernocte')} className="text-blue-600" />
                                                        <span className="text-xs font-bold text-gray-700">{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {watch('lugarPernocte') === 'Otro' && (
                                            <div className="animate-slideDown">
                                                <InputField label="Especifique" register={register('detalleLugarPernocte')} placeholder="Detalle..." />
                                            </div>
                                        )}

                                        <InputField label="Nombre del Tutor / Responsable" register={register('nombreTutor')} placeholder="Si aplica" />

                                        <div className="space-y-3">
                                            <div className="text-sm font-bold text-gray-800">¿Tiene antecedente de albergue?</div>
                                            <div className="flex gap-3">
                                                {[true, false].map((val) => (
                                                    <label key={String(val)} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${watch('nnas.0.tieneAntecedenteAlbergue') === val ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                                                        <input
                                                            type="radio"
                                                            value={String(val)}
                                                            onChange={() => fields.forEach((_, i) => setValue(`nnas.${i}.tieneAntecedenteAlbergue` as any, val))}
                                                            checked={watch('nnas.0.tieneAntecedenteAlbergue') === val}
                                                            className="text-blue-600"
                                                        />
                                                        <span className="text-xs font-bold text-gray-700">{val ? 'Sí' : 'No'}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {watch('nnas.0.tieneAntecedenteAlbergue') && (
                                            <div className="animate-slideDown">
                                                <InputField label="Detalle" register={register('nnas.0.detalleAntecedenteAlbergue' as const)} placeholder="Mencione dónde y cuándo..." />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* VII. ACTIVIDADES DE TIEMPO LIBRE */}
                                {fields.map((field, nnaIndex) => (
                                    <div key={field.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
                                        <h3 className="bg-blue-50 text-blue-900 font-bold px-4 py-3 border-b border-blue-100 flex items-center gap-2">
                                            <Calendar size={18} /> VII. Actividades de Tiempo Libre - {watch(`nnas.${nnaIndex}.nombres`)} {watch(`nnas.${nnaIndex}.apellidoPaterno`)}
                                        </h3>
                                        <div className="p-5 space-y-4">

                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                                                {(watch(`nnas.${nnaIndex}.actividadesTiempoLibreLista`) || []).map((activity, actIndex) => (
                                                    <ActivityCard
                                                        key={activity.id}
                                                        activity={activity}
                                                        onEdit={() => {
                                                            setEditingActivityIndex(actIndex);
                                                            setShowTimeActivityModal(true);
                                                        }}
                                                        onDelete={() => handleDeleteActivity(nnaIndex, actIndex)}
                                                    />
                                                ))}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingActivityIndex(null);
                                                    setShowTimeActivityModal(true);
                                                    setCurrentNnaIndexForDuplicate(nnaIndex);
                                                }}
                                                className="w-full py-2 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-blue-600 hover:text-blue-700 font-bold transition-all flex items-center justify-center gap-2"
                                            >
                                                <Plus size={18} /> Agregar Actividad de Tiempo Libre
                                            </button>

                                            <RiskAssessmentPanel
                                                nnaData={watch(`nnas.${nnaIndex}`)}
                                                actividadesList={watch(`nnas.${nnaIndex}.actividadesTiempoLibreLista`) || []}
                                            />

                                        </div>
                                    </div>
                                ))}

                            </div>
                        )}

                    </div>

                    <FooterButtons onBack={handlePrev} onNext={handleNext} onSave={() => handleSubmit(onSubmit)()} loading={submitting} />
                </form>
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

            {/* DUPLICATE CHECKER DRAWER */}
            {showDuplicateDrawer && duplicateCheckResults && (
                <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-40 overflow-y-auto animate-slideInRight">
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                        <h2 className="font-bold text-gray-800">Verificación de Duplicados</h2>
                        <button onClick={() => setShowDuplicateDrawer(false)} className="text-gray-500 hover:text-gray-700">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="p-4 space-y-4">
                        <div className={`p-3 rounded-lg ${duplicateCheckResults.status === 'duplicate' ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                            <p className="text-sm font-bold text-gray-800">{duplicateCheckResults.message}</p>
                        </div>
                        {duplicateCheckResults.matches && duplicateCheckResults.matches.map((match, i) => (
                            <div key={i} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                                <p className="font-bold text-gray-800">{match.nombres} {match.apellidoPaterno} {match.apellidoMaterno}</p>
                                <p className="text-xs text-gray-600">DNI: {match.numeroDoc}</p>
                                {match.tipoDiscapacidad && <p className="text-xs text-gray-600">Tipo: {match.tipoDiscapacidad}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};