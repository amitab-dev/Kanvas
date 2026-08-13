import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres"
import * as schema from "./schema"
import { Pool } from "pg"

interface DbType {
    db: NodePgDatabase<typeof schema>
    pool: Pool
}

export default function connectDB(): DbType {
    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) {
        throw new Error("DATABASE_URL not set")
    }

    const pool = new Pool({
        connectionString: dbUrl,
        max: 10,
        idleTimeoutMillis: 20_000,
        connectionTimeoutMillis: 30_000
    })

    const db = drizzle(pool, { schema })

    return { db, pool }
}