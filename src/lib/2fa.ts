import { createHmac, randomBytes } from "node:crypto";

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buffer: Buffer): string {
  let bits = "";
  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, "0");
  }
  let result = "";
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, "0");
    result += BASE32_CHARS[parseInt(chunk, 2)];
  }
  return result;
}

function base32Decode(input: string): Buffer {
  const cleaned = input.replace(/=+$/, "").toUpperCase();
  let bits = "";
  for (const char of cleaned) {
    const val = BASE32_CHARS.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  return Buffer.from(bytes);
}

function generateTOTP(secret: Buffer, timeStep: number, digits = 6): string {
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeUInt32BE(0, 0);
  timeBuffer.writeUInt32BE(timeStep, 4);

  const hmac = createHmac("sha1", secret).update(timeBuffer).digest();

  const offset = hmac[hmac.length - 1]! & 0x0f;
  const code =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);

  const otp = code % Math.pow(10, digits);
  return otp.toString().padStart(digits, "0");
}

function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 8; i++) {
    const bytes = randomBytes(4);
    const code = (bytes.readUInt32BE(0) % 1000000).toString().padStart(6, "0");
    const formatted = `${code.slice(0, 3)}-${code.slice(3)}`;
    codes.push(formatted);
  }
  return codes;
}

export interface TwoFactorSetup {
  secret: string;
  otpauthUrl: string;
  backupCodes: string[];
  qrCodeUrl: string;
}

export function generateTwoFactorSecret(email: string): TwoFactorSetup {
  const secretBytes = randomBytes(20);
  const secret = base32Encode(secretBytes);

  const issuer = "CareerPilot";
  const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(otpauthUrl)}&size=200x200&margin=10`;

  const backupCodes = generateBackupCodes();

  return { secret, otpauthUrl, backupCodes, qrCodeUrl };
}

export function verifyTwoFactorToken(secret: string, token: string): boolean {
  const secretBuffer = base32Decode(secret);
  const now = Math.floor(Date.now() / 1000);
  const timeStep = Math.floor(now / 30);

  for (const offset of [-1, 0, 1]) {
    const expected = generateTOTP(secretBuffer, timeStep + offset);
    if (expected === token.replace(/\s/g, "")) {
      return true;
    }
  }
  return false;
}

export function verifyBackupCode(backupCodes: string[], code: string): { valid: boolean; remaining: string[] } {
  const normalized = code.replace(/\s/g, "").toLowerCase();
  const index = backupCodes.findIndex((c) => c.replace(/-/g, "").toLowerCase() === normalized.replace(/-/g, ""));
  if (index === -1) {
    return { valid: false, remaining: backupCodes };
  }
  const remaining = [...backupCodes];
  remaining.splice(index, 1);
  return { valid: true, remaining };
}
