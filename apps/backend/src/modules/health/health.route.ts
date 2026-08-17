import { sql } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { ApiResponse } from "../../utils/response";

/**
 * Unauthenticated liveness and readiness check, mounted at /health.
 *
 * The database round trip is the point: a process that is listening but cannot
 * reach Postgres serves nothing but 500s, and a load balancer should take it
 * out of rotation rather than keep sending traffic to it.
 */
export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
    app.get("/", async (_req, reply) => {
        try {
            await app.db.execute(sql`select 1`);
        } catch (error) {
            app.log.error(error);

            return reply
                .code(503)
                .send({
                    success: false,
                    status: 503,
                    message: "Database unavailable"
                });
        }

        return reply
            .code(200)
            .send(new ApiResponse(200, { uptime: process.uptime() }, "OK"));
    })
}
