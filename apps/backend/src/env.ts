const env = {
    PORT: Number(process.env.PORT) || 8000,
    NODE_ENV: process.env.NODE_ENV || "development",
    ORIGIN: process.env.ORIGIN,
    JWT_SECRET: process.env.JWT_SECRET || "this-is-just-a-random-secret",
    COOKIE_SECRET: process.env.COOKIE_SECRET || "this-is-just-a-random-cookie-secret",
}

export default env;
