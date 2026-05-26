import json
import re

file_path = 'D:/Usuarios/ccampos/Documents/Python Scripts/Educadores_calle/educadores-calle-system/client/src/features/nna/NnaCreatePage.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# I need to find the onSubmit block
on_submit_match = re.search(r'const onSubmit = async \(data: NnaFormData\) => {.*?try {.*?const payloadToSave = {(.*?)};', content, flags=re.DOTALL)

if not on_submit_match:
    print("Could not find onSubmit block")
    exit(1)

replacement = '''
    const onSubmit = async (data: NnaFormData) => {
        setSubmitting(true);
        try {
            // Generar datos_f03 legacy
            const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
            const DIAS_MAPPED: any = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo' };
            
            let totalSemanal = 0;
            const calcularHorasDia = (inicio: string, fin: string) => {
                if (!inicio || !fin) return 0;
                const [h1, m1] = inicio.split(':').map(Number);
                const [h2, m2] = fin.split(':').map(Number);
                let diff = (h2 + m2 / 60) - (h1 + m1 / 60);
                if (diff < 0) diff += 24;
                return diff;
            };

            const legacyActividadesPerfil = data.actividadesCalle.map(act => {
                const jornada = [];
                if (act.agenda) {
                    DIAS.forEach(d => {
                        const diaAgenda = act.agenda[d as keyof typeof act.agenda];
                        if (diaAgenda?.activo) {
                            jornada.push({
                                dia: DIAS_MAPPED[d],
                                inicio: diaAgenda.turno1Inicio,
                                fin: diaAgenda.turno1Fin,
                                inicio2: diaAgenda.turno2Inicio,
                                fin2: diaAgenda.turno2Fin,
                                tieneTurno2: !!(diaAgenda.turno2Inicio && diaAgenda.turno2Fin)
                            });
                            totalSemanal += calcularHorasDia(diaAgenda.turno1Inicio, diaAgenda.turno1Fin);
                            if (diaAgenda.turno2Inicio && diaAgenda.turno2Fin) {
                                totalSemanal += calcularHorasDia(diaAgenda.turno2Inicio, diaAgenda.turno2Fin);
                            }
                        }
                    });
                }
                return {
                    actividad: act.actividad === 'Otro (especificar)' ? act.actividadEspecifique : act.actividad,
                    tiempoValor: act.tiempoValor,
                    tiempoUnidad: act.tiempoUnidad,
                    tiempoDetalle: act.tiempoUnidad === 'Detalle' ? act.tiempoValor : ${act.tiempoValor} ,
                    jornada,
                    condicion: act.acompanamiento
                };
            });

            // Jornada consolidada para compatibility
            const jornadaSemanalConsolidada: any = {};
            DIAS.forEach(d => {
                const dayMapped = DIAS_MAPPED[d];
                const activeJornada = legacyActividadesPerfil.flatMap(la => la.jornada).find(j => j.dia === dayMapped);
                if (activeJornada) {
                    jornadaSemanalConsolidada[dayMapped] = {
                        activo: true,
                        inicio: activeJornada.inicio || '08:00',
                        fin: activeJornada.fin || '12:00',
                        inicio2: activeJornada.inicio2 || '',
                        fin2: activeJornada.fin2 || '',
                        tieneTurno2: activeJornada.tieneTurno2
                    };
                } else {
                    jornadaSemanalConsolidada[dayMapped] = { activo: false, inicio: '08:00', fin: '12:00', inicio2: '', fin2: '', tieneTurno2: false };
                }
            });

            const datosF03 = {
                jornadaSemanal: jornadaSemanalConsolidada,
                actividadesPerfil: legacyActividadesPerfil,
                horasSemanales: totalSemanal,
                horasMensuales: Math.round(totalSemanal * 4.28 * 10) / 10
            };

            const nnasWithDatosF03 = data.nnas.map(nna => ({
                ...nna,
                datos_f03: JSON.stringify(datosF03)
            }));

            const payloadToSave = {
                ...data,
                nnas: nnasWithDatosF03,
                actividadRealizada: JSON.stringify(data.actividadesCalle),
                tiempoEnCalle: data.actividadesCalle.map(a => a.tiempoUnidad === "Detalle" ? a.tiempoValor : ${a.tiempoValor} ).join(", ")
            };
'''

content = re.sub(r'const onSubmit = async \(data: NnaFormData\) => \{.*?const payloadToSave = \{.*?\};', replacement, content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated NnaCreatePage.tsx successfully")
