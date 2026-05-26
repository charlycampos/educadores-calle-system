import { useState, useEffect } from 'react';
import { Save, Printer, CheckCircle, AlertCircle, Circle, Target, Calendar } from 'lucide-react';

interface Formato5LogrosProps {
    nna: any;
    onClose?: () => void;
}

const ITEMS_FASE_1 = [
    { id: 1, texto: "El/la NNA se integra y colabora con otras/os NNA." },
    { id: 2, texto: "El/la NNA participa regularmente de las actividades del servicio de educadores de calle." },
    { id: 3, texto: "El adulto responsable muestra interés en cubrir necesidades básicas urgentes (identidad, salud y educación) de los NNA, lo cual ha permitido iniciar el proceso de restitución de derechos." },
    { id: 4, texto: "El/la NNA y adulto responsable muestran interés en cubrir sus necesidades básicas urgentes (identidad, salud y educación), lo cual ha permitido iniciar el proceso de restitución de sus derechos." },
    { id: 5, texto: "Muestra interés en acercarse a la comunidad a través de las/os actores sociales más próximos (y acorde a sus necesidades)." }
];

const ITEMS_FASE_2 = [
    { id: 1, texto: "El NNA tiene cubierto y ejerce su derecho a la educación" },
    { id: 2, texto: "El NNA tiene cubierto y ejerce su derecho a la salud" },
    { id: 3, texto: "El NNA tiene cubierto y ejerce su derecho a la identidad" },
    { id: 4, texto: "El NNA tiene cubierto y ejerce su derecho a la alimentación" },
    { id: 5, texto: "El/la NNA deja o reduce la situación de calle según perfil" },
    { id: 6, texto: "El adulto responsable no ejerce violencia física ni psicológica en sus pautas de crianza" },
    { id: 7, texto: "Aumentaron (respecto a su medición inicial) su participación en actividades vinculadas a su desarrollo integral: deportivas, recreativas, culturales, productivas u otras que demuestren un adecuado uso de su tiempo libre." },
    { id: 8, texto: "Acceso a servicios especializados según las necesidades de cada caso en concreto (salud mental, adicciones, acceso a la justicia, entre otros)." },
    { id: 9, texto: "El/la NNA incorpora conductas de autocuidado personal, aseo, higiene y presentación de su aspecto físico general según perfil. (respecto a la medición inicial)." },
    { id: 10, texto: "El/la NNA y su familia construye un proyecto o plan de vida con objetivos y metas a corto, mediano y largo plazo por áreas de desarrollo (personal, familiar, educativo y comunitario)." }
];

const ITEMS_FASE_3 = [
    { id: 1, texto: "Niñas, niños y adolescentes dejan la situación de calle ejerciendo permanentemente sus derechos (identidad, salud, alimentación, educación, recreación, entre otros)." },
    { id: 2, texto: "Las niñas, niños y adolescentes desarrollan capacidades de autoprotección y habilidades para la vida." },
    { id: 3, texto: "Las niñas, niños y adolescentes hacen uso de programas y servicios que restituyen el ejercicio de sus derechos." },
    { id: 4, texto: "Persona adulta responsable presenta capacidades para garantizar la protección integral de las niñas, niños y adolescentes usuarias/os del PNY." },
    { id: 5, texto: "Las/os NNA y sus familias presentan y desarrollan sus proyectos de vida con el cumplimiento de algunas de sus metas según su temporalidad." }
];

export const Formato5Logros = ({ nna, onClose }: Formato5LogrosProps) => {
    const [activeFase, setActiveFase] = useState<1 | 2 | 3>(1);

    const [logros, setLogros] = useState<{ [key: string]: 'SI' | 'NO' | 'PROCESO' | null }>({});
    const [observaciones, setObservaciones] = useState<{ [key: number]: string }>({ 1: '', 2: '', 3: '' });
    const [fechas, setFechas] = useState<{ [key: number]: string }>({ 1: '', 2: '', 3: '' });

    const handleLogroChange = (fase: number, itemId: number, valor: 'SI' | 'NO' | 'PROCESO') => {
        setLogros(prev => ({
            ...prev,
            [`f${fase}_${itemId}`]: valor
        }));
    };

    const getItems = (fase: number) => {
        if (fase === 1) return ITEMS_FASE_1;
        if (fase === 2) return ITEMS_FASE_2;
        return ITEMS_FASE_3;
    };

    const StatusButton = ({ fase, itemId, value, label, colorClass }: any) => {
        const currentVal = logros[`f${fase}_${itemId}`];
        const isSelected = currentVal === value;

        return (
            <button
                onClick={() => handleLogroChange(fase, itemId, value)}
                className={`
                    px-3 py-1.5 rounded-lg text-xs font-bold transition-all border
                    ${isSelected
                        ? `${colorClass} ring-2 ring-offset-1 ring-opacity-60`
                        : 'bg-surface text-fg-muted border-border hover:bg-surface-muted'}
                `}
            >
                {label}
            </button>
        );
    };

    return (
        <div className="bg-bg min-h-screen p-6">
            <div className="max-w-5xl mx-auto bg-surface rounded-[8px] shadow-lg overflow-hidden border border-border">
                {/* Header */}
                <div className="bg-primary px-6 py-5 text-primary-fg">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-xl font-bold uppercase tracking-wide">Ficha de Proceso de Logros</h1>
                            <p className="text-primary-fg/60 text-xs mt-1 font-medium">Servicio de Educadores de Calle - INABIF (Formato 5)</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold">{nna?.nombres} {nna?.apellidoPaterno}</p>
                            <p className="text-xs text-primary-fg/50">DNI: {nna?.numeroDoc || '---'}</p>
                        </div>
                    </div>
                </div>

                {/* Tabs de Fases */}
                <div className="flex border-b border-border bg-surface-muted">
                    <button
                        onClick={() => setActiveFase(1)}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors relative
                            ${activeFase === 1 ? 'text-warning bg-surface' : 'text-fg-muted hover:text-fg-2 hover:bg-border/30'}
                        `}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Target size={18} />
                            Fase I (Inicial)
                        </div>
                        {activeFase === 1 && <div className="absolute bottom-0 left-0 right-0 h-1 bg-warning" />}
                    </button>
                    <button
                        onClick={() => setActiveFase(2)}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors relative
                            ${activeFase === 2 ? 'text-primary bg-surface' : 'text-fg-muted hover:text-fg-2 hover:bg-border/30'}
                        `}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Target size={18} />
                            Fase II (Proceso)
                        </div>
                        {activeFase === 2 && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary" />}
                    </button>
                    <button
                        onClick={() => setActiveFase(3)}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors relative
                            ${activeFase === 3 ? 'text-success bg-surface' : 'text-fg-muted hover:text-fg-2 hover:bg-border/30'}
                        `}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Target size={18} />
                            Fase III (Logro)
                        </div>
                        {activeFase === 3 && <div className="absolute bottom-0 left-0 right-0 h-1 bg-success" />}
                    </button>
                </div>

                {/* Contenido */}
                <div className="p-8">
                    {/* Toolbar de Fecha */}
                    <div className="flex items-center gap-4 mb-6 bg-primary-soft/10 p-4 rounded-[6px] border border-primary/20">
                        <Calendar className="text-primary" size={20} />
                        <div>
                            <label className="block text-xs font-bold text-primary uppercase mb-1">Fecha de Aplicación (Fase {activeFase})</label>
                            <input
                                type="date"
                                value={fechas[activeFase]}
                                onChange={(e) => setFechas({ ...fechas, [activeFase]: e.target.value })}
                                className="px-3 py-1.5 border border-primary/30 rounded text-sm text-primary bg-surface focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-[8px] border border-border shadow-sm">
                        <table className="w-full">
                            <thead className="bg-surface-muted text-xs text-fg-muted uppercase font-bold border-b border-border">
                                <tr>
                                    <th className="px-6 py-4 w-12 text-center">N°</th>
                                    <th className="px-6 py-4 text-left">Indicador de Logro</th>
                                    <th className="px-6 py-4 w-64 text-center">Estado del Logro</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {getItems(activeFase).map((item) => (
                                    <tr key={item.id} className="hover:bg-surface-muted transition-colors">
                                        <td className="px-6 py-4 text-center font-bold text-fg-muted text-sm">
                                            {item.id}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-fg-2 font-medium leading-relaxed">{item.texto}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <StatusButton
                                                    fase={activeFase}
                                                    itemId={item.id}
                                                    value="SI"
                                                    label="SÍ"
                                                    colorClass="bg-success-soft text-success border-success/30 ring-success/40"
                                                />
                                                <StatusButton
                                                    fase={activeFase}
                                                    itemId={item.id}
                                                    value="NO"
                                                    label="NO"
                                                    colorClass="bg-danger-soft text-danger border-danger/30 ring-danger/40"
                                                />
                                                <StatusButton
                                                    fase={activeFase}
                                                    itemId={item.id}
                                                    value="PROCESO"
                                                    label="EN PROCESO"
                                                    colorClass="bg-warning-soft text-warning border-warning/30 ring-warning/40"
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Observaciones */}
                    <div className="mt-8">
                        <label className="block text-sm font-bold text-fg-2 mb-2 uppercase flex items-center gap-2">
                            <AlertCircle size={16} />
                            Observaciones de la Fase {activeFase}
                        </label>
                        <textarea
                            value={observaciones[activeFase]}
                            onChange={(e) => setObservaciones({ ...observaciones, [activeFase]: e.target.value })}
                            className="w-full h-32 px-4 py-3 border border-border rounded-[8px] focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none text-sm"
                            placeholder="Ingrese observaciones relevantes, dificultades encontradas o logros específicos..."
                        ></textarea>
                    </div>

                    {/* Actores Responsables (Firma simulada) */}
                    <div className="mt-8 pt-8 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <p className="text-xs font-bold text-fg-muted uppercase mb-4 text-center">Educador/a Responsable</p>
                            <div className="h-6 border-b border-border"></div>
                            <p className="text-center text-xs text-fg-muted mt-2">Firma y Sello</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-fg-muted uppercase mb-4 text-center">Coordinador/a del Servicio</p>
                            <div className="h-6 border-b border-border"></div>
                            <p className="text-center text-xs text-fg-muted mt-2">Firma y Sello</p>
                        </div>
                    </div>
                </div>

                {/* Actions Footer */}
                <div className="bg-surface-muted px-8 py-4 border-t border-border flex justify-end gap-4">
                    <button className="flex items-center gap-2 text-fg-2 font-bold hover:text-fg px-4 py-2 hover:bg-border/30 rounded-[6px] transition-colors">
                        <Printer size={18} />
                        Imprimir Formato
                    </button>
                    <button
                        className="flex items-center gap-2 bg-primary text-primary-fg font-bold px-6 py-2 rounded-[6px] shadow-lg hover:shadow-xl hover:bg-primary/90 transition-all transform hover:-translate-y-0.5"
                        onClick={() => {
                            console.log({ logros, observaciones, fechas });
                            alert('Progreso guardado temporalmente (Local State)');
                        }}
                    >
                        <Save size={18} />
                        Guardar Avance
                    </button>
                </div>
            </div>
        </div>
    );
};
