import z from "zod";

const DEVELOPMENT_JWT_SECRET = "this-is-just-a-random-secret";
const DEVELOPMENT_COOKIE_SECRET = "this-is-just-a-random-cookie-secret";

const envSchema = z
    .object({
        PORT: z.coerce.number().int().positive().default(8000),
        NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
        ORIGIN: z.string().optional(),
        DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
        JWT_SECRET: z.string().min(1).default(DEVELOPMENT_JWT_SECRET),
        COOKIE_SECRET: z.string().min(1).default(DEVELOPMENT_COOKIE_SECRET)
    })
    .superRefine((env, ctx) => {
        if (env.NODE_ENV !== "production") {
            return;
        }

        if (env.JWT_SECRET === DEVELOPMENT_JWT_SECRET) {
            ctx.addIssue({
                code: "custom",
                path: ["JWT_SECRET"],
                message: "JWT_SECRET must be set in production"
            });
        }

        if (env.COOKIE_SECRET === DEVELOPMENT_COOKIE_SECRET) {
            ctx.addIssue({
                code: "custom",
                path: ["COOKIE_SECRET"],
                message: "COOKIE_SECRET must be set in production"
            });
        }

        if (!env.ORIGIN) {
            ctx.addIssue({
                code: "custom",
                path: ["ORIGIN"],
                message: "ORIGIN must be set in production"
            });
        }
    });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    const problems = parsed.error.issues
        .map((issue) => `  - ${issue.path.join(".") || "env"}: ${issue.message}`)
        .join("\n");

    // Thrown before the logger exists, so this writes straight to stderr.
    console.error(`Invalid environment configuration:\n${problems}`);
    process.exit(1);
}

const env = parsed.data;

export default env;
