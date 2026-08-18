type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  [key: string]: unknown;
}

function emit(entry: LogEntry, level: LogLevel): void {
  const json = JSON.stringify(entry);
  if (level === "warn" || level === "error") {
    console.error(json);
  } else {
    console.log(json);
  }
}

function log(
  service: string,
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>,
  error?: unknown,
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service,
    ...meta,
  };
  if (error instanceof Error) {
    entry.error = { name: error.name, message: error.message, stack: error.stack };
  } else if (error !== undefined) {
    entry.error = error;
  }
  emit(entry, level);
}

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>, error?: unknown): void;
  child(subService: string): Logger;
}

export function createLogger(service: string): Logger {
  return {
    debug: (message, meta) => log(service, "debug", message, meta),
    info: (message, meta) => log(service, "info", message, meta),
    warn: (message, meta) => log(service, "warn", message, meta),
    error: (message, meta, error) => log(service, "error", message, meta, error),
    child: (subService) => createLogger(`${service}:${subService}`),
  };
}

export const logger = createLogger("app");
