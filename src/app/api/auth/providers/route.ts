import { apiOk } from "@/lib/api";

export const runtime = "nodejs";

export async function GET() {
  return apiOk({
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    github: !!(process.env.GITHUB_ID && process.env.GITHUB_SECRET),
  });
}
