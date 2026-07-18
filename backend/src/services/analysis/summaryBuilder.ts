import type { ApiEndpoint, FolderNode } from '@devguardian/shared';
import type { PackageSignals } from './packageAnalyzer.js';
import type { AuthSignals } from './authFlowDetector.js';

function countNodes(node: FolderNode): { files: number; dirs: number } {
  if (node.type === 'file') return { files: 1, dirs: 0 };
  let files = 0;
  let dirs = 1;
  for (const child of node.children ?? []) {
    const c = countNodes(child);
    files += c.files;
    dirs += c.dirs;
  }
  return { files, dirs };
}

function layerLine(label: string, paths: string[]): string | null {
  if (!paths.length) return null;
  const sample = paths.slice(0, 3).map((p) => `\`${p}\``).join(', ');
  const more = paths.length > 3 ? ` (+${paths.length - 3} more)` : '';
  return `- **${label}**: ${paths.length} file(s) — ${sample}${more}`;
}

export function buildProjectSummary(input: {
  repoFullName: string;
  description: string | null;
  readmeExcerpt: string | null;
  pkg: PackageSignals;
  endpoints: ApiEndpoint[];
  auth: AuthSignals;
  tree: FolderNode;
  layers: {
    routes: string[];
    controllers: string[];
    services: string[];
    middlewares: string[];
    models: string[];
  };
}): string {
  const { files, dirs } = countNodes(input.tree);
  const lines: string[] = [];

  lines.push(
    `**${input.repoFullName}** is a software project${
      input.pkg.name ? ` (package \`${input.pkg.name}\`)` : ''
    } analyzed from its repository contents.`,
  );

  const blurb = input.pkg.description || input.description;
  if (blurb) lines.push(blurb.trim());

  if (input.readmeExcerpt) {
    const firstPara = input.readmeExcerpt
      .replace(/^#+\s.*$/gm, '')
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\s+/g, ' ').trim())
      .find((p) => p.length > 40);
    if (firstPara) lines.push(firstPara.slice(0, 320) + (firstPara.length > 320 ? '…' : ''));
  }

  const stack = input.pkg.techStack.length
    ? input.pkg.techStack.join(', ')
    : 'not clearly declared in package.json';
  lines.push(`Detected tech stack: ${stack}.`);

  if (input.pkg.database) {
    lines.push(`Primary data store signal: **${input.pkg.database}**.`);
  }

  lines.push(
    `Repository map covers ~${files} files across ~${dirs} directories (depth-limited view).`,
  );

  const layerLines = [
    layerLine('Routes', input.layers.routes),
    layerLine('Controllers', input.layers.controllers),
    layerLine('Services', input.layers.services),
    layerLine('Middleware', input.layers.middlewares),
    layerLine('Models', input.layers.models),
  ].filter(Boolean);

  if (layerLines.length) {
    lines.push('Layered structure found:');
    lines.push(...(layerLines as string[]));
  }

  lines.push(
    input.endpoints.length
      ? `Extracted **${input.endpoints.length}** HTTP endpoint declaration(s) from route/controller sources.`
      : 'No Express/Nest-style route declarations were extracted — APIs may live in another language or framework.',
  );

  if (input.auth.mechanisms.length) {
    lines.push(`Auth signals: ${input.auth.mechanisms.join(', ')}.`);
  }

  return lines.join('\n\n');
}

export function buildArchitectureDiagram(input: {
  frameworks: string[];
  database: string | null;
  hasFrontend: boolean;
  hasBackend: boolean;
}): string {
  const front =
    input.frameworks.find((f) =>
      ['React', 'Next.js', 'Vue', 'Angular', 'Svelte', 'Vite'].includes(f),
    ) ?? (input.hasFrontend ? 'Frontend' : null);
  const back =
    input.frameworks.find((f) =>
      ['Express', 'NestJS', 'Fastify', 'Koa', 'Hono'].includes(f),
    ) ?? (input.hasBackend ? 'API' : null);
  const db = input.database;

  const parts = [front, back, db].filter(Boolean) as string[];
  if (parts.length < 2) {
    return parts[0] ?? 'Application';
  }
  return parts.join('\n↓\n');
}
