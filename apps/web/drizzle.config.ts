import { defineConfig } from "drizzle-kit"
import { config } from "dotenv"
import { resolve } from "node:path"

config({ path: resolve(process.cwd(), "../../.env") })
config({ path: resolve(process.cwd(), ".env") })

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
  },
})
