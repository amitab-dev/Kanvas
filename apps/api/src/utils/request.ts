import type { FastifyRequest } from "fastify";
import { ApiError } from "./response";

/** The authenticated user's id, as put on the request by the `authenticate` plugin. */
export const currentUserId = (req: FastifyRequest): string => {
    const id = req.user as unknown as string;
    if (!id || typeof id !== "string") {
        throw new ApiError(401, "Unauthorized request");
    }
    return id;
};

export type Database = FastifyRequest["server"]["db"];
