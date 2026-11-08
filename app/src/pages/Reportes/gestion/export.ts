import * as XLSX from 'xlsx';

export interface HojaExcel {
    nombre: string;
    filas: (string | number | null)[][];
}

/** Descarga un libro de Excel con una o varias hojas (la primera fila de cada hoja son los encabezados). */
export function descargarExcel(archivo: string, hojas: HojaExcel[]) {
    const libro = XLSX.utils.book_new();
    for (const hoja of hojas) {
        const ws = XLSX.utils.aoa_to_sheet(hoja.filas);
        // Ancho de columna según el contenido más largo
        ws['!cols'] = hoja.filas[0]?.map((_, c) => ({ wch: Math.min(48, Math.max(10, ...hoja.filas.map(f => String(f[c] ?? '').length)) + 2) }));
        // Excel limita el nombre de hoja a 31 caracteres y prohíbe algunos símbolos
        XLSX.utils.book_append_sheet(libro, ws, hoja.nombre.replace(/[\\/?*[\]:]/g, '').slice(0, 31) || 'Reporte');
    }
    XLSX.writeFile(libro, `${archivo}.xlsx`);
}

export const hoyArchivo = (): string => new Date().toISOString().slice(0, 10);
