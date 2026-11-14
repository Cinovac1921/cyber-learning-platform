import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client';
import { ROLES, type RoleValue } from '../src/auth/roles';

/**
 * Sets an account's role from the command line. This is how the very first
 * admin is made, and the way back in if the last admin is ever lost.
 *
 *   npm run role:set -- you@example.com ADMIN
 */
const [rawEmail, rawRole] = process.argv.slice(2);
const role = rawRole?.toUpperCase() as RoleValue | undefined;

if (!rawEmail || !role || !ROLES.includes(role)) {
  console.error(`Usage: npm run role:set -- <email> <${ROLES.join('|')}>`);
  process.exit(1);
}

const url = new URL(process.env.DATABASE_URL ?? '');
const prisma = new PrismaClient({
  adapter: new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port) || 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    connectionLimit: 2,
  }),
});

async function main() {
  const email = rawEmail.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No account with the email ${email}. Register it first.`);
    process.exitCode = 1;
    return;
  }
  await prisma.user.update({ where: { id: user.id }, data: { role } });
  console.log(`${user.email}: ${user.role} -> ${role}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
