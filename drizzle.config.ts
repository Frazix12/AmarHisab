import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./services/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  driver: "expo",
});
