import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, prune, simplify, textureCompress, weld } from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(root, "public/models/moon-cartographer.glb");
const licensePath = resolve(root, "public/models/moon-cartographer-license.txt");
const sourceUrl = "https://grab3d.com/dl/woman-rigged/woman-rigged.glb";
const licenseText = `Playable character base: Casual Woman (rigged)
Source: https://grab3d.com/models/characters/woman/
Download source: ${sourceUrl}
License: CC0 1.0 (public domain dedication)
Changes: mesh simplified and textures resized/compressed for browser delivery.
This is a third-party base model used as a practical 3D approximation of the Atlas character reference.
`;

async function exists(path) {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (await exists(outputPath) && process.env.FORCE_CHARACTER_REFRESH !== "1") {
    console.log("[character] Optimized model already exists; keeping local cached asset.");
    await writeFile(licensePath, licenseText, "utf8");
    return;
  }

  console.log("[character] Downloading rigged CC0 character base...");
  const response = await fetch(sourceUrl, {
    headers: { "user-agent": "TheAtlasOfUs-build/1.0 (character asset preparation)" },
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    throw new Error(`Character download failed: HTTP ${response.status} ${response.statusText}`);
  }

  const source = new Uint8Array(await response.arrayBuffer());
  if (source.byteLength < 100_000) {
    throw new Error(`Character download looks incomplete (${source.byteLength} bytes).`);
  }
  console.log(`[character] Downloaded ${(source.byteLength / 1024 / 1024).toFixed(2)} MiB; optimizing mesh and textures...`);

  await MeshoptSimplifier.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const document = await io.readBinary(source);
  const beforeTriangles = document.getRoot().listMeshes().reduce((total, mesh) =>
    total + mesh.listPrimitives().reduce((sum, primitive) => {
      const indices = primitive.getIndices();
      const positions = primitive.getAttribute("POSITION");
      const count = indices ? indices.getCount() : positions?.getCount() ?? 0;
      return sum + Math.floor(count / 3);
    }, 0), 0);

  await document.transform(
    dedup(),
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio: 0.22, error: 0.01 }),
    textureCompress({
      encoder: sharp,
      targetFormat: "webp",
      resize: [1024, 1024],
      quality: 82,
      slots: /^(?!normalTexture).*$/,
    }),
    textureCompress({
      encoder: sharp,
      resize: [1024, 1024],
      slots: /normalTexture/,
    }),
    prune(),
  );

  const optimized = await io.writeBinary(document);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, Buffer.from(optimized));
  await writeFile(licensePath, licenseText, "utf8");

  const afterTriangles = document.getRoot().listMeshes().reduce((total, mesh) =>
    total + mesh.listPrimitives().reduce((sum, primitive) => {
      const indices = primitive.getIndices();
      const positions = primitive.getAttribute("POSITION");
      const count = indices ? indices.getCount() : positions?.getCount() ?? 0;
      return sum + Math.floor(count / 3);
    }, 0), 0);
  console.log(`[character] ${beforeTriangles.toLocaleString()} -> ${afterTriangles.toLocaleString()} triangles`);
  console.log(`[character] Wrote ${(optimized.byteLength / 1024 / 1024).toFixed(2)} MiB to public/models/moon-cartographer.glb`);
}

main().catch((error) => {
  console.error("[character] Asset preparation failed:", error);
  process.exitCode = 1;
});
