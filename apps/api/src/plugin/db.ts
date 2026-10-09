import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import connectDB from "../db";

type Database = ReturnType<typeof connectDB>["db"];

declare module "fastify" {
    interface FastifyInstance {
        db: Database;
    }
}

const databasePlugin: FastifyPluginAsync = async (app: FastifyInstance) => {
    const { db, pool } = connectDB();

    await pool.query("SELECT 1");

    app.decorate("db", db);

    app.addHook("onClose", async () => {
        await pool.end();
    });
};

export default fp(databasePlugin, { name: "database" });