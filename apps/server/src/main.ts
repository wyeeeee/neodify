import fs from 'node:fs';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { buildApp } from './app.js';

function loadServerEnv(): void {
  const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';
  const root = path.resolve(process.cwd(), '..', '..');
  const envFile = path.resolve(root, 'env', 'server', `.env.${mode}`);
  if (fs.existsSync(envFile)) {
    loadEnv({ path: envFile, override: true });
  }
}

async function bootstrap() {
  loadServerEnv();
  const app = await buildApp();
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen({ port, host });
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
