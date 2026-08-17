import bootstrap from "./app"
import env from "./env"

async function start() {
    const app = bootstrap()
    
    const shutdown = async (signal: string) => {
        app.log.info(`${signal} received, shutting down`)

        try {
            await app.close()
            process.exit(0)
        } catch (error) {
            app.log.error(`Error during shutdown: ${error}`)
            process.exit(1)
        }
    }

    for (const signal of ["SIGINT", "SIGTERM"] as const) {
        process.once(signal, () => void shutdown(signal))
    }

    try {
        await app.listen({ port: env.PORT, host: "0.0.0.0" })
    } catch (error) {
        app.log.fatal(`Error: ${error}`)
        process.exit(1)
    }
}

start()
