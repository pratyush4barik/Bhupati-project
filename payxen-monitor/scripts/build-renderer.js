/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const esbuild = require("esbuild");

const rootDir = path.join(__dirname, "..");
const sourceDir = path.join(rootDir, "src", "renderer");
const outputDir = path.join(rootDir, "dist", "renderer");

async function buildRenderer() {
  fs.mkdirSync(outputDir, { recursive: true });

  await esbuild.build({
    entryPoints: {
      home: path.join(sourceDir, "pages", "home.tsx"),
      authentication: path.join(sourceDir, "pages", "authentication.tsx"),
      usage: path.join(sourceDir, "pages", "usage.tsx"),
      settings: path.join(sourceDir, "pages", "settings.tsx"),
    },
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    outdir: outputDir,
    sourcemap: false,
    logLevel: "info",
  });

  const staticFiles = [
    "index.html",
    "home.html",
    "authentication.html",
    "usage.html",
    "settings.html",
    "renderer.css",
  ];

  for (const file of staticFiles) {
    fs.copyFileSync(path.join(sourceDir, file), path.join(outputDir, file));
  }
}

buildRenderer().catch((error) => {
  console.error(error);
  process.exit(1);
});
