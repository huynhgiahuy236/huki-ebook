type OpenApiDocument = Record<string, any>;

const SERVICES = [
  ['Identity', process.env.IDENTITY_SERVICE_URL || 'http://localhost:3001'],
  ['Business', process.env.BUSINESS_SERVICE_URL || 'http://localhost:3002'],
  ['Commerce', process.env.COMMERCE_SERVICE_URL || 'http://localhost:3003'],
  ['Shipping', process.env.SHIPPING_SERVICE_URL || 'http://localhost:3004'],
  ['Community', process.env.COMMUNITY_SERVICE_URL || 'http://localhost:3005'],
  ['Promotion', process.env.PROMOTION_SERVICE_URL || 'http://localhost:3007'],
] as const;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function namespaceComponents(document: OpenApiDocument, namespace: string) {
  const components = document.components;
  if (!components || typeof components !== 'object') return;

  const references = new Map<string, string>();
  for (const [section, entries] of Object.entries(components)) {
    if (!entries || typeof entries !== 'object') continue;
    for (const key of Object.keys(entries as Record<string, unknown>)) {
      references.set(
        `#/components/${section}/${key}`,
        `#/components/${section}/${namespace}_${key}`,
      );
    }
  }

  const rewrite = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(rewrite);
      return;
    }
    if (!value || typeof value !== 'object') return;
    const object = value as Record<string, unknown>;
    if (typeof object.$ref === 'string' && references.has(object.$ref)) {
      object.$ref = references.get(object.$ref)!;
    }
    Object.values(object).forEach(rewrite);
  };
  rewrite(document);

  for (const [section, entries] of Object.entries(components)) {
    if (!entries || typeof entries !== 'object') continue;
    const renamed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(entries as Record<string, unknown>)) {
      renamed[`${namespace}_${key}`] = value;
    }
    components[section] = renamed;
  }
}

/**
 * Builds a gateway OpenAPI document without copying service contracts into the
 * gateway codebase. Each service remains the source of truth for its routes.
 */
export async function aggregateOpenApi(baseDocument: OpenApiDocument) {
  const document = clone(baseDocument);
  document.paths ??= {};
  document.components ??= {};
  document.tags ??= [];

  const results = await Promise.all(
    SERVICES.map(async ([name, baseUrl]) => {
      try {
        const response = await fetch(`${baseUrl}/api/docs-json`, {
          signal: AbortSignal.timeout(3000),
        });
        if (!response.ok) return null;
        return { name, document: (await response.json()) as OpenApiDocument };
      } catch {
        return null;
      }
    }),
  );

  for (const result of results) {
    if (!result) continue;
    const namespace = result.name.toLowerCase();
    const serviceDocument = clone(result.document);
    namespaceComponents(serviceDocument, namespace);

    for (const [path, pathItem] of Object.entries(serviceDocument.paths ?? {})) {
      // Gateway owns the public aggregate health endpoint; service health
      // endpoints are operational endpoints and would otherwise collide.
      if (path === '/api/v1/health') continue;
      document.paths[path] = pathItem;
    }

    for (const [section, entries] of Object.entries(serviceDocument.components ?? {})) {
      document.components[section] = {
        ...(document.components[section] ?? {}),
        ...(entries as Record<string, unknown>),
      };
    }

    for (const tag of serviceDocument.tags ?? []) {
      if (!document.tags.some((existing: { name?: string }) => existing.name === tag.name)) {
        document.tags.push(tag);
      }
    }
  }

  return document;
}
