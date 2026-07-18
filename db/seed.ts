import { seedDemoUser } from "@/lib/seed";

// Wrapped in an async function rather than using top-level await: this
// project's package.json has no `"type": "module"`, so tsx/esbuild compiles
// db/seed.ts to CommonJS, which does not support top-level await.
async function main(): Promise<void> {
  const email = process.env.DEMO_EMAIL ?? "demo@snip.example";
  const password = process.env.DEMO_PASSWORD;

  if (!password) {
    console.error("DEMO_PASSWORD is not set — refusing to seed a guessable demo account.");
    process.exit(1);
  }

  await seedDemoUser(email, password);
  console.log(`Seeded demo user: ${email}`);
  process.exit(0);
}

void main();
