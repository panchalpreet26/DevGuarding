export type PackageSignals = {
  name: string | null;
  description: string | null;
  dependencies: string[];
  devDependencies: string[];
  scripts: string[];
  techStack: string[];
  frameworks: string[];
  database: string | null;
};

const FRAMEWORK_HINTS: Array<{ match: RegExp; label: string }> = [
  { match: /^react$/, label: 'React' },
  { match: /^next$/, label: 'Next.js' },
  { match: /^vue$/, label: 'Vue' },
  { match: /^@angular\/core$/, label: 'Angular' },
  { match: /^express$/, label: 'Express' },
  { match: /^fastify$/, label: 'Fastify' },
  { match: /^@nestjs\/core$/, label: 'NestJS' },
  { match: /^koa$/, label: 'Koa' },
  { match: /^hono$/, label: 'Hono' },
  { match: /^vite$/, label: 'Vite' },
  { match: /^svelte$/, label: 'Svelte' },
];

const DB_HINTS: Array<{ match: RegExp; label: string }> = [
  { match: /^mongoose$|^mongodb$/, label: 'MongoDB' },
  { match: /^pg$|^postgres|^prisma$/, label: 'PostgreSQL' },
  { match: /^mysql2?$/, label: 'MySQL' },
  { match: /^redis$|^ioredis$/, label: 'Redis' },
  { match: /^sqlite3$/, label: 'SQLite' },
  { match: /^@supabase\//, label: 'Supabase' },
];

const STACK_HINTS: Array<{ match: RegExp; label: string }> = [
  { match: /^typescript$/, label: 'TypeScript' },
  { match: /^tailwindcss$/, label: 'Tailwind CSS' },
  { match: /^zod$/, label: 'Zod' },
  { match: /^passport$/, label: 'Passport' },
  { match: /^jsonwebtoken$/, label: 'JWT' },
  { match: /^openai$/, label: 'OpenAI' },
  { match: /^socket\.io$/, label: 'Socket.IO' },
  { match: /^graphql$/, label: 'GraphQL' },
  { match: /^prisma$/, label: 'Prisma' },
  { match: /^drizzle-orm$/, label: 'Drizzle' },
];

function collectDeps(pkg: Record<string, unknown>): string[] {
  const deps = {
    ...(pkg.dependencies as Record<string, string> | undefined),
    ...(pkg.devDependencies as Record<string, string> | undefined),
  };
  return Object.keys(deps);
}

function matchLabels(deps: string[], hints: Array<{ match: RegExp; label: string }>): string[] {
  const found = new Set<string>();
  for (const dep of deps) {
    for (const hint of hints) {
      if (hint.match.test(dep)) found.add(hint.label);
    }
  }
  return [...found];
}

/** Parse one or more package.json files into stack signals. */
export function analyzePackages(files: Map<string, string>): PackageSignals {
  const mergedDeps = new Set<string>();
  let name: string | null = null;
  let description: string | null = null;
  const scripts = new Set<string>();
  const dependencies: string[] = [];
  const devDependencies: string[] = [];

  for (const [filePath, raw] of files) {
    let pkg: Record<string, unknown>;
    try {
      pkg = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      continue;
    }

    if (!name && typeof pkg.name === 'string') name = pkg.name;
    if (!description && typeof pkg.description === 'string') description = pkg.description;

    if (pkg.scripts && typeof pkg.scripts === 'object') {
      for (const key of Object.keys(pkg.scripts as object)) scripts.add(key);
    }

    const deps = (pkg.dependencies as Record<string, string> | undefined) ?? {};
    const devDeps = (pkg.devDependencies as Record<string, string> | undefined) ?? {};
    for (const d of Object.keys(deps)) {
      mergedDeps.add(d);
      if (!dependencies.includes(d)) dependencies.push(d);
    }
    for (const d of Object.keys(devDeps)) {
      mergedDeps.add(d);
      if (!devDependencies.includes(d)) devDependencies.push(d);
    }

    // Prefer root package.json for name/description.
    if (filePath === 'package.json' || filePath.endsWith('/package.json')) {
      if (typeof pkg.name === 'string') name = pkg.name;
      if (typeof pkg.description === 'string') description = pkg.description;
    }
  }

  const all = [...mergedDeps];
  const frameworks = matchLabels(all, FRAMEWORK_HINTS);
  const techStack = [...new Set([...matchLabels(all, STACK_HINTS), ...frameworks])];
  const databases = matchLabels(all, DB_HINTS);

  // Heuristic: TypeScript present if any .ts path was analyzed via package.json typescript dep
  if (all.includes('typescript') && !techStack.includes('TypeScript')) {
    techStack.unshift('TypeScript');
  }

  void collectDeps; // kept for clarity / future use

  return {
    name,
    description,
    dependencies: dependencies.slice(0, 80),
    devDependencies: devDependencies.slice(0, 80),
    scripts: [...scripts],
    techStack,
    frameworks,
    database: databases[0] ?? null,
  };
}
