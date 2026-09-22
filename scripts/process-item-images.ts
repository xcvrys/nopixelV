import { mkdir, readdir, rm } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import sharp from "sharp";

const projectRoot = resolve(import.meta.dirname, "..");
const sourceDirectory = join(projectRoot, "assets/items");
const outputDirectory = join(projectRoot, "static/images/items");
const temporaryDirectory = join(projectRoot, ".tmp/item-images");
const supportedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const rembgScript = [
  "from pathlib import Path",
  "from rembg import new_session, remove",
  "import sys",
  "session = new_session('u2netp')",
  "input_path, output_path = sys.argv[1:3]",
  "Path(output_path).write_bytes(remove(Path(input_path).read_bytes(), session=session))",
].join("\n");

function slugify(filename: string): string {
  return basename(filename, extname(filename))
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function removeBackground(inputPath: string, outputPath: string): Promise<void> {
  const process = Bun.spawn(["python3", "-c", rembgScript, inputPath, outputPath], {
    stderr: "pipe",
    stdout: "pipe",
  });
  const exitCode = await process.exited;

  if (exitCode !== 0) {
    const error = await new Response(process.stderr).text();
    throw new Error(error.trim() || "rembg failed. Verify Python and the rembg installation.");
  }
}

async function processImage(filename: string): Promise<void> {
  const inputPath = join(sourceDirectory, filename);
  const slug = slugify(filename);
  const temporaryPath = join(temporaryDirectory, `${slug}.png`);
  const outputPath = join(outputDirectory, `${slug}.webp`);

  if (!slug) throw new Error(`Could not derive a filename from ${filename}`);

  await removeBackground(inputPath, temporaryPath);
  await sharp(temporaryPath).webp({ alphaQuality: 100, effort: 6, quality: 90 }).toFile(outputPath);

  console.log(`${filename} -> static/images/items/${slug}.webp`);
}

const entries = await readdir(sourceDirectory, { withFileTypes: true });
const sourceFiles = entries
  .filter((entry) => entry.isFile() && supportedExtensions.has(extname(entry.name).toLowerCase()))
  .map((entry) => entry.name)
  .sort();

if (sourceFiles.length === 0) {
  console.log(`No source images found in ${sourceDirectory}`);
  process.exit(0);
}

await mkdir(outputDirectory, { recursive: true });
await mkdir(temporaryDirectory, { recursive: true });

try {
  for (const filename of sourceFiles) {
    // eslint-disable-next-line no-await-in-loop -- rembg is memory-heavy; keep one model process active.
    await processImage(filename);
  }
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

console.log(`Processed ${sourceFiles.length} item image${sourceFiles.length === 1 ? "" : "s"}.`);
