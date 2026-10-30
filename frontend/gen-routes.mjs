import { createServer } from "vite";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const routeTreePath = path.join(root, "src", "routeTree.gen.ts");

// Read before
const before = fs.readFileSync(routeTreePath, "utf8");
console.log("Route tree has /practice before:", before.includes("/practice"));

console.log("Creating Vite server to trigger route tree generation...");
try {
  const server = await createServer();
  console.log("Server created. Route tree should be generated.");

  // Give plugins time to finish
  await new Promise((r) => setTimeout(r, 5000));

  await server.close();
  console.log("Server closed.");
} catch (err) {
  console.error("Error starting Vite:", err.message);
}

// Read after
const after = fs.readFileSync(routeTreePath, "utf8");
console.log("Route tree has /practice after:", after.includes("/practice"));
process.exit(0);
