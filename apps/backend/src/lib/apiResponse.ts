import z from "zod";

/**
 * Every successful response body is `{ success: true, message, data }`.
 *
 * Instances are plain enough to serialize directly: the fields are own,
 * enumerable properties, so `reply.send(new ApiResponse(...))` works and still
 * passes through a route's Zod response schema.
 */
export class ApiResponse<T> {
    readonly success = true as const;
    readonly message: string;
    readonly data: T;

    constructor(data: T, message = "Success") {
        this.data = data;
        this.message = message;
    }

    static ok<T>(data: T, message = "Success") {
        return new ApiResponse(data, message);
    }

    static created<T>(data: T, message = "Created") {
        return new ApiResponse(data, message);
    }
}

/** Wraps a payload schema in the success envelope, for route `response` maps. */
export const apiResponseSchema = <T extends z.ZodType>(data: T) =>
    z.object({
        success: z.literal(true),
        message: z.string(),
        data
    });
