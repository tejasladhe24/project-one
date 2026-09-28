import { config } from "dotenv"
import { resolve } from "node:path"
import { createEnv } from "@t3-oss/env-core"
import z from "zod"
import { isProduction } from "./lib/constants"

config({
  path: [
    resolve(import.meta.dirname, "../../../.env"),
    resolve(import.meta.dirname, "../.env"),
  ],
})

export const env = createEnv({
  server: {
    // postgres
    POSTGRES_URL: z.url(),
    // z.coerce.boolean() treats the string "false" as true (Boolean("false") === true)
    POSTGRES_SSL: z
      .enum(["true", "false"])
      .default(isProduction ? "true" : "false")
      .transform((v) => v === "true"),
    POSTGRES_MAX_CONNECTIONS: z.coerce.number().default(50),
    POSTGRES_CONNECTION_TIMEOUT: z.coerce.number().default(15000),
    POSTGRES_IDLE_TIMEOUT: z.coerce.number().default(30000),

    // redis — TCP (local/ioredis)
    REDIS_URL: z.url().optional(),

    // resend
    RESEND_API_KEY: z.string(),
    EMAIL_SENDER_NAME: z.string(),
    EMAIL_SENDER_ADDRESS: z.string(),

    // auth
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_DOMAIN: z.string().min(1),
    GOOGLE_CLIENT_ID: z.string().describe("Google OAuth client ID"),
    GOOGLE_CLIENT_SECRET: z.string().describe("Google OAuth client secret"),

    // server-side urls
    APP_URL: z.url(),
  },
  clientPrefix: "VITE_",
  client: {
    VITE_APP_URL: z.string().describe("The URL of the app"),
  },
  runtimeEnv: {
    // postgres
    POSTGRES_URL: process.env.POSTGRES_URL,
    POSTGRES_SSL: process.env.POSTGRES_SSL,
    POSTGRES_MAX_CONNECTIONS: process.env.POSTGRES_MAX_CONNECTIONS,
    POSTGRES_CONNECTION_TIMEOUT: process.env.POSTGRES_CONNECTION_TIMEOUT,
    POSTGRES_IDLE_TIMEOUT: process.env.POSTGRES_IDLE_TIMEOUT,

    // redis
    REDIS_URL: process.env.REDIS_URL,

    // resend
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_SENDER_NAME: process.env.EMAIL_SENDER_NAME,
    EMAIL_SENDER_ADDRESS: process.env.EMAIL_SENDER_ADDRESS,

    // auth
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_DOMAIN: process.env.BETTER_AUTH_DOMAIN,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,

    // server-side urls
    APP_URL: process.env.APP_URL,

    // client
    VITE_APP_URL: process.env.VITE_APP_URL,
  },
})
