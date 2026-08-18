import { createHmac, createHash } from "node:crypto";

export interface S3Config {
  bucket: string;
  region: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
}

function loadConfig(): S3Config {
  return {
    bucket: process.env.S3_BUCKET ?? "",
    region: process.env.S3_REGION ?? "",
    endpoint: process.env.S3_ENDPOINT ?? "",
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  };
}

export function isS3Configured(): boolean {
  const c = loadConfig();
  return !!(c.bucket && c.region && c.endpoint && c.accessKeyId && c.secretAccessKey);
}

function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

function hmac(key: string | Buffer, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

function hmacHex(key: string | Buffer, data: string): string {
  return createHmac("sha256", key).update(data).digest("hex");
}

function getSignatureKey(secretKey: string, dateStamp: string, region: string, service: string) {
  const kDate = hmac("AWS4" + secretKey, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  return kSigning;
}

function parseEndpoint(endpoint: string): { host: string; protocol: string } {
  const url = new URL(endpoint);
  return { host: url.host, protocol: url.protocol };
}

function toAmzDate(date: Date): { isoDate: string; dateStamp: string } {
  const isoDate = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = isoDate.slice(0, 8);
  return { isoDate, dateStamp };
}

function buildPresignedUrl(
  config: S3Config,
  method: string,
  key: string,
  contentType: string | undefined,
  expiresIn: number,
): { uploadUrl: string; publicUrl: string } {
  const { host, protocol } = parseEndpoint(config.endpoint);
  const service = "s3";
  const now = new Date();
  const { isoDate, dateStamp } = toAmzDate(now);
  const canonicalUri = `/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
  const canonicalQueryString = [
    `X-Amz-Algorithm=AWS4-HMAC-SHA256`,
    `X-Amz-Credential=${encodeURIComponent(config.accessKeyId + "/" + dateStamp + "/" + config.region + "/" + service + "/aws4_request")}`,
    `X-Amz-Date=${isoDate}`,
    `X-Amz-Expires=${expiresIn}`,
    `X-Amz-SignedHeaders=host${contentType ? ";content-type" : ""}`,
  ]
    .sort()
    .join("&");

  const canonicalHeaders = `host:${host}\n${contentType ? "content-type:" + contentType + "\n" : ""}`;
  const signedHeaders = `host${contentType ? ";content-type" : ""}`;
  const payloadHash = method === "GET" ? "UNSIGNED-PAYLOAD" : sha256("");

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${config.region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    isoDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join("\n");

  const signingKey = getSignatureKey(config.secretAccessKey, dateStamp, config.region, service);
  const signature = hmacHex(signingKey, stringToSign);

  const url = new URL(`${protocol}//${host}${canonicalUri}`);
  url.search = canonicalQueryString;
  url.search += `&X-Amz-Signature=${signature}`;

  const publicUrl = `${config.endpoint}/${config.bucket}/${key}`;

  return { uploadUrl: url.toString(), publicUrl };
}

export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 300,
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const config = loadConfig();
  return buildPresignedUrl(config, "PUT", key, contentType, expiresIn);
}

export async function generatePresignedDownloadUrl(
  key: string,
  expiresIn = 300,
): Promise<string> {
  const config = loadConfig();
  const { uploadUrl } = buildPresignedUrl(config, "GET", key, undefined, expiresIn);
  return uploadUrl;
}
