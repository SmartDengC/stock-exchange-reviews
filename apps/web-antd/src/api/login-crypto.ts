/* eslint-disable unicorn/no-for-loop, unicorn/number-literal-case, unicorn/numeric-separators-style, unicorn/prefer-bigint-literals, unicorn/prefer-spread */

export const LOGIN_ENCRYPTION_ALGORITHM = 'RSA-OAEP-256' as const;
export const LOGIN_PASSWORD_MAX_BYTES = 318;

export type LoginEncryptionKey = {
  algorithm: typeof LOGIN_ENCRYPTION_ALGORITHM;
  keyId: string;
  publicKey: string;
};

export type EncryptedPassword = {
  ciphertext: string;
  keyId: string;
};

function encodeBase64Url(value: ArrayBuffer | Uint8Array<ArrayBufferLike>) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCodePoint(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function decodeBase64Url(value: string) {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const binary = atob(normalized + '='.repeat((4 - (normalized.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.codePointAt(index) ?? 0;
  }
  return bytes;
}

function sha256(message: Uint8Array): Uint8Array {
  const roundConstants = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b,
    0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01,
    0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7,
    0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
    0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152,
    0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
    0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
    0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08,
    0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f,
    0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const bitLength = message.length * 8;
  const padded = new Uint8Array(((message.length + 9 + 63) >> 6) << 6);
  padded.set(message);
  padded[message.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 4, bitLength >>> 0);
  view.setUint32(padded.length - 8, Math.floor(bitLength / 2 ** 32));

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;
  const rotateRight = (value: number, amount: number) => (value >>> amount) | (value << (32 - amount));

  for (let offset = 0; offset < padded.length; offset += 64) {
    const words = new Uint32Array(64);
    for (let index = 0; index < 16; index += 1) words[index] = view.getUint32(offset + index * 4);
    for (let index = 16; index < 64; index += 1) {
      const value = words[index - 15] ?? 0;
      const smallSigma0 = rotateRight(value, 7) ^ rotateRight(value, 18) ^ (value >>> 3);
      const previous = words[index - 2] ?? 0;
      const smallSigma1 = rotateRight(previous, 17) ^ rotateRight(previous, 19) ^ (previous >>> 10);
      words[index] = ((words[index - 16] ?? 0) + smallSigma0 + (words[index - 7] ?? 0) + smallSigma1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;
    for (let index = 0; index < 64; index += 1) {
      const bigSigma1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temporary1 = (h + bigSigma1 + choice + (roundConstants[index] ?? 0) + (words[index] ?? 0)) >>> 0;
      const bigSigma0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temporary2 = (bigSigma0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temporary1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temporary1 + temporary2) >>> 0;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const digest = new Uint8Array(32);
  const output = new DataView(digest.buffer);
  [h0, h1, h2, h3, h4, h5, h6, h7].forEach((value, index) => output.setUint32(index * 4, value));
  return digest;
}

function concatenate(...values: Uint8Array[]) {
  const result = new Uint8Array(values.reduce((length, value) => length + value.length, 0));
  let offset = 0;
  for (const value of values) {
    result.set(value, offset);
    offset += value.length;
  }
  return result;
}

function maskGeneration(seed: Uint8Array, length: number) {
  const output = new Uint8Array(length);
  for (let counter = 0, offset = 0; offset < length; counter += 1) {
    const counterBytes = new Uint8Array(4);
    new DataView(counterBytes.buffer).setUint32(0, counter);
    const digest = sha256(concatenate(seed, counterBytes));
    output.set(digest.subarray(0, Math.min(digest.length, length - offset)), offset);
    offset += digest.length;
  }
  return output;
}

function readDerLength(bytes: Uint8Array, offset: number) {
  const first = bytes[offset];
  if (first === undefined) throw new Error('登录公钥格式错误');
  if ((first & 0x80) === 0) return { length: first, offset: offset + 1 };
  const count = first & 0x7f;
  let length = 0;
  for (let index = 0; index < count; index += 1) length = length * 256 + (bytes[offset + 1 + index] ?? 0);
  return { length, offset: offset + 1 + count };
}

function readDerElement(bytes: Uint8Array, offset: number, tag: number) {
  if (bytes[offset] !== tag) throw new Error('登录公钥格式错误');
  const header = readDerLength(bytes, offset + 1);
  return { data: bytes.subarray(header.offset, header.offset + header.length), next: header.offset + header.length };
}

function parsePublicKey(publicKey: Uint8Array) {
  const outer = readDerElement(publicKey, 0, 0x30);
  const algorithm = readDerElement(outer.data, 0, 0x30);
  const bitString = readDerElement(outer.data, algorithm.next, 0x03);
  const rsaPublicKey = readDerElement(bitString.data.subarray(1), 0, 0x30);
  const modulusElement = readDerElement(rsaPublicKey.data, 0, 0x02);
  const modulus = modulusElement.data[0] === 0 ? modulusElement.data.subarray(1) : modulusElement.data;
  const exponent = readDerElement(rsaPublicKey.data, modulusElement.next, 0x02).data;
  const toBigInt = (value: Uint8Array) => BigInt(`0x${Array.from(value).map((byte) => byte.toString(16).padStart(2, '0')).join('')}`);
  return { exponent: toBigInt(exponent), modulus: toBigInt(modulus), size: modulus.length };
}

function modularExponentiation(base: bigint, exponent: bigint, modulus: bigint) {
  let result = BigInt(1);
  let value = base;
  let power = exponent;
  while (power > BigInt(0)) {
    if (power & BigInt(1)) result = (result * value) % modulus;
    value = (value * value) % modulus;
    power >>= BigInt(1);
  }
  return result;
}

function toFixedBytes(value: bigint, length: number) {
  const bytes = new Uint8Array(length);
  for (let index = length - 1; index >= 0; index -= 1) {
    bytes[index] = Number(value & BigInt(255));
    value >>= BigInt(8);
  }
  return bytes;
}

function rsaOaepSha256(password: Uint8Array, publicKey: Uint8Array) {
  if (typeof BigInt === 'undefined') throw new Error('当前浏览器不支持安全登录');
  const { exponent, modulus, size } = parsePublicKey(publicKey);
  const hashLength = 32;
  if (password.length > size - 2 * hashLength - 2) throw new Error('密码过长，超过 RSA 加密限制');
  const random = globalThis.crypto?.getRandomValues;
  if (!random) throw new Error('当前浏览器不支持安全登录');
  const seed = new Uint8Array(hashLength);
  random.call(globalThis.crypto, seed);
  const labelHash = sha256(new Uint8Array());
  const padding = new Uint8Array(size - password.length - 2 * hashLength - 2);
  const dataBlock = concatenate(labelHash, padding, new Uint8Array([1]), password);
  const dataMask = maskGeneration(seed, dataBlock.length);
  const maskedDataBlock = new Uint8Array(dataBlock.length);
  for (let index = 0; index < dataBlock.length; index += 1) {
    maskedDataBlock[index] = (dataBlock[index] ?? 0) ^ (dataMask[index] ?? 0);
  }
  const seedMask = maskGeneration(maskedDataBlock, hashLength);
  const maskedSeed = new Uint8Array(hashLength);
  for (let index = 0; index < hashLength; index += 1) {
    maskedSeed[index] = (seed[index] ?? 0) ^ (seedMask[index] ?? 0);
  }
  const encodedMessage = concatenate(new Uint8Array([0]), maskedSeed, maskedDataBlock);
  const message = BigInt(`0x${Array.from(encodedMessage).map((byte) => byte.toString(16).padStart(2, '0')).join('')}`);
  return toFixedBytes(modularExponentiation(message, exponent, modulus), size);
}

async function encryptPassword(
  password: string,
  encryptionKey: LoginEncryptionKey,
): Promise<EncryptedPassword> {
  if (encryptionKey.algorithm !== LOGIN_ENCRYPTION_ALGORITHM) {
    throw new Error('登录加密协议不受支持');
  }
  const passwordBytes = new TextEncoder().encode(password);
  if (passwordBytes.length > LOGIN_PASSWORD_MAX_BYTES) {
    throw new Error(`密码过长，最多支持 ${LOGIN_PASSWORD_MAX_BYTES} 个 UTF-8 字节`);
  }

  const ciphertext = rsaOaepSha256(passwordBytes, decodeBase64Url(encryptionKey.publicKey));

  return {
    ciphertext: encodeBase64Url(ciphertext),
    keyId: encryptionKey.keyId,
  };
}

export { encryptPassword };
