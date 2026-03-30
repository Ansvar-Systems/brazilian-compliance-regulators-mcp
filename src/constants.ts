import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const SERVER_NAME = "brazilian-compliance-regulators-mcp";

let _pkgVersion = "0.1.0";
try {
  const pkg = JSON.parse(
    readFileSync(join(__dirname, "..", "package.json"), "utf8"),
  ) as { version: string };
  _pkgVersion = pkg.version;
} catch {
  // fallback to default
}

export const pkgVersion = _pkgVersion;
