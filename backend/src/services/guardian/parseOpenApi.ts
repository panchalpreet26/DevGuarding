export type FieldLocation = 'body' | 'query' | 'path' | 'header' | 'response';

export type SpecField = {
  name: string;
  type?: string;
  required: boolean;
  location: FieldLocation;
};

export type SpecEndpoint = {
  method: string;
  path: string;
  rawPath: string;
  operationId?: string;
  requestFields: SpecField[];
  responseFields: SpecField[];
  requiredRequestFields: string[];
};

/** Convert OpenAPI `{id}` / Swagger `{id}` style to Express `:id`. */
export function normalizePath(path: string): string {
  return (
    '/' +
    path
      .split('/')
      .filter(Boolean)
      .map((seg) => {
        const brace = seg.match(/^\{([^}]+)\}$/);
        if (brace) return `:${brace[1]}`;
        const colon = seg.match(/^:([^/]+)$/);
        if (colon) return `:${colon[1]}`;
        return seg;
      })
      .join('/')
  ).replace(/\/+/g, '/') || '/';
}

function schemaType(schema: unknown): string | undefined {
  if (!schema || typeof schema !== 'object') return undefined;
  const s = schema as Record<string, unknown>;
  if (typeof s.type === 'string') return s.type;
  if (s.$ref && typeof s.$ref === 'string') {
    const parts = s.$ref.split('/');
    return parts[parts.length - 1];
  }
  if (Array.isArray(s.oneOf) || Array.isArray(s.anyOf)) return 'union';
  return undefined;
}

function collectObjectFields(
  schema: unknown,
  location: FieldLocation,
  components: Record<string, unknown>,
  depth = 0,
): SpecField[] {
  if (!schema || typeof schema !== 'object' || depth > 4) return [];
  let s = schema as Record<string, unknown>;

  if (typeof s.$ref === 'string') {
    const resolved = resolveRef(s.$ref, components);
    if (!resolved) return [];
    s = resolved as Record<string, unknown>;
  }

  if (s.type === 'array' && s.items) {
    return collectObjectFields(s.items, location, components, depth + 1);
  }

  if (s.type !== 'object' && !s.properties) return [];

  const props = (s.properties as Record<string, unknown> | undefined) ?? {};
  const required = new Set(
    Array.isArray(s.required) ? s.required.map(String) : [],
  );

  return Object.entries(props).map(([name, propSchema]) => ({
    name,
    type: schemaType(propSchema),
    required: required.has(name),
    location,
  }));
}

function resolveRef(ref: string, components: Record<string, unknown>): unknown {
  // #/components/schemas/User or #/definitions/User
  const cleaned = ref.replace(/^#\//, '');
  const parts = cleaned.split('/');
  let cur: unknown = components;
  for (const part of parts) {
    if (!cur || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function buildComponentRoot(doc: Record<string, unknown>): Record<string, unknown> {
  // Allow resolveRef to walk from document root for both OAS3 and Swagger2.
  return doc;
}

/**
 * Parse OpenAPI 3.x or Swagger 2.0 JSON into normalized endpoints.
 */
export function parseOpenApiDocument(raw: unknown): SpecEndpoint[] {
  let doc: Record<string, unknown>;
  if (typeof raw === 'string') {
    doc = JSON.parse(raw) as Record<string, unknown>;
  } else if (raw && typeof raw === 'object') {
    doc = raw as Record<string, unknown>;
  } else {
    throw new Error('Swagger payload must be a JSON object or string.');
  }

  const paths = doc.paths;
  if (!paths || typeof paths !== 'object') {
    throw new Error('Invalid OpenAPI/Swagger: missing paths.');
  }

  const components = buildComponentRoot(doc);
  const endpoints: SpecEndpoint[] = [];
  const methods = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head']);

  for (const [rawPath, pathItem] of Object.entries(paths as Record<string, unknown>)) {
    if (!pathItem || typeof pathItem !== 'object') continue;
    const item = pathItem as Record<string, unknown>;

    for (const [method, operation] of Object.entries(item)) {
      if (!methods.has(method.toLowerCase())) continue;
      if (!operation || typeof operation !== 'object') continue;
      const op = operation as Record<string, unknown>;

      const requestFields: SpecField[] = [];
      const responseFields: SpecField[] = [];

      // Parameters (path/query/header) — OAS2 + OAS3
      const params = Array.isArray(op.parameters) ? op.parameters : [];
      for (const param of params) {
        if (!param || typeof param !== 'object') continue;
        const p = param as Record<string, unknown>;
        const name = String(p.name ?? '');
        if (!name) continue;
        const loc = String(p.in ?? 'query') as FieldLocation;
        const schema = p.schema ?? { type: p.type };
        requestFields.push({
          name,
          type: schemaType(schema),
          required: Boolean(p.required),
          location: loc === 'path' || loc === 'query' || loc === 'header' ? loc : 'query',
        });
      }

      // OAS3 requestBody
      const requestBody = op.requestBody as Record<string, unknown> | undefined;
      if (requestBody?.content && typeof requestBody.content === 'object') {
        const content = requestBody.content as Record<string, unknown>;
        const json =
          (content['application/json'] as Record<string, unknown> | undefined) ??
          (Object.values(content)[0] as Record<string, unknown> | undefined);
        if (json?.schema) {
          requestFields.push(
            ...collectObjectFields(json.schema, 'body', components),
          );
        }
      }

      // Swagger2 body parameter
      for (const param of params) {
        if (!param || typeof param !== 'object') continue;
        const p = param as Record<string, unknown>;
        if (p.in === 'body' && p.schema) {
          requestFields.push(...collectObjectFields(p.schema, 'body', components));
        }
      }

      // Responses — prefer 200/201
      const responses = (op.responses as Record<string, unknown> | undefined) ?? {};
      const success =
        (responses['200'] as Record<string, unknown> | undefined) ??
        (responses['201'] as Record<string, unknown> | undefined) ??
        (responses.default as Record<string, unknown> | undefined);

      if (success) {
        // OAS3
        if (success.content && typeof success.content === 'object') {
          const content = success.content as Record<string, unknown>;
          const json =
            (content['application/json'] as Record<string, unknown> | undefined) ??
            (Object.values(content)[0] as Record<string, unknown> | undefined);
          if (json?.schema) {
            responseFields.push(
              ...collectObjectFields(json.schema, 'response', components),
            );
          }
        }
        // Swagger2
        if (success.schema) {
          responseFields.push(
            ...collectObjectFields(success.schema, 'response', components),
          );
        }
      }

      const requiredRequestFields = requestFields
        .filter((f) => f.required)
        .map((f) => f.name);

      endpoints.push({
        method: method.toUpperCase(),
        path: normalizePath(rawPath),
        rawPath,
        operationId: typeof op.operationId === 'string' ? op.operationId : undefined,
        requestFields,
        responseFields,
        requiredRequestFields,
      });
    }
  }

  return endpoints.sort(
    (a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method),
  );
}
