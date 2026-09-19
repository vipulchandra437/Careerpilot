import { writeFileSync } from "node:fs";

const base = process.argv[2] || "http://127.0.0.1:8081";
const out = [];
for (const path of ["/", "/assets/", "/__grok/manifest.webmanifest"]) {
  const res = await fetch(`${base.replace(/\/$/, "")}${path}`).catch((e) => ({
    status: 0,
    text: async () => `FETCH_ERROR: ${e.message}`,
    headers: new Headers(),
  }));
  const body = await res.text();
  out.push({
    path,
    status: res.status,
    contentType: res.headers.get("content-type"),
    length: body.length,
    head: body.slice(0, 600),
  });
}
writeFileSync("preview_probe.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out.map((o) => `${o.status} ${o.path} ${o.contentType} len=${o.length}`), null, 2));
