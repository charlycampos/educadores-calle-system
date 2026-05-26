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
import { defaultAgenda } from './components/actividades.types';
import type { ActividadPerfil, AgendaSemanal } from './components/actividades.types';

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

    estudiaActualmente: string | boolean;
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
    edad?: number | string;
    unidadEdad?: string;
    nacionalidad: string;
    lenMatNna?: string;
    lenMatEspNna?: string;
    autIdeEtNna?: string;
    autIdeEtEspNna?: string;
    certDiscapNna?: string;
    detalleDiscapacidad?: string;
    usoTiempo?: Record<string, UsoTiempoDia>;
    actividadesTiempoLibreLista?: ActividadTiempoLibre[];
}

interface CasoExpedienteData {
    estado?: string;
    zonaIntervencion?: string;
    perfil?: string;
    situacionCalle?: string;
    fechaAbordaje?: string;
    fechaIngreso?: string;
    fechaReingreso?: string;
    fechaCambioPerfil?: string;
    actividadRealizada?: string;
    tiempoEnCalle?: string;
    condicion?: string;
    horarioInicio?: string;
    horarioFin?: string;
    horarioInicio2?: string;
    horarioFin2?: string;
    diasTrabajo?: string;
}

interface LegacyJornadaDia {
    activo?: boolean;
    inicio?: string;
    fin?: string;
    inicio2?: string;
    fin2?: string;
    tieneTurno2?: boolean;
}

interface LegacyActividadJornada {
    dia?: string;
    inicio?: string;
    fin?: string;
    inicio2?: string;
    fin2?: string;
    tieneTurno2?: boolean;
}

interface LegacyActividadPerfil {
    actividad?: string;
    tiempoValor?: string | number;
    tiempoUnidad?: string;
    tiempoDetalle?: string;
    jornada?: LegacyActividadJornada[];
    condicion?: string;
}

interface DatosF03 {
    usoTiempo?: Record<string, UsoTiempoDia>;
    grid?: Record<string, UsoTiempoDia>;
    actividadesTiempoLibreLista?: ActividadTiempoLibre[];
    actividadesCalle?: ActividadPerfil[];
    actividadesPerfil?: LegacyActividadPerfil[];
    jornadaSemanal?: Record<string, LegacyJornadaDia>;
    jornada_semanal?: Record<string, LegacyJornadaDia>;
}

type HorariosActividad = ActividadTiempoLibre['horarios'];

type ExpedienteNna = Omit<Partial<NnaConDatos>, 'tienePartidaNacimiento' | 'sufreEnfermedad'> & {
    datosF03?: string | DatosF03 | null;
    actividadesTiempoLibre?: string | null;
    casos?: CasoExpedienteData[];
    carpetaId?: number;
    domicilioActual?: string | null;
    referenciaDomicilio?: string | null;
    departamentoDom?: string | null;
    provinciaDom?: string | null;
    distritoDom?: string | null;
    telefonoContacto?: string | null;
    viveCon?: string | null;
    detalleViveCon?: string | null;
    lugarPernocte?: string | null;
    detalleLugarPernocte?: string | null;
    nombreTutor?: string | null;
    tienePartidaNacimiento?: boolean | string;
    sufreEnfermedad?: boolean | string;
};

interface NnaConDatos extends NnaPersonalData {
    id?: number;
    datosF03Backup?: string;
}

interface NnaPayloadItem extends Record<string, unknown> {
    id?: number;
}

interface RegistrarNnaPayload {
    nnas: NnaPayloadItem[];
    perfil: string;
    zona_intervencion: string | null;
    distrito_intervencion: string | null;
    situacion_calle: string | null;
    actividad_realizada: string | null;
    tiempo_en_calle: string | null;
    condicion: string | null;
    fecha_abordaje: string | null;
    fecha_ingreso: string | null;
    fecha_reingreso: string | null;
    fecha_cambio_perfil: string | null;
    horario_inicio: string | null;
    horario_fin: string | null;
    horario_inicio2: string | null;
    horario_fin2: string | null;
    dias_trabajo: string | null;
    carpeta_id?: number;
    crear_nueva_carpeta?: boolean;
    familiares?: any[];
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
    
    // Hermanos (SEC 2026)
    tieneHermanos?: string | boolean;
    cantHermanos?: number | string;
    detallesHermanos?: string;

    // Tutor / Apoderado (SEC 2026)
    tieneTutorApo?: string | number | boolean;
    priApeTutApo?: string;
    segApeTutApo?: string;
    nomApeTutApo?: string;
    sexoApo?: string;
    fechaNacApo?: string;
    nacionalidadApo?: string;
    tipDocTutApo?: string;
    nroDocTutApo?: string;
    vinTutUsu?: string;
    lenMatApo?: string;
    lenMatEspApo?: string;
    autIdeEtApo?: string;
    autIdeEtEspApo?: string;
    tipoDiscapApo?: string;
    certDiscapApo?: string;

    familiares?: FamiliarFormDataItem[];
    actividadesCalle?: ActividadPerfil[];
}

interface FamiliarFormDataItem {
    id?: string;
    nombres?: string;
    parentesco?: string;
    dni?: string;
    telefono?: string;
    ocupacion?: string;
    viveCon?: string; // "SI" / "NO"
    
    // Datos detallados SEC 2026 si aplica
    priApeTutApo?: string;
    segApeTutApo?: string;
    nomApeTutApo?: string;
    sexoApo?: string;
    fechaNacApo?: string;
    nacionalidadApo?: string;
    tipDocTutApo?: string;
    nroDocTutApo?: string;
    vinTutUsu?: string;
    lenMatApo?: string;
    lenMatEspApo?: string;
    autIdeEtApo?: string;
    autIdeEtEspApo?: string;
    tipoDiscapApo?: string;
    certDiscapApo?: string;

    esTutorPrincipal?: boolean | string;
}

interface DuplicateCheckResult {
    status: 'unique' | 'homonym' | 'duplicate';
    message: string;
    matches?: NnaPersonalData[];
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
    const [horarios, setHorarios] = useState<HorariosActividad>(initialData?.horarios || initializeHorarios());

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
    const alertas: string[] = [];

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
        .filter(([, v]) => v.turno1.inicio && v.turno1.fin)
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
    const { createNna, updateExpediente, fetchExpediente, selectedExpediente, error: storeError, parametros, fetchParametros } = useNnaStore();

    useEffect(() => {
        fetchParametros();
    }, [fetchParametros]);
    const [submitting, setSubmitting] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [activeSection, setActiveSection] = useState('paso1_generales');
    const [showTimeActivityModal, setShowTimeActivityModal] = useState(false);
    const [editingActivityIndex, setEditingActivityIndex] = useState<number | null>(null);
    const [showDuplicateDrawer, setShowDuplicateDrawer] = useState(false);
    const [duplicateCheckResults, setDuplicateCheckResults] = useState<DuplicateCheckResult | null>(null);
    const [currentNnaIndexForDuplicate, setCurrentNnaIndexForDuplicate] = useState<number>(0);
    const [showTutorModal, setShowTutorModal] = useState(false);
    const [editingFamiliarIndex, setEditingFamiliarIndex] = useState<number | null>(null);
    const [familiarModalData, setFamiliarModalData] = useState<FamiliarFormDataItem>({
        priApeTutApo: '',
        segApeTutApo: '',
        nomApeTutApo: '',
        nombres: '',
        parentesco: '1',
        dni: '',
        telefono: '',
        ocupacion: '',
        viveCon: 'SI',
        sexoApo: '2',
        fechaNacApo: '',
        nacionalidadApo: 'PERUANA',
        tipDocTutApo: '1',
        nroDocTutApo: '',
        vinTutUsu: '1',
        lenMatApo: '10',
        lenMatEspApo: '',
        autIdeEtApo: '7',
        autIdeEtEspApo: '',
        tipoDiscapApo: '6',
        certDiscapApo: '99',
        esTutorPrincipal: 'false'
    });

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
                 tipoDoc: '1', sexo: '', estudiaActualmente: 'NO', tieneDiscapacidad: false,
                 tienePartidaNacimiento: "true",
                 edad: '',
                 unidadEdad: 'ANIOS',
                 nacionalidad: 'PERUANA',
                 lenMatNna: '10',
                 lenMatEspNna: '',
                 autIdeEtNna: '7',
                 autIdeEtEspNna: '',
                 certDiscapNna: '99',
                 detalleDiscapacidad: '',
                 usoTiempo: {} as Record<string, UsoTiempoDia>,
                 actividadesTiempoLibreLista: []
             }],
             situacionCalle: '',
             perfil: '',
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
             tipDocTutApo: '1',
             nroDocTutApo: '',
             vinTutUsu: '1',
             lenMatApo: '10',
             lenMatEspApo: '',
             autIdeEtApo: '7',
             autIdeEtEspApo: '',
             tipoDiscapApo: '6',
             certDiscapApo: '99',
             familiares: [],
             actividadesCalle: []
        }
    });

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

    const checkDuplicates = (index: number) => {
        const nna = watch(`nnas.${index}`);
        if (!nna) {
            return;
        }

        const otrosNnas = (nnasList || []).filter((_, i) => i !== index);
        const numeroDocNna = (nna.numeroDoc || '').trim();
        const apellidoPaternoNna = (nna.apellidoPaterno || '').toLowerCase();
        const apellidoMaternoNna = (nna.apellidoMaterno || '').toLowerCase();
        const nombresNna = (nna.nombres || '').toLowerCase();

        let status: 'unique' | 'homonym' | 'duplicate' = 'unique';
        const matches: NnaPersonalData[] = [];

        for (const otro of otrosNnas) {
            if (numeroDocNna && otro.numeroDoc === numeroDocNna) {
                status = 'duplicate';
                matches.push(otro);
            } else if (
                apellidoPaternoNna &&
                apellidoMaternoNna &&
                apellidoPaternoNna === (otro.apellidoPaterno || '').toLowerCase() &&
                apellidoMaternoNna === (otro.apellidoMaterno || '').toLowerCase() &&
                nombresNna.includes((otro.nombres || '').toLowerCase())
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
            fecha_abordaje: parseDate(data.fechaAbordaje),
            fecha_ingreso: parseDate(data.fechaIngreso),
            fecha_reingreso: parseDate(data.fechaReingreso),
            fecha_cambio_perfil: parseDate(data.fechaCambioPerfil),
            horario_inicio: data.horarioInicio || null,
            horario_fin: data.horarioFin || null,
            horario_inicio2: data.horarioInicio2 || null,
            horario_fin2: data.horarioFin2 || null,
            dias_trabajo: data.diasTrabajo || null,
            familiares: mappedFamiliares
        };

        try {
            if (isEditMode) {
                const expediente = selectedExpediente as unknown as ExpedienteNna[] | null;
                const carpetaId = expediente?.[0]?.carpetaId;
                payload.carpeta_id = carpetaId;
                await updateExpediente(payload);
                navigate('/nna');
            } else {
                payload.crear_nueva_carpeta = true;
                await createNna(payload);
                navigate('/nna');
            }
        } catch (e) {
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
        setValue(`nnas.${nnaIndex}.actividadesTiempoLibreLista`, newList);
        setEditingActivityIndex(null);
        setShowTimeActivityModal(false);
    };

    const handleDeleteActivity = (nnaIndex: number, activityIndex: number) => {
        const currentList = watch(`nnas.${nnaIndex}.actividadesTiempoLibreLista`) || [];
        setValue(`nnas.${nnaIndex}.actividadesTiempoLibreLista`, currentList.filter((_, i) => i !== activityIndex));
    };

    return (
        <div className="flex h-[calc(100vh-3.5rem)] lg:h-[calc(100vh-0px)] gap-0 bg-slate-50 overflow-hidden">
            {/* SIDEBAR */}
            <aside className="w-52 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
                <div className="px-4 py-4 border-b border-gray-100 bg-blue-600">
                    <p className="text-white font-bold text-sm leading-tight">Ficha de Inscripción</p>
                    <p className="text-blue-200 text-[11px] mt-0.5">Formato F03 · Registro Oficial</p>
                </div>

                {isEditMode && selectedExpediente && selectedExpediente.length > 0 && (
                    <div className="px-4 py-3 border-b border-gray-100 bg-blue-50/50 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                                Edición Activa
                            </span>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Beneficiario (NNA)</p>
                            <p className="text-xs font-bold text-gray-800 truncate" title={`${(selectedExpediente[0] as any).nombres || ''} ${(selectedExpediente[0] as any).apellidoPaterno || ''}`}>
                                {`${(selectedExpediente[0] as any).nombres || ''} ${(selectedExpediente[0] as any).apellidoPaterno || ''}`}
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Nº Ficha</p>
                                <p className="text-xs font-bold text-gray-700 truncate">
                                    {(selectedExpediente[0] as any).codigoFicha03 || 'Sin Código'}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Expediente</p>
                                <p className="text-xs font-bold text-gray-700">
                                    {((selectedExpediente[0] as any).casos?.find((c: any) => c.estado !== 'CERRADO') || (selectedExpediente[0] as any).casos?.[0])?.codigoCaso || `ID: ${id}`}
                                </p>
                            </div>
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
                                                <SelectField label="Sexo" register={register(`nnas.${index}.sexo` as const)} options={parametros?.OPCIONES_SEXO_2026 || [
                                                    { value: '1', label: '1: Masculino' },
                                                    { value: '2', label: '2: Femenino' }
                                                ]} />
                                            </div>

                                            <div className="md:col-span-2 grid grid-cols-3 gap-2">
                                                <div className="col-span-1">
                                                    <InputField type="date" label="Fecha Nacimiento" register={register(`nnas.${index}.fechaNacimiento` as const)} />
                                                </div>
                                                <div className="col-span-1">
                                                    <InputField type="number" label="Edad" register={register(`nnas.${index}.edad` as const)} placeholder="Edad" />
                                                </div>
                                                <div className="col-span-1">
                                                    <SelectField label="Unidad" register={register(`nnas.${index}.unidadEdad` as const)} options={[
                                                        { value: 'ANIOS', label: 'Años' },
                                                        { value: 'MESES', label: 'Meses' },
                                                        { value: 'DIAS', label: 'Días' }
                                                    ]} />
                                                </div>
                                            </div>

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

                                            {/* Identidad Cultural (SEC 2026) */}
                                            <div className="md:col-span-3 bg-white p-3 rounded border border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <label className="col-span-3 text-[10px] font-bold text-gray-500 uppercase">Nacionalidad e Identidad Cultural (SEC 2026)</label>
                                                <InputField label="Nacionalidad" register={register(`nnas.${index}.nacionalidad` as const)} placeholder="Ej. PERUANA" />
                                                
                                                <div>
                                                    <SelectField label="Lengua Materna" register={register(`nnas.${index}.lenMatNna` as const)} options={parametros?.OPCIONES_LENGUA_APO_2026 || [
                                                        { value: '10', label: 'Castellano' },
                                                        { value: '1', label: 'Quechua' },
                                                        { value: '2', label: 'Aimara' },
                                                        { value: '3', label: 'Asháninka' },
                                                        { value: '9', label: 'Otra lengua indígena u originaria' }
                                                    ]} />
                                                    {['9', '12', 'OTRO'].includes(watch(`nnas.${index}.lenMatNna`) || '') && (
                                                        <div className="mt-2">
                                                            <InputField label="Especificar Lengua" register={register(`nnas.${index}.lenMatEspNna` as const)} placeholder="Escriba la lengua..." />
                                                        </div>
                                                    )}
                                                </div>

                                                <div>
                                                    <SelectField label="Autoidentificación Étnica" register={register(`nnas.${index}.autIdeEtNna` as const)} options={parametros?.OPCIONES_ETNIA_APO_2026 || [
                                                        { value: '7', label: 'Mestizo' },
                                                        { value: '1', label: 'Quechua' },
                                                        { value: '2', label: 'Aimara' },
                                                        { value: '8', label: 'Otro' }
                                                    ]} />
                                                    {['8', 'OTRO'].includes(watch(`nnas.${index}.autIdeEtNna`) || '') && (
                                                        <div className="mt-2">
                                                            <InputField label="Especificar Etnia" register={register(`nnas.${index}.autIdeEtEspNna` as const)} placeholder="Escriba la etnia..." />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="md:col-span-3 bg-white p-4 rounded border border-gray-200 mt-2">
                                                <h4 className="text-xs font-bold text-gray-700 uppercase mb-3 border-b pb-1">Documento de Identidad</h4>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <SelectField label="Tipo Documento" register={register(`nnas.${index}.tipoDoc` as const)} options={parametros?.OPCIONES_TIP_DOC_APO_2026 || [
                                                        { value: '1', label: '1: DNI' },
                                                        { value: '2', label: '2: Carné de extranjería' },
                                                        { value: '3', label: '3: Pasaporte' },
                                                        { value: '4', label: '4: Documento de Identidad Extranjero' },
                                                        { value: '5', label: '5: CUI o Acta de Nacimiento' },
                                                        { value: '6', label: '6: Certificado de Nacido Vivo - CNV' },
                                                        { value: '7', label: '7: No tiene' },
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
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                <SelectField
                                                    label="¿Estudia Actualmente? / Situación de Matrícula"
                                                    register={register(`nnas.${index}.estudiaActualmente` as const)}
                                                    options={parametros?.OPCIONES_MATRICULA_2026 || [
                                                        { value: 'SI', label: '1. Sí (cuenta con ficha de matrícula)' },
                                                        { value: 'NO', label: '2. No (no se encuentra matriculado)' },
                                                        { value: 'PROCESO', label: '3. En proceso de matrícula (trámite en gestión)' },
                                                        { value: 'NO_APLICA', label: '99. No aplica (menores de 3 años o egresados de secundaria)' }
                                                    ]}
                                                />
                                            </div>

                                            {['SI', 'PROCESO'].includes(String(watch(`nnas.${index}.estudiaActualmente`))) ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slideDown">
                                                    <SelectField label="Nivel Educativo" register={register(`nnas.${index}.nivelEducativo` as const)} options={parametros?.NIVELES_EDUCATIVOS_2026 || [
                                                        { value: '1', label: '1: Sin nivel' },
                                                        { value: '2', label: '2: Inicial' },
                                                        { value: '3', label: '3: Primaria Incompleta' },
                                                        { value: '4', label: '4: Primaria Completa' },
                                                        { value: '5', label: '5: Secundaria Incompleta' },
                                                        { value: '6', label: '6: Secundaria Completa' },
                                                        { value: '7', label: '7: Superior No Universitaria Incompleta' },
                                                        { value: '8', label: '8: Superior No Universitaria Completa' },
                                                        { value: '9', label: '9: Superior Universitario Incompleto' },
                                                        { value: '10', label: '10: Superior Universitario Completo' },
                                                        { value: '11', label: '11: Básica Especial' }
                                                    ]} />
                                                    <SelectField label="Grado / Año" register={register(`nnas.${index}.gradoEstudio` as const)} options={parametros?.GRADOS_ESTUDIO_2026 || [
                                                        { value: '1', label: '1: Inicial' },
                                                        { value: '2', label: '2: 1ro primaria' },
                                                        { value: '3', label: '3: 2do primaria' },
                                                        { value: '4', label: '4: 3ro primaria' },
                                                        { value: '5', label: '5: 4to primaria' },
                                                        { value: '6', label: '6: 5to primaria' },
                                                        { value: '7', label: '7: 6to primaria' },
                                                        { value: '8', label: '8: 1ro secundaria' },
                                                        { value: '9', label: '9: 2do secundaria' },
                                                        { value: '10', label: '10: 3ro secundaria' },
                                                        { value: '11', label: '11: 4to secundaria' },
                                                        { value: '12', label: '12: 5to secundaria' },
                                                        { value: '13', label: '13: Ciclo I (EBA)' },
                                                        { value: '14', label: '14: Ciclo II (EBA)' },
                                                        { value: '15', label: '15: Ciclo III (EBA)' },
                                                        { value: '16', label: '16: Ciclo IV (EBA)' },
                                                        { value: '17', label: '17: Ciclo V (EBA)' },
                                                        { value: '18', label: '18: Ciclo VI (EBA)' },
                                                        { value: '19', label: '19: Ciclo VII (EBA)' },
                                                        { value: '20', label: '20: Ciclo VIII (EBA)' },
                                                        { value: '21', label: '21: Ciclo IX (EBA)' },
                                                        { value: '22', label: '22: Ciclo X (EBA)' },
                                                        { value: '99', label: '99: No aplica / No sabe' }
                                                    ]} />
                                                    <InputField label="Institución Educativa" register={register(`nnas.${index}.institucionEducativa` as const)} placeholder="Nombre del Colegio" />
                                                    <SelectField label="Modalidad" register={register(`nnas.${index}.modalidadEstudio` as const)} options={parametros?.MODALIDADES_ESTUDIO_2026 || [
                                                        { value: '1', label: '1: Básica / regular (EBR)' },
                                                        { value: '2', label: '2: Alternativa (EBA)' },
                                                        { value: '3', label: '3: Especial (EBE)' },
                                                        { value: '4', label: '4: Superior Técnica' },
                                                        { value: '5', label: '5: Superior Universitaria' },
                                                        { value: '6', label: '6: CETPRO' }
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
                                                            <input
                                                                type="radio"
                                                                value={opt}
                                                                {...register(`nnas.${index}.afiliadoSIS` as const)}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setValue(`nnas.${index}.afiliadoSIS`, val);
                                                                    if (val === 'SI') {
                                                                        setValue(`nnas.${index}.afiliadoOtroSeguro`, 'NO');
                                                                        setValue(`nnas.${index}.detalleOtroSeguro`, '');
                                                                    }
                                                                }}
                                                                className="mr-2"
                                                            />
                                                            <span className="text-xs font-bold">{opt.replace('_', ' ')}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                                <div className="grid grid-cols-[2fr_1fr_1fr_1fr] divide-x items-center bg-white">
                                                    <div className="p-3 text-sm font-bold text-gray-700">¿Estás afiliado a algún otro tipo de seguro de salud?</div>
                                                    {['SI', 'NO', 'NO_SABE'].map((opt) => (
                                                        <label key={opt} className={`p-3 flex items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors h-full ${watch(`nnas.${index}.afiliadoOtroSeguro` as const) === opt ? 'bg-blue-100 text-blue-900 font-bold' : ''}`}>
                                                            <input
                                                                type="radio"
                                                                value={opt}
                                                                {...register(`nnas.${index}.afiliadoOtroSeguro` as const)}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setValue(`nnas.${index}.afiliadoOtroSeguro`, val);
                                                                    if (val === 'SI') {
                                                                        setValue(`nnas.${index}.afiliadoSIS`, 'NO');
                                                                    } else {
                                                                        setValue(`nnas.${index}.detalleOtroSeguro`, '');
                                                                    }
                                                                }}
                                                                className="mr-2"
                                                            />
                                                            <span className="text-xs font-bold">{opt.replace('_', ' ')}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                                {watch(`nnas.${index}.afiliadoOtroSeguro` as const) === 'SI' && (
                                                    <div className="p-4 bg-blue-50 animate-slideDown border-t space-y-4">
                                                        <SelectField
                                                            label="Seleccione el seguro de salud"
                                                            value={
                                                                SEGUROS_PREDEFINIDOS.includes(watch(`nnas.${index}.detalleOtroSeguro` as const) || '')
                                                                    ? watch(`nnas.${index}.detalleOtroSeguro` as const)
                                                                    : (watch(`nnas.${index}.detalleOtroSeguro` as const) ? 'OTRO' : '')
                                                            }
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val === 'OTRO') {
                                                                    setValue(`nnas.${index}.detalleOtroSeguro`, '');
                                                                } else {
                                                                    setValue(`nnas.${index}.detalleOtroSeguro`, val);
                                                                }
                                                            }}
                                                            options={[
                                                                { value: '', label: 'Seleccione un seguro...' },
                                                                ...SEGUROS_PREDEFINIDOS.map(s => ({ value: s, label: s })),
                                                                { value: 'OTRO', label: 'Otro (Especificar)' }
                                                            ]}
                                                        />

                                                        {(!SEGUROS_PREDEFINIDOS.includes(watch(`nnas.${index}.detalleOtroSeguro` as const) || '') || 
                                                         watch(`nnas.${index}.detalleOtroSeguro` as const) === '') && 
                                                         (watch(`nnas.${index}.detalleOtroSeguro` as const) !== undefined) && (
                                                            <div className="animate-slideDown">
                                                                <InputField
                                                                    label="Especifique el seguro de salud alternativo"
                                                                    register={register(`nnas.${index}.detalleOtroSeguro` as const)}
                                                                    placeholder="Ej: Mapfre, Seguro universitario particular..."
                                                                />
                                                            </div>
                                                        )}
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
                                                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
                                                            <SelectField label="¿Cuenta con Certificado CONADIS?" register={register(`nnas.${index}.certDiscapNna` as const)} options={parametros?.OPCIONES_CERT_DISCAP_APO_2026 || [
                                                                { value: '99', label: 'No aplica' },
                                                                { value: '1', label: 'Sí, tiene Certificado de Discapacidad' },
                                                                { value: '2', label: 'Sí, tiene, pero no lo porta' },
                                                                { value: '3', label: 'No, no cuenta con Certificado' },
                                                                { value: '4', label: 'En trámite' }
                                                            ]} />
                                                            <InputField label="Detalle de Discapacidad" register={register(`nnas.${index}.detalleDiscapacidad` as const)} placeholder="Especifique detalles adicionales..." />
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
                                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                                {(parametros?.OPCIONES_CONVIVENCIA_2026 || [
                                                    { value: '1', label: '1. Solo Padre' },
                                                    { value: '2', label: '2. Solo Madre' },
                                                    { value: '3', label: '3. Padre y madre' },
                                                    { value: '4', label: '4. Adulto responsable (familia extensa)' },
                                                    { value: '5', label: '5. Solo' },
                                                    { value: '6', label: '6. Otro' }
                                                ]).map((opt) => (
                                                    <label key={opt.value} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${String(watch('viveCon')) === String(opt.value) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                                                        <input type="radio" value={opt.value} {...register('viveCon')} className="text-blue-600" />
                                                        <span className="text-xs font-bold text-gray-700">{opt.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {(watch('viveCon') === '6' || watch('viveCon') === 'Otro') && (
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



                                          {/* Familiar / Adulto Responsable (SEC 2026) */}
                                          <div className="border border-purple-100 rounded-xl bg-purple-50/30 p-5 mt-6 group hover:border-purple-200 transition-all">
                                              <div className="flex justify-between items-center mb-4 pb-2 border-b border-purple-100/50">
                                                  <h4 className="text-sm font-black text-purple-900 uppercase flex items-center gap-2">
                                                      <Users size={16} className="text-purple-700" /> Familiar / Adulto Responsable (SEC 2026)
                                                  </h4>
                                                  
                                                  <button
                                                      type="button"
                                                      onClick={() => {
                                                          setFamiliarModalData({
                                                              priApeTutApo: '',
                                                              segApeTutApo: '',
                                                              nomApeTutApo: '',
                                                              nombres: '',
                                                              parentesco: 'Madre',
                                                              dni: '',
                                                              telefono: '',
                                                              ocupacion: '',
                                                              tipoDoc: '1',
                                                              viveCon: 'SI',
                                                              sexoApo: '2',
                                                              fechaNacApo: '',
                                                              nacionalidadApo: 'PERUANA',
                                                              tipDocTutApo: '1',
                                                              nroDocTutApo: '',
                                                              vinTutUsu: '1',
                                                              lenMatApo: '10',
                                                              lenMatEspApo: '',
                                                              autIdeEtApo: '7',
                                                              autIdeEtEspApo: '',
                                                              tipoDiscapApo: '6',
                                                              certDiscapApo: '99',
                                                              esTutorPrincipal: 'false'
                                                          });
                                                          setEditingFamiliarIndex(null);
                                                          setShowTutorModal(true);
                                                      }}
                                                      className="px-3.5 py-1.5 bg-purple-700 text-white rounded-lg text-xs font-bold hover:bg-purple-800 transition-all flex items-center gap-1 shadow-md shadow-purple-200"
                                                  >
                                                      <Plus size={13} /> Agregar Familiar Responsable
                                                  </button>
                                              </div>

                                              {familiaresFields.length > 0 ? (
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                      {familiaresFields.map((field, idx) => {
                                                          const isTutor = field.esTutorPrincipal === 'true' || field.esTutorPrincipal === true;
                                                          return (
                                                              <div key={field.id} className={clsx(
                                                                  "bg-white p-4 rounded-xl border shadow-sm animate-fadeIn flex flex-col justify-between transition-all hover:shadow-md",
                                                                  isTutor ? "border-purple-300 ring-1 ring-purple-300 bg-purple-50/5" : "border-gray-200"
                                                              )}>
                                                                  <div>
                                                                      <div className="flex justify-between items-start">
                                                                          <span className="text-[10px] font-black text-purple-600 uppercase bg-purple-50 px-2 py-0.5 rounded">
                                                                              {field.parentesco || field.vinTutUsu || 'Familiar'}
                                                                          </span>
                                                                          {isTutor && (
                                                                              <span className="px-2.5 py-0.5 bg-purple-600 text-white text-[9px] font-black rounded-full uppercase tracking-wider">
                                                                                  Tutor Principal
                                                                              </span>
                                                                          )}
                                                                      </div>
                                                                      <div className="text-sm font-black text-gray-800 mt-2">
                                                                          {field.nombres}
                                                                      </div>
                                                                      <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-50 text-xs">
                                                                          <div>
                                                                              <span className="text-gray-400 font-bold text-[9px] uppercase block">DNI / Documento</span>
                                                                              <span className="font-bold text-gray-700">{field.dni || field.nroDocTutApo || 'Sin Documento'}</span>
                                                                          </div>
                                                                          <div>
                                                                              <span className="text-gray-400 font-bold text-[9px] uppercase block">Teléfono</span>
                                                                              <span className="font-bold text-gray-700">{field.telefono || 'No registra'}</span>
                                                                          </div>
                                                                          <div>
                                                                              <span className="text-gray-400 font-bold text-[9px] uppercase block">Vive con NNA</span>
                                                                              <span className="font-bold text-gray-700">{field.viveCon || 'NO'}</span>
                                                                          </div>
                                                                          <div>
                                                                              <span className="text-gray-400 font-bold text-[9px] uppercase block">Ocupación</span>
                                                                              <span className="font-bold text-gray-700">{field.ocupacion || 'No registra'}</span>
                                                                          </div>
                                                                      </div>
                                                                  </div>
                                                                  <div className="flex gap-2 justify-end mt-4 pt-2 border-t border-gray-100">
                                                                      <button
                                                                          type="button"
                                                                          onClick={() => {
                                                                              setFamiliarModalData({
                                                                                  ...field,
                                                                                  esTutorPrincipal: field.esTutorPrincipal === 'true' || field.esTutorPrincipal === true ? 'true' : 'false'
                                                                              });
                                                                              setEditingFamiliarIndex(idx);
                                                                              setShowTutorModal(true);
                                                                          }}
                                                                          className="px-2.5 py-1 hover:bg-purple-100 rounded text-purple-700 text-xs font-bold flex items-center gap-1 transition-all"
                                                                      >
                                                                          <Edit2 size={12} /> Editar
                                                                      </button>
                                                                      <button
                                                                          type="button"
                                                                          onClick={() => {
                                                                              const updated = [...(watch('familiares') || [])].filter((_, i) => i !== idx);
                                                                              setValue('familiares', updated);
                                                                              replaceFamiliares(updated);
                                                                              // Si el familiar eliminado era el tutor principal, limpiamos los datos raíz del formulario
                                                                              if (isTutor) {
                                                                                  setValue('tieneTutorApo', 'false');
                                                                                  setValue('priApeTutApo', '');
                                                                                  setValue('segApeTutApo', '');
                                                                                  setValue('nomApeTutApo', '');
                                                                                  setValue('sexoApo', '');
                                                                                  setValue('fechaNacApo', '');
                                                                                  setValue('nacionalidadApo', 'PERUANA');
                                                                                  setValue('tipDocTutApo', '1');
                                                                                  setValue('nroDocTutApo', '');
                                                                                  setValue('vinTutUsu', '');
                                                                                  setValue('lenMatApo', '10');
                                                                                  setValue('lenMatEspApo', '');
                                                                                  setValue('autIdeEtApo', '7');
                                                                                  setValue('autIdeEtEspApo', '');
                                                                                  setValue('tipoDiscapApo', '');
                                                                                  setValue('certDiscapApo', '99');
                                                                                  setValue('nombreTutor', '');
                                                                              }
                                                                          }}
                                                                          className="px-2.5 py-1 hover:bg-red-50 rounded text-red-600 text-xs font-bold flex items-center gap-1 transition-all"
                                                                      >
                                                                          <Trash2 size={12} /> Eliminar
                                                                      </button>
                                                                  </div>
                                                              </div>
                                                          );
                                                      })}
                                                  </div>
                                              ) : (
                                                  <div className="flex flex-col items-center justify-center p-8 bg-white border border-dashed border-purple-200 rounded-xl text-center">
                                                      <Users size={32} className="text-purple-300 mb-2" />
                                                      <div className="text-xs font-bold text-gray-700">Sin familiares o adultos responsables registrados</div>
                                                      <div className="text-[10px] text-gray-500 mt-0.5 max-w-xs">Agregue uno o más familiares presionando el botón superior.</div>
                                                  </div>
                                              )}
                                          </div>

                                        <div className="space-y-3">
                                            <div className="text-sm font-bold text-gray-800">¿Tiene antecedente de albergue?</div>
                                            <div className="flex gap-3">
                                                {[true, false].map((val) => (
                                                    <label key={String(val)} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${watch('nnas.0.tieneAntecedenteAlbergue') === val ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                                                        <input
                                                            type="radio"
                                                            value={String(val)}
                                                            onChange={() => fields.forEach((_, i) => setValue(`nnas.${i}.tieneAntecedenteAlbergue`, val))}
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

            {/* MODAL DETALLES DEL TUTOR / APODERADO */}
            {showTutorModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-4xl w-full max-h-[90vh] flex flex-col animate-scaleUp">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-purple-50 rounded-t-2xl">
                            <div>
                                <h3 className="text-lg font-black text-purple-900 flex items-center gap-2">
                                    <Users size={22} className="text-purple-700" /> {editingFamiliarIndex !== null ? 'Editar Familiar' : 'Registrar Familiar Responsable'} (SEC 2026)
                                </h3>
                                <p className="text-xs text-purple-700 font-medium">Complete todos los datos oficiales del familiar responsable del NNA.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowTutorModal(false);
                                    setEditingFamiliarIndex(null);
                                }}
                                className="p-2 hover:bg-purple-100 rounded-full transition-all text-purple-900"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <InputField
                                    label="Primer Apellido"
                                    value={familiarModalData.priApeTutApo || ''}
                                    onChange={(e) => setFamiliarModalData({ ...familiarModalData, priApeTutApo: e.target.value })}
                                    placeholder="Primer Apellido"
                                />
                                <InputField
                                    label="Segundo Apellido"
                                    value={familiarModalData.segApeTutApo || ''}
                                    onChange={(e) => setFamiliarModalData({ ...familiarModalData, segApeTutApo: e.target.value })}
                                    placeholder="Segundo Apellido"
                                />
                                <InputField
                                    label="Nombres"
                                    value={familiarModalData.nomApeTutApo || familiarModalData.nombres || ''}
                                    onChange={(e) => setFamiliarModalData({ ...familiarModalData, nomApeTutApo: e.target.value, nombres: e.target.value })}
                                    placeholder="Nombres del Familiar"
                                    required
                                />

                                <SelectField
                                    label="Sexo"
                                    value={familiarModalData.sexoApo || ''}
                                    onChange={(e) => setFamiliarModalData({ ...familiarModalData, sexoApo: e.target.value })}
                                    options={parametros?.OPCIONES_SEXO_2026 || [
                                        { value: '1', label: '1: Masculino' },
                                        { value: '2', label: '2: Femenino' }
                                    ]}
                                />
                                <InputField
                                    type="date"
                                    label="Fecha Nacimiento"
                                    value={familiarModalData.fechaNacApo || ''}
                                    onChange={(e) => setFamiliarModalData({ ...familiarModalData, fechaNacApo: e.target.value })}
                                />
                                <InputField
                                    label="Nacionalidad"
                                    value={familiarModalData.nacionalidadApo || ''}
                                    onChange={(e) => setFamiliarModalData({ ...familiarModalData, nacionalidadApo: e.target.value })}
                                    placeholder="PERUANA"
                                />

                                <SelectField
                                    label="Tipo Documento"
                                    value={familiarModalData.tipDocTutApo || ''}
                                    onChange={(e) => setFamiliarModalData({ ...familiarModalData, tipDocTutApo: e.target.value })}
                                    options={parametros?.OPCIONES_TIP_DOC_APO_2026 || [
                                        { value: '1', label: '1: DNI' },
                                        { value: '2', label: '2: Carné de extranjería' },
                                        { value: '3', label: '3: Pasaporte' },
                                        { value: '7', label: '7: No tiene' }
                                    ]}
                                />
                                <InputField
                                    label="Nº de Documento"
                                    value={familiarModalData.nroDocTutApo || familiarModalData.dni || ''}
                                    onChange={(e) => setFamiliarModalData({ ...familiarModalData, nroDocTutApo: e.target.value, dni: e.target.value })}
                                    placeholder="Número de Documento"
                                />
                                <SelectField
                                    label="Vínculo con el NNA"
                                    value={familiarModalData.vinTutUsu || familiarModalData.parentesco || ''}
                                    onChange={(e) => setFamiliarModalData({ ...familiarModalData, vinTutUsu: e.target.value, parentesco: e.target.value })}
                                    options={parametros?.OPCIONES_VINCULO_TUTOR_2026 || [
                                        { value: '1', label: '1: Padre o madre' },
                                        { value: '2', label: '2: Tio/a' },
                                        { value: '3', label: '3: Abuelo/a' },
                                        { value: '4', label: '4: Hermano/a' },
                                        { value: '5', label: '5: Otro familiar (ej. cuñado/a)' },
                                        { value: '6', label: '6: Otro no familiar (no pariente)' }
                                    ]}
                                />

                                <InputField
                                    label="Teléfono de Contacto"
                                    value={familiarModalData.telefono || ''}
                                    onChange={(e) => setFamiliarModalData({ ...familiarModalData, telefono: e.target.value })}
                                    placeholder="Ej. 999888777"
                                />
                                <InputField
                                    label="Ocupación"
                                    value={familiarModalData.ocupacion || ''}
                                    onChange={(e) => setFamiliarModalData({ ...familiarModalData, ocupacion: e.target.value })}
                                    placeholder="Ej. Independiente, Comerciante..."
                                />
                                <SelectField
                                    label="¿Vive con el NNA?"
                                    value={familiarModalData.viveCon || 'NO'}
                                    onChange={(e) => setFamiliarModalData({ ...familiarModalData, viveCon: e.target.value })}
                                    options={[
                                        { value: 'SI', label: 'Sí' },
                                        { value: 'NO', label: 'No' }
                                    ]}
                                />

                                <SelectField
                                    label="Lengua Materna"
                                    value={familiarModalData.lenMatApo || ''}
                                    onChange={(e) => setFamiliarModalData({ ...familiarModalData, lenMatApo: e.target.value })}
                                    options={parametros?.OPCIONES_LENGUA_APO_2026 || [
                                        { value: '10', label: '10: Castellano' },
                                        { value: '1', label: '1: Quechua' },
                                        { value: '2', label: '2: Aimara' },
                                        { value: '3', label: '3: Asháninka' },
                                        { value: '4', label: '4: Awajún/Aguaruna' },
                                        { value: '5', label: '5: Shipibo-Conibo' },
                                        { value: '6', label: '6: Shawi/ Chayahuita' },
                                        { value: '7', label: '7: Matsigenka/ Machiguenga' },
                                        { value: '8', label: '8: Achuar' },
                                        { value: '9', label: '9: Otra lengua indígena u originaria' },
                                        { value: '11', label: '11: Portugués' },
                                        { value: '12', label: '12: Otra lengua extranjera' },
                                        { value: '13', label: '13: Lengua de señas peruana' },
                                        { value: '14', label: '14: No escucha ni habla' },
                                        { value: '16', label: '16: No responde / No sabe' },
                                        { value: '99', label: '99: No aplica' }
                                    ]}
                                />
                                {['9', '12', 'OTRO'].includes(familiarModalData.lenMatApo || '') && (
                                    <InputField
                                        label="Especificar Lengua"
                                        value={familiarModalData.lenMatEspApo || ''}
                                        onChange={(e) => setFamiliarModalData({ ...familiarModalData, lenMatEspApo: e.target.value })}
                                        placeholder="Escriba la lengua..."
                                    />
                                )}
                                
                                <SelectField
                                    label="Autoidentificación Étnica"
                                    value={familiarModalData.autIdeEtApo || ''}
                                    onChange={(e) => setFamiliarModalData({ ...familiarModalData, autIdeEtApo: e.target.value })}
                                    options={parametros?.OPCIONES_ETNIA_APO_2026 || [
                                        { value: '7', label: '7: Mestizo' },
                                        { value: '1', label: '1: Quechua' },
                                        { value: '2', label: '2: Aimara' },
                                        { value: '3', label: '3: Indígena u originario de la Amazonía' },
                                        { value: '4', label: '4: Perteneciente o parte de otro pueblo indígena' },
                                        { value: '5', label: '5: Negro, moreno, zambo, mulato o afrodescendiente' },
                                        { value: '6', label: '6: Blanco' },
                                        { value: '8', label: '8: Otro' }
                                    ]}
                                />
                                {['8', 'OTRO'].includes(familiarModalData.autIdeEtApo || '') && (
                                    <InputField
                                        label="Especificar Etnia"
                                        value={familiarModalData.autIdeEtEspApo || ''}
                                        onChange={(e) => setFamiliarModalData({ ...familiarModalData, autIdeEtEspApo: e.target.value })}
                                        placeholder="Escriba la etnia..."
                                    />
                                )}

                                <SelectField
                                    label="Tipo de Discapacidad"
                                    value={familiarModalData.tipoDiscapApo || '6'}
                                    onChange={(e) => setFamiliarModalData({ ...familiarModalData, tipoDiscapApo: e.target.value })}
                                    options={parametros?.OPCIONES_DISCAPACIDAD_APO_2026 || [
                                        { value: '6', label: 'Ninguna' },
                                        { value: '1', label: 'Motriz o física' },
                                        { value: '2', label: 'Sensorial' },
                                        { value: '3', label: 'Cognitivo-intelectual' },
                                        { value: '4', label: 'Psicosocial o psíquica' },
                                        { value: '5', label: 'Más de una discapacidad' }
                                    ]}
                                />
                                <SelectField
                                    label="¿Certificado CONADIS?"
                                    value={familiarModalData.certDiscapApo || '99'}
                                    onChange={(e) => setFamiliarModalData({ ...familiarModalData, certDiscapApo: e.target.value })}
                                    options={parametros?.OPCIONES_CERT_DISCAP_APO_2026 || [
                                        { value: '99', label: 'No aplica' },
                                        { value: '1', label: 'Sí, tiene Certificado de Discapacidad' },
                                        { value: '2', label: 'Sí, tiene, pero no lo porta' },
                                        { value: '3', label: 'No, no cuenta con Certificado' },
                                        { value: '4', label: 'En trámite' }
                                    ]}
                                />

                                <div className="md:col-span-3 bg-purple-50/50 p-4 rounded-xl border border-purple-100 flex items-center justify-between mt-2">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-purple-900">¿Es el Tutor / Apoderado Principal del NNA?</span>
                                        <span className="text-[10px] text-purple-700 font-medium">Solo un familiar puede ser el tutor principal para efectos de la ficha F03.</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={familiarModalData.esTutorPrincipal === 'true' || familiarModalData.esTutorPrincipal === true}
                                            onChange={(e) => setFamiliarModalData({ ...familiarModalData, esTutorPrincipal: e.target.checked ? 'true' : 'false' })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-700"></div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowTutorModal(false);
                                    setEditingFamiliarIndex(null);
                                }}
                                className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-100 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!familiarModalData.nomApeTutApo && !familiarModalData.nombres) {
                                        alert('Por favor ingrese al menos el nombre del familiar.');
                                        return;
                                    }

                                    const pri = familiarModalData.priApeTutApo || '';
                                    const seg = familiarModalData.segApeTutApo || '';
                                    const nom = familiarModalData.nomApeTutApo || familiarModalData.nombres || '';
                                    const fullName = `${pri} ${seg} ${nom}`.trim().replace(/\s+/g, ' ');

                                    const finalFamiliar: FamiliarFormDataItem = {
                                        ...familiarModalData,
                                        nombres: fullName,
                                        dni: familiarModalData.nroDocTutApo || familiarModalData.dni || '',
                                        parentesco: familiarModalData.vinTutUsu || familiarModalData.parentesco || 'Otro',
                                        viveCon: familiarModalData.viveCon || 'NO',
                                    };

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
                                }}
                                className="px-5 py-2 bg-purple-700 text-white text-xs font-bold rounded-lg hover:bg-purple-800 transition-all flex items-center gap-1.5 shadow-md shadow-purple-200"
                            >
                                <Zap size={14} /> Guardar y Aplicar
                            </button>
                        </div>
                    </div>
                </div>
            )}

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