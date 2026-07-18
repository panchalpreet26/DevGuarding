import type { FolderNode } from '@devguardian/shared';
import type { GitHubTreeItem } from '../github/client.js';

const SKIP_DIR_PREFIXES = [
  'node_modules/',
  'dist/',
  'build/',
  '.git/',
  'coverage/',
  '.next/',
  '.turbo/',
  'vendor/',
  '__pycache__/',
];

const MAX_TREE_DEPTH = 4;
const MAX_CHILDREN_PER_DIR = 40;

function shouldSkip(path: string): boolean {
  return SKIP_DIR_PREFIXES.some((prefix) => path === prefix.slice(0, -1) || path.startsWith(prefix));
}

/** Build a nested folder tree from a flat GitHub recursive tree. */
export function buildFolderTree(items: GitHubTreeItem[], rootName: string): FolderNode {
  const root: FolderNode = { name: rootName, path: '', type: 'dir', children: [] };
  const dirMap = new Map<string, FolderNode>([['', root]]);

  const sorted = [...items]
    .filter((item) => !shouldSkip(item.path))
    .sort((a, b) => a.path.localeCompare(b.path));

  for (const item of sorted) {
    const parts = item.path.split('/');
    if (parts.length > MAX_TREE_DEPTH + 1) continue;

    let parentPath = '';
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i]!;
      const currentPath = parts.slice(0, i + 1).join('/');
      const isLeaf = i === parts.length - 1;
      const parent = dirMap.get(parentPath);
      if (!parent?.children) break;

      let node = dirMap.get(currentPath);
      if (!node) {
        if (parent.children.length >= MAX_CHILDREN_PER_DIR) {
          if (!parent.children.some((c) => c.name === '…')) {
            parent.children.push({ name: '…', path: `${parentPath}/…`, type: 'file' });
          }
          break;
        }

        const type: FolderNode['type'] =
          isLeaf && item.type === 'blob' ? 'file' : 'dir';
        node = {
          name,
          path: currentPath,
          type,
          ...(type === 'dir' ? { children: [] } : {}),
        };
        parent.children.push(node);
        if (type === 'dir') dirMap.set(currentPath, node);
      }
      parentPath = currentPath;
    }
  }

  return root;
}

/** Paths that look like application source (routes, controllers, etc.). */
export function classifySourcePaths(paths: string[]): {
  routes: string[];
  controllers: string[];
  services: string[];
  middlewares: string[];
  models: string[];
  packageJson: string[];
  readme: string | null;
  openApi: string[];
} {
  const codeExt = /\.(ts|js|tsx|jsx|mjs|cjs)$/i;
  const routes: string[] = [];
  const controllers: string[] = [];
  const services: string[] = [];
  const middlewares: string[] = [];
  const models: string[] = [];
  const packageJson: string[] = [];
  const openApi: string[] = [];
  let readme: string | null = null;

  for (const p of paths) {
    if (shouldSkip(p)) continue;
    const lower = p.toLowerCase();
    const base = lower.split('/').pop() ?? lower;

    if (base === 'package.json') packageJson.push(p);
    if (/^readme(\.md|\.txt)?$/.test(base) && !readme) readme = p;
    if (
      /openapi|swagger/i.test(base) &&
      /\.(ya?ml|json)$/i.test(base)
    ) {
      openApi.push(p);
    }

    if (!codeExt.test(p)) continue;

    if (/(^|\/)(routes?|routers?)(\/|$)|route\./i.test(lower)) routes.push(p);
    else if (/(^|\/)controllers?(\/|$)|controller\./i.test(lower)) controllers.push(p);
    else if (/(^|\/)services?(\/|$)|service\./i.test(lower)) services.push(p);
    else if (/(^|\/)middlewares?(\/|$)|middleware\./i.test(lower)) middlewares.push(p);
    else if (/(^|\/)models?(\/|$)|model\./i.test(lower)) models.push(p);
  }

  return {
    routes: routes.slice(0, 40),
    controllers: controllers.slice(0, 40),
    services: services.slice(0, 40),
    middlewares: middlewares.slice(0, 40),
    models: models.slice(0, 30),
    packageJson: packageJson.slice(0, 8),
    readme,
    openApi: openApi.slice(0, 5),
  };
}
