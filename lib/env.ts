import { z } from "zod";

const envSchema = z.object({
  NINEROUTER_API_KEY: z.string().optional(),
  NINEROUTER_BASE_URL: z.string().default("http://127.0.0.1:20128/v1"),
  NINEROUTER_MODEL_ID: z.string().default("gemini/gemini-3.5-flash-lite"),
  GEMINI_API_KEY: z.string().optional(),
  DATABASE_URL: z.string().default("file:./dev.db"),
  MAX_UPLOAD_MB: z.coerce.number().default(20),
});

export function getAppEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.format());
    throw new Error("Invalid server environment configuration.");
  }
  return parsed.data;
}

export function getLLMConfig() {
  const env = getAppEnv();
  const apiKey = env.NINEROUTER_API_KEY || env.GEMINI_API_KEY || "";
  return {
    apiKey,
    baseURL: env.NINEROUTER_BASE_URL,
    modelId: env.NINEROUTER_MODEL_ID,
  };
}
