import { createWriteStream } from "node:fs";
import { access, cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import archiver from "archiver";
import { build, context } from "esbuild";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = resolve(projectRoot, "dist");
const archiveName = "serial-scanner-helper-extension.zip";

const entries = [
  ["src/entrypoints/background.ts", "background.js"],
  ["src/entrypoints/content.ts", "content.js"],
  ["src/popup/main.ts", "popup/popup.js"],
];

const buildOptions = ([entryPoint, outfile]) => ({
  absWorkingDir: projectRoot,
  bundle: true,
  entryPoints: [entryPoint],
  format: "iife",
  legalComments: "none",
  logLevel: "info",
  outfile: resolve(outputDirectory, outfile),
  platform: "browser",
  sourcemap: true,
  target: "es2022",
});

async function copyStaticFiles() {
  await mkdir(resolve(outputDirectory, "popup"), { recursive: true });
  await cp(resolve(projectRoot, "public/manifest.json"), resolve(outputDirectory, "manifest.json"));
  await cp(resolve(projectRoot, "public/assets"), resolve(outputDirectory, "assets"), { recursive: true });
  await cp(await getPatternConfigSource(), resolve(outputDirectory, "serial-pattern.json"));
  await cp(resolve(projectRoot, "src/popup/index.html"), resolve(outputDirectory, "popup/index.html"));
  await cp(resolve(projectRoot, "src/popup/styles.css"), resolve(outputDirectory, "popup/styles.css"));
}

async function getPatternConfigSource() {
  const localPatternPath = resolve(projectRoot, "public/serial-pattern.json");

  try {
    await access(localPatternPath);
    return localPatternPath;
  } catch {
    return resolve(projectRoot, "public/serial-pattern.example.json");
  }
}

async function prepareOutputDirectory() {
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });
  await copyStaticFiles();
}

async function buildOnce() {
  await Promise.all(entries.map((entry) => build(buildOptions(entry))));
  await createExtensionArchive();
}

async function createExtensionArchive() {
  const archivePath = resolve(outputDirectory, archiveName);
  const output = createWriteStream(archivePath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  await new Promise((resolveArchive, rejectArchive) => {
    output.on("close", resolveArchive);
    output.on("error", rejectArchive);
    archive.on("error", rejectArchive);
    archive.pipe(output);
    archive.directory(outputDirectory, false, (entry) => {
      return entry.name === archiveName ? false : entry;
    });
    void archive.finalize();
  });

  console.log(`Created ${archivePath}`);
}

async function watch() {
  const contexts = await Promise.all(entries.map((entry) => context(buildOptions(entry))));
  await Promise.all(contexts.map((buildContext) => buildContext.watch()));
  console.log("Watching extension source files...");
}

await prepareOutputDirectory();

if (process.argv.includes("--watch")) {
  await watch();
} else {
  await buildOnce();
}
