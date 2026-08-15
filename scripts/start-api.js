const path = require("path");
const fs = require("fs");

const possiblePaths = [
  path.resolve(process.cwd(), "apps/api/dist/index.js"),
  path.resolve(process.cwd(), "dist/index.js"),
  path.resolve(__dirname, "../apps/api/dist/index.js"),
  path.resolve(__dirname, "../dist/index.js"),
];

const target = possiblePaths.find((p) => fs.existsSync(p));

if (!target) {
  console.error("FATAL: Could not locate compiled dist/index.js. Checked paths:", possiblePaths);
  process.exit(1);
}

console.log(`Starting AuthFlow API from: ${target}`);
require(target);
