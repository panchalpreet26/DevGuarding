export type AuthSignals = {
  narrative: string;
  mechanisms: string[];
};

const MECHANISM_RULES: Array<{ test: RegExp; label: string }> = [
  { test: /passport|PassportStrategy/i, label: 'Passport.js' },
  { test: /jsonwebtoken|\bjwt\b|JWT_SECRET|sign\(|verify\(/i, label: 'JWT' },
  { test: /oauth|OAuth2|github\.com\/login\/oauth|GITHUB_CLIENT/i, label: 'OAuth' },
  { test: /bcrypt|argon2|scrypt/i, label: 'Password hashing' },
  { test: /session\(|express-session|cookie-session/i, label: 'Session cookies' },
  { test: /helmet\(/i, label: 'Helmet security headers' },
  { test: /cors\(/i, label: 'CORS' },
  { test: /requireAuth|isAuthenticated|authMiddleware|protect\(/i, label: 'Auth middleware guards' },
  { test: /clerk|@clerk/i, label: 'Clerk' },
  { test: /next-auth|NextAuth|Auth\.js/i, label: 'NextAuth / Auth.js' },
  { test: /supabase\.auth|createClient.*auth/i, label: 'Supabase Auth' },
];

/** Infer authentication flow from middleware + auth-related source. */
export function detectAuthFlow(
  files: Map<string, string>,
  middlewarePaths: string[],
  allPaths: string[],
): AuthSignals {
  const mechanisms = new Set<string>();
  const authLikePaths = [
    ...middlewarePaths,
    ...allPaths.filter((p) => /auth|passport|session|jwt|oauth|login/i.test(p)),
  ];

  const relevant = new Map<string, string>();
  for (const [path, content] of files) {
    if (authLikePaths.includes(path) || /auth|passport|jwt|oauth|session/i.test(path)) {
      relevant.set(path, content);
    }
  }

  // Also scan all fetched contents lightly
  for (const content of files.values()) {
    for (const rule of MECHANISM_RULES) {
      if (rule.test.test(content)) mechanisms.add(rule.label);
    }
  }

  const list = [...mechanisms];
  if (list.length === 0) {
    return {
      mechanisms: [],
      narrative:
        'No clear authentication mechanism was detected in routes, controllers, services, or middleware. The project may be unauthenticated, use an external IdP not present in code, or keep auth in a private package.',
    };
  }

  const hasOAuth = list.includes('OAuth');
  const hasJwt = list.includes('JWT');
  const hasPassport = list.includes('Passport.js');
  const hasSession = list.includes('Session cookies');
  const hasGuard = list.includes('Auth middleware guards');

  const steps: string[] = [];
  if (hasOAuth) {
    steps.push(
      'Client is redirected to an OAuth provider (e.g. GitHub); the callback exchanges a code for an access token.',
    );
  }
  if (hasPassport) {
    steps.push('Passport strategies validate the provider profile and attach the user to the request.');
  }
  if (hasJwt) {
    steps.push(
      'A signed JWT (or similar bearer token) is issued and expected on subsequent API calls via Authorization header or cookie.',
    );
  }
  if (hasSession) {
    steps.push('Server-side sessions persist login state, typically via an httpOnly cookie.');
  }
  if (hasGuard) {
    steps.push('Protected routes run auth middleware that rejects unauthenticated requests.');
  }
  if (!steps.length) {
    steps.push(`Detected mechanisms: ${list.join(', ')}.`);
  }

  return {
    mechanisms: list,
    narrative: steps.join(' '),
  };
}
