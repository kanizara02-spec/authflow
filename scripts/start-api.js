const path = require("path");
const fs = require("fs");

console.log(`[start-api.js] process.cwd(): ${process.cwd()}`);
console.log(`[start-api.js] __dirname: ${__dirname}`);

const candidatePaths = [
  path.resolve(process.cwd(), "apps/api/dist/index.js"),
  path.resolve(process.cwd(), "apps/api/dist/apps/api/src/index.js"),
  path.resolve(process.cwd(), "apps/api/dist/src/index.js"),
  path.resolve(process.cwd(), "dist/index.js"),
  path.resolve(process.cwd(), "dist/apps/api/src/index.js"),
  path.resolve(__dirname, "../apps/api/dist/index.js"),
  path.resolve(__dirname, "../apps/api/dist/apps/api/src/index.js"),
  path.resolve(__dirname, "../dist/index.js"),
];

console.log("[start-api.js] Checking candidate entrypoint paths:");
let target = null;

for (const p of candidatePaths) {
  const exists = fs.existsSync(p);
  console.log(`  - ${p} => ${exists ? "EXISTS" : "NOT FOUND"}`);
  if (exists && !target) {
    target = p;
  }
}

if (!target) {
  console.error("[start-api.js] Entrypoint not found in candidate paths. Performing recursive search...");
  
  function searchIndexFiles(dir, maxDepth = 5, depth = 0) {
    if (depth > maxDepth || !fs.existsSync(dir)) return [];
    let results = [];
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        if (item.name === "node_modules" || item.name === ".git") continue;
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          results = results.concat(searchIndexFiles(fullPath, maxDepth, depth + 1));
        } else if (item.name === "index.js") {
          results.push(fullPath);
        }
      }
    } catch (err) {
      console.error(`  Error reading ${dir}: ${err.message}`);
    }
    return results;
  }

  const rootDir = fs.existsSync("/app") ? "/app" : process.cwd();
  const discovered = searchIndexFiles(rootDir);
  console.log(`[start-api.js] Recursive search under ${rootDir} found index.js files:`);
  for (const f of discovered) {
    console.log(`  found: ${f}`);
    if (!target && f.includes("dist")) {
      target = f;
    }
  }
}

if (!target) {
  console.error("FATAL: Could not locate compiled index.js anywhere in filesystem.");
  process.exit(1);
}

console.log(`Starting AuthFlow API from entrypoint: ${target}`);
require(target);
