import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { getArrayData } from '../../utils/arrayUtils';
import type { Row } from './utils';

export interface Lookups {
    empleados: Row[];
    periodos: Row[];
    departamentos: Row[];
    cargos: Row[];
    isLoading: boolean;
    reload: () => Promise<void>;
}

/** Catálogos compartidos por los selectores de todo el módulo de RRHH. */
export function useLookups(): Lookups {
    const [empleados, setEmpleados] = useState<Row[]>([]);
    const [periodos, setPeriodos] = useState<Row[]>([]);
    const [departamentos, setDepartamentos] = useState<Row[]>([]);
    const [cargos, setCargos] = useState<Row[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const reload = useCallback(async () => {
        try {
            const [emp, per, dep, car] = await Promise.all([
                api.get('/empleados?limit=0'),
                api.get('/periodos-planilla?limit=0'),
                api.get('/departamentos-empleados?limit=0'),
                api.get('/cargos-empleados?limit=0'),
            ]);
            setEmpleados(getArrayData(emp.data, 'empleados'));
            setPeriodos(getArrayData(per.data, 'periodos'));
            setDepartamentos(getArrayData(dep.data, 'departamentos'));
            setCargos(getArrayData(car.data, 'cargos'));
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        reload();
    }, [reload]);

    return { empleados, periodos, departamentos, cargos, isLoading, reload };
}
