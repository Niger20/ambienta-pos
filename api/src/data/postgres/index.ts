import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../generated/prisma/client'
import { userContext } from './user-context'

const connectionString = `${process.env.POSTGRES_URL}`

const pool = new Pool({ connectionString })

// Auditoría: los triggers de la BD leen la variable de sesión `app.usuario_id`.
// Cada conexión recuerda el usuario con el que quedó configurada y solo la
// actualiza cuando cambia (el usuario de la petición en curso o ninguno), así
// que el costo es una consulta extra únicamente al cambiar de usuario.
const SET_USUARIO = `SELECT set_config('app.usuario_id', $1, false)`

type ClienteConUsuario = import('pg').PoolClient & { __usuarioid?: number | null }

pool.on('connect', (client: ClienteConUsuario) => {
    const query = client.query.bind(client) as (...args: unknown[]) => Promise<unknown>
    client.__usuarioid = null

    ;(client as unknown as { query: (...args: unknown[]) => unknown }).query = (...args: unknown[]) => {
        // Las consultas con callback (mantenimiento interno del pool) pasan tal cual.
        if (typeof args[args.length - 1] === 'function') return query(...args)

        const usuarioid = userContext.getStore()?.usuarioid ?? null
        if (usuarioid === client.__usuarioid) return query(...args)

        return query(SET_USUARIO, [usuarioid == null ? '' : String(usuarioid)]).then(() => {
            client.__usuarioid = usuarioid
            return query(...args)
        })
    }
})

const adapter = new PrismaPg(pool)
// Los valores por defecto (2 s para obtener conexión, 5 s de duración) son
// cortos para Neon: una venta con muchas líneas podía expirar a mitad del cobro.
const prisma = new PrismaClient({
    adapter,
    transactionOptions: { maxWait: 10_000, timeout: 30_000 },
})

export default prisma
