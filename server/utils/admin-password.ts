import {
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "node:crypto";

const KEY_LENGTH = 64;
const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const PREFIX = "scrypt";

function deriveKey(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
      maxmem: 64 * 1024 * 1024,
    }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashAdminPassword(password: string) {
  if (password.length < 12) {
    throw new Error("管理员密码至少需要 12 个字符");
  }
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  return [
    PREFIX,
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$");
}

export async function verifyAdminPassword(hash: string, password: string) {
  const [prefix, n, r, p, saltValue, keyValue] = hash.split("$");
  if (
    prefix !== PREFIX
    || Number(n) !== SCRYPT_N
    || Number(r) !== SCRYPT_R
    || Number(p) !== SCRYPT_P
    || !saltValue
    || !keyValue
  ) {
    return false;
  }

  try {
    const expected = Buffer.from(keyValue, "base64url");
    const actual = await deriveKey(password, Buffer.from(saltValue, "base64url"));
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
