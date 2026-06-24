import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { parse as parseYaml } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));

function resolveOpenApiPath(): string {
  const candidates = [
    join(process.cwd(), 'openapi.yaml'),
    join(process.cwd(), '../docs/api/openapi.yaml'),
    join(__dirname, '../../docs/api/openapi.yaml'),
  ];
  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  throw new Error(
    `OpenAPI spec not found. Tried: ${candidates.join(', ')}`,
  );
}

export function loadOpenApiSpec(): Record<string, unknown> {
  const raw = readFileSync(resolveOpenApiPath(), 'utf8');
  return parseYaml(raw) as Record<string, unknown>;
}

export function mountSwagger(app: Express): void {
  if (process.env.SWAGGER_ENABLED === 'false') return;

  const spec = loadOpenApiSpec();

  app.get('/api/openapi.yaml', (_req, res) => {
    res.type('text/yaml').send(readFileSync(resolveOpenApiPath(), 'utf8'));
  });

  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(spec, {
      customSiteTitle: 'OEX API — Swagger UI',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
      },
    }),
  );
}
