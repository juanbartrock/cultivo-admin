import path from 'node:path';

/** Etiqueta del recorrido: agrupa las capturas de una corrida (fase0, fase1, ...). */
export const LABEL = process.env.QA_LABEL || 'fase0';

/** Carpeta de capturas de esta corrida. */
export const SHOTS_DIR = path.resolve(
  __dirname,
  '..',
  '..',
  'docs',
  'rediseno-2026-09',
  'capturas',
  LABEL,
);

/** Estado de sesión que produce qa-nav.setup.ts y consumen los proyectos de qa-nav.spec.ts. */
export const AUTH_STATE_PATH = path.resolve(__dirname, '..', 'test-results', '.auth', 'qa-state.json');

export const CREDENTIALS_HELP =
  'Faltan CULTIVO_ADMIN_USER y/o CULTIVO_ADMIN_PASSWORD. Cargalas antes de correr el QA:\n' +
  '  set -a; . /home/deploy/.config/secrets/cultivo-admin-login.env; set +a';

export function credentials(): { user: string; password: string } | null {
  const user = process.env.CULTIVO_ADMIN_USER;
  const password = process.env.CULTIVO_ADMIN_PASSWORD;
  if (!user || !password) return null;
  return { user, password };
}
