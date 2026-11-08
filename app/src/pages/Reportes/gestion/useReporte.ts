import { useEffect, useState } from 'react';
import api from '../../../api/axios';

type Params = Record<string, string | number | undefined>;

/** Consulta un reporte de gestión (`/reportes/<endpoint>`) y la vuelve a pedir si cambian sus parámetros. */
export function useReporte<T>(endpoint: string, params: Params = {}) {
    const [nonce, setNonce] = useState(0);
    const [res, setRes] = useState<{ key: string; data: T | null; error: string }>({ key: '', data: null, error: '' });

    const clave = `${endpoint}|${JSON.stringify(params)}|${nonce}`;

    useEffect(() => {
        let cancelado = false;
        api.get(`/reportes/${endpoint}`, { params })
            .then(r => { if (!cancelado) setRes({ key: clave, data: r.data as T, error: '' }); })
            .catch((err: any) => {
                if (cancelado) return;
                const detalle = err?.response?.data?.error;
                setRes({ key: clave, data: null, error: typeof detalle === 'string' ? detalle : 'No se pudo cargar el reporte.' });
            });
        return () => { cancelado = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clave]);

    return {
        data: res.key === clave ? res.data : null,
        error: res.key === clave ? res.error : '',
        // Mientras la respuesta no corresponda a los parámetros actuales, se considera cargando.
        loading: res.key !== clave,
        reload: () => setNonce(n => n + 1),
    };
}
