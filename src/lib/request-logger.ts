import { createLogger } from "@/lib/logger";

const httpLogger = createLogger("app:http");

export function logRequest(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  requestId?: string,
  userId?: string,
  ip?: string,
): void {
  httpLogger.info("request completed", {
    method,
    path,
    statusCode,
    durationMs,
    ...(requestId ? { requestId } : {}),
    ...(userId ? { userId } : {}),
    ...(ip ? { ip } : {}),
  });
}
