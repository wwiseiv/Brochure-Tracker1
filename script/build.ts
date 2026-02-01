import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";

// Packages that must be external due to dynamic requires, native modules, or ESM issues
const forceExternal = [
  "puppeteer",
  "playwright",
  "openid-client",
  "@anthropic-ai/sdk",
  "@google-cloud/storage",
  "@google/genai",
  "@google/generative-ai",
  "googleapis",
  "google-auth-library",
  "html-pdf-node",
  "mammoth",
  "pdf-parse",
  "cheerio",
  "resend",
  "web-push",
  "docx",
  "exceljs",
  "pdf-lib",
  "handlebars",
  "openai",
  "p-limit",
  "p-retry",
  "memoizee",
  "framer-motion",
];

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  
  // Mark deps as external if they're not in allowlist OR if they're in forceExternal
  const externals = allDeps.filter(
    (dep) => !allowlist.includes(dep) || forceExternal.includes(dep)
  );

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
