const fs = require("fs");
const path = require("path");

const required = [
  "frontend/package.json",
  "frontend/vite.config.js",
  "frontend/index.html",
  "frontend/src/main.jsx",
  "frontend/src/app/App.jsx",
  "frontend/src/scene/JarvisScene.jsx",
  "functions/package.json",
  "functions/index.js",
  "firebase.json"
];

let failed = false;

for (const file of required) {
  const fullPath = path.resolve(file);

  if (!fs.existsSync(fullPath)) {
    console.error(`MISSING: ${file}`);
    failed = true;
  } else {
    console.log(`OK: ${file}`);
  }
}

if (failed) {
  process.exit(1);
}

console.log("JARV-IA structure validated.");
