import { execSync } from "node:child_process";

export default function globalSetup() {
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
  execSync("npm run seed", { stdio: "inherit" });
}
