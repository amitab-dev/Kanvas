import { configDotenv } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

configDotenv({
    path: "./.env",
    quiet: true
})

export default defineConfig({
    out: './drizzle',
    schema: './src/db/schema.ts',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
});
