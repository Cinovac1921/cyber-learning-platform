export interface MailConfig {
  /** Empty while developing: messages are then printed in the terminal instead of sent. */
  host: string | null;
  port: number;
  user: string | null;
  pass: string | null;
  from: string;
  /** Public address of the frontend, without a trailing slash. */
  appUrl: string;
  production: boolean;
}

export function readMailConfig(env: NodeJS.ProcessEnv = process.env): MailConfig {
  const host = env.SMTP_HOST?.trim() || null;
  const port = Number(env.SMTP_PORT) || 587;
  const appUrl = (env.APP_URL ?? env.FRONTEND_ORIGIN ?? 'http://localhost:5173').replace(/\/+$/, '');

  return {
    host,
    port,
    user: env.SMTP_USER?.trim() || null,
    pass: env.SMTP_PASS || null,
    from: env.MAIL_FROM?.trim() || 'Cyber Learning <no-reply@localhost>',
    appUrl,
    production: env.NODE_ENV === 'production',
  };
}
