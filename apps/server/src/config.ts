// Server configuration — validated at startup. Fails fast on bad env
// instead of starting with a broken port.
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(2567),
  HOST: z.string().min(1).default('0.0.0.0'),
});

export type ServerConfig = z.infer<typeof envSchema>;

export const serverConfig: ServerConfig = envSchema.parse(process.env);
