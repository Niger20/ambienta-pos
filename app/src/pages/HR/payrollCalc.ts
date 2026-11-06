import type { Row } from './utils';
import { round2 } from './utils';

const ymd = (v: unknown) => String(v ?? '').slice(0, 10);

/** Períodos de pago por año según la frecuencia. */
export const periodsPerYear = (tipo: string): number => (tipo === 'SEMANAL' ? 52 : tipo === 'QUINCENAL' ? 24 : 12);

/** Fracción del salario mensual que corresponde a un período de la frecuencia dada. */
export const periodFactor = (tipo: string): number => 12 / periodsPerYear(tipo);

/** Selecciona el registro vigente (el de fecha de vigencia más reciente que ya inició al cierre del período). */
export function pickInss(configs: Row[], fechafin: string): Row | null {
    const vigentes = configs
        .filter(c => c.activo !== false && ymd(c.fechavigencia) <= fechafin && (!c.fechafinvigencia || ymd(c.fechafinvigencia) >= fechafin))
        .sort((a, b) => ymd(b.fechavigencia).localeCompare(ymd(a.fechavigencia)));
    return vigentes[0] || null;
}

/** Tramos de IR del conjunto de vigencia más reciente aplicable al período. */
export function pickTramos(tramos: Row[], fechafin: string): Row[] {
    const activos = tramos.filter(t => t.activo !== false && ymd(t.fechavigencia) <= fechafin);
    if (activos.length === 0) return [];
    const vigencia = activos.map(t => ymd(t.fechavigencia)).sort().reverse()[0];
    return activos.filter(t => ymd(t.fechavigencia) === vigencia).sort((a, b) => Number(a.salariodesde) - Number(b.salariodesde));
}

export interface Retenciones {
    insslaboral: number;
    insspatronal: number;
    ir: number;
}

/**
 * INSS laboral/patronal sobre el total de ingresos e IR por tabla progresiva anual
 * (renta neta anualizada = (ingresos - INSS laboral) x períodos por año).
 * Los contratos de servicios profesionales no cotizan ni retienen por planilla.
 */
export function calcularRetenciones(totalIngresos: number, empleado: Row, tipoperiodo: string, inss: Row | null, tramos: Row[]): Retenciones {
    if (empleado.tipocontrato !== 'PLANILLA') return { insslaboral: 0, insspatronal: 0, ir: 0 };

    const insslaboral = inss ? round2(totalIngresos * Number(inss.tasalaboral)) : 0;
    const insspatronal = inss ? round2(totalIngresos * Number(inss.tasapatronal)) : 0;

    const ppa = periodsPerYear(tipoperiodo);
    const rentaAnual = (totalIngresos - insslaboral) * ppa;
    const tramo = [...tramos].reverse().find(t => rentaAnual >= Number(t.salariodesde) && (t.salariohasta == null || rentaAnual <= Number(t.salariohasta) + 0.01));

    let ir = 0;
    if (tramo) {
        const desde = Number(tramo.salariodesde);
        const exceso = rentaAnual - (desde > 0 ? Math.floor(desde) : 0);
        ir = round2((Number(tramo.cuotafija) + Math.max(0, exceso) * Number(tramo.tasamarginal)) / ppa);
    }
    return { insslaboral, insspatronal, ir };
}

export const totalIngresos = (d: Row): number =>
    d.totalingresos != null
        ? Number(d.totalingresos)
        : Number(d.salariobruto || 0) + Number(d.montohorasextra || 0) + Number(d.comisiones || 0) + Number(d.pagoferiados || 0) + Number(d.otrosingresos || 0);

export const totalDeducciones = (d: Row): number =>
    d.totaldeducciones != null
        ? Number(d.totaldeducciones)
        : Number(d.insslaboral || 0) + Number(d.ir || 0) + Number(d.otrasdeducciones || 0) + Number(d.cuotasprestamos || 0) + Number(d.anticipos || 0);

export const salarioNeto = (d: Row): number => (d.salarioneto != null ? Number(d.salarioneto) : totalIngresos(d) - totalDeducciones(d));

/** ¿La fecha es feriado? Considera feriados recurrentes (mismo mes y día) y únicos. */
export function esFeriado(fecha: string, feriados: Row[]): boolean {
    return feriados.some(f => f.activo !== false && (ymd(f.fecha) === fecha || (f.esrecurrente && ymd(f.fecha).slice(5) === fecha.slice(5))));
}
