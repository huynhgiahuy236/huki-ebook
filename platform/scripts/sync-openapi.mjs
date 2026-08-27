import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const checkOnly = process.argv.includes("--check");
const gatewayUrl =
  process.env.OPENAPI_GATEWAY_URL || "http://localhost:3000/api/openapi.json";
const outputPath = resolve(
  process.cwd(),
  "../res/openapi/huki-ebook-openapi.generated.json",
);

function sortDeep(value) {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, sortDeep(child)]),
  );
}

const response = await fetch(gatewayUrl, {
  signal: AbortSignal.timeout(15_000),
});
if (!response.ok) {
  throw new Error(
    `Cannot fetch OpenAPI from ${gatewayUrl}: HTTP ${response.status}`,
  );
}

const document = await response.json();
const serialized = `${JSON.stringify(sortDeep(document), null, 2)}\n`;
const operationCount = Object.values(document.paths || {}).reduce(
  (total, pathItem) =>
    total +
    Object.keys(pathItem).filter((key) =>
      ["get", "post", "put", "patch", "delete", "options", "head"].includes(
        key,
      ),
    ).length,
  0,
);

if (checkOnly) {
  let current = "";
  try {
    current = await readFile(outputPath, "utf8");
  } catch {
    throw new Error(
      `Generated OpenAPI is missing: ${outputPath}. Run npm run openapi:sync.`,
    );
  }
  if (current !== serialized) {
    throw new Error(
      "Generated OpenAPI is stale. Run npm run openapi:sync and commit the result.",
    );
  }
  console.log(`OpenAPI is current: ${operationCount} HTTP operations.`);
} else {
  await writeFile(outputPath, serialized, "utf8");
  console.log(`Wrote ${operationCount} HTTP operations to ${outputPath}`);
}
