import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
    ArrowUp, ArrowDown, Minus,
    Users, UserPlus, GraduationCap, Home, CheckCircle2, LogOut,
} from 'lucide-react';
import { getResumenPeriodo, type ResumenPeriodoData } from '../../api/estadisticas.api';

/**
 * Tarjetas de cantidades del periodo.
 *
 * Solo muestran FLUJO: lo que ocurrió dentro del periodo elegido. El reparto
 * de casos activos por fase —que es una foto de hoy y no responde al filtro—
 * vive en el bloque "Mis casos por fase" del tablero, para no repetir el mismo
 * dato en dos sitios ni sugerir que se puede filtrar por mes.
 */

const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const hoy = new Date();

/** Comparación con el periodo anterior. Sin dato previo no inventa nada. */
const Variacion = ({ actual, previo, etiqueta }: { actual: number; previo?: number; etiqueta: string }) => {
    if (previo === undefined || previo === null) return null;
    const delta = actual - previo;
    if (delta === 0) {
        return (
            <p className="text-[11px] text-fg-muted mt-1 flex items-center gap-1">
                <Minus size={11} /> igual que {etiqueta}
            </p>
        );
    }
    const sube = delta > 0;
    return (
        <p className={`text-[11px] mt-1 flex items-center gap-1 ${sube ? 'text-success' : 'text-warning'}`}>
            {sube ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
            {Math.abs(delta)} vs. {etiqueta}
        </p>
    );
};

/**
 * Misma piel que las tarjetas de acciones rápidas del tablero —fondo de
 * superficie, borde de un pelo, esquinas de 8— para que el bloque no parezca
 * pegado de otro sistema.
 */
const Tarjeta = ({
    label, valor, icono: Icono, children,
}: {
    label: string; valor: number; icono: LucideIcon; children?: React.ReactNode;
}) => (
    <div className="bg-surface border border-border rounded-lg px-4 py-3.5">
        <div className="flex items-start justify-between gap-2">
            <p className="text-[12px] text-fg-secondary leading-tight">{label}</p>
            <Icono size={16} className="text-fg-muted flex-shrink-0" />
        </div>
        <p className="text-[26px] font-semibold text-fg leading-none mt-2 tabular-nums">{valor}</p>
        {children}
    </div>
);

export const ResumenPeriodo = () => {
    const [anio, setAnio] = useState(hoy.getFullYear());
    // 0 = todo el año. El mes en curso es el arranque natural del educador.
    const [mes, setMes] = useState<number>(hoy.getMonth() + 1);
    const [data, setData] = useState<ResumenPeriodoData | null>(null);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        setCargando(true);
        getResumenPeriodo(anio, mes || undefined)
            .then(setData)
            .catch(() => setData(null))
            .finally(() => setCargando(false));
    }, [anio, mes]);

    // Nombre del periodo anterior, para que la comparación se lea sola.
    const etiquetaPrevio = mes
        ? MESES[(mes + 10) % 12].toLowerCase()
        : `${anio - 1}`;

    const anios = Array.from({ length: 4 }, (_, i) => hoy.getFullYear() - i);
    const f = data?.flujo;

    return (
        <div className="mb-6">
            <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className="text-[12px] text-fg-secondary">Periodo</span>
                <select
                    value={anio}
                    onChange={e => setAnio(Number(e.target.value))}
                    className="bg-surface border border-border rounded-md px-2.5 py-1 text-[13px] text-fg focus:outline-none focus:border-primary cursor-pointer"
                >
                    {anios.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <select
                    value={mes}
                    onChange={e => setMes(Number(e.target.value))}
                    className="bg-surface border border-border rounded-md px-2.5 py-1 text-[13px] text-fg focus:outline-none focus:border-primary cursor-pointer"
                >
                    <option value={0}>Todo el año</option>
                    {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <button
                    type="button"
                    onClick={() => { setAnio(hoy.getFullYear()); setMes(hoy.getMonth() + 1); }}
                    className="text-[12px] px-2.5 py-1 rounded-md border border-border text-fg-secondary hover:bg-surface-muted transition-colors"
                >
                    Este mes
                </button>
            </div>

            {cargando ? (
                <div className="bg-surface-muted/50 rounded-lg p-6 text-center text-[13px] text-fg-muted">
                    Cargando el resumen…
                </div>
            ) : !f ? (
                <div className="bg-surface-muted/50 rounded-lg p-6 text-center text-[13px] text-fg-muted">
                    No se pudo cargar el resumen del periodo.
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <Tarjeta label="Atendidos" valor={f.atendidos} icono={Users}>
                        <Variacion actual={f.atendidos} previo={f.atendidosPrev} etiqueta={etiquetaPrevio} />
                    </Tarjeta>

                    <Tarjeta label="Nuevos ingresos" valor={f.ingresos} icono={UserPlus}>
                        <p className="text-[11px] text-fg-muted mt-1">Fichas F03</p>
                    </Tarjeta>

                    <Tarjeta label="Talleres" valor={f.talleres} icono={GraduationCap}>
                        <p className="text-[11px] text-fg-muted mt-1">
                            {f.participaciones} participaciones
                        </p>
                    </Tarjeta>

                    <Tarjeta label="Visitas familiares" valor={f.visitas} icono={Home}>
                        <p className="text-[11px] text-fg-muted mt-1">Seguimientos F12</p>
                    </Tarjeta>

                    <Tarjeta label="Fases cerradas" valor={f.fasesCerradas} icono={CheckCircle2}>
                        <p className="text-[11px] text-fg-muted mt-1">Registradas en el F05</p>
                    </Tarjeta>

                    {/* Sin comparación a propósito: con números de un dígito,
                        un "+100%" es ruido y no señal. */}
                    <Tarjeta label="Egresos" valor={f.egresos} icono={LogOut}>
                        <p className="text-[11px] text-fg-muted mt-1">Fichas F13</p>
                    </Tarjeta>
                </div>
            )}
        </div>
    );
};
