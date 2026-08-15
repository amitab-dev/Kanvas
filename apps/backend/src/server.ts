import bootstrap from "./app"
import env from "./env"

async function start() {
    const app = bootstrap()

    try {
        await app.listen({ port: env.PORT, host: "0.0.0.0" })
    } catch (error) {
        app.log.fatal(`Error: ${error}`)
        process.exit(1)
    }
}

start()