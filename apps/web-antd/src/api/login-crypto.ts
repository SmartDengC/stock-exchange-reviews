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

async function encryptPassword(
  password: string,
  encryptionKey: LoginEncryptionKey,
): Promise<EncryptedPassword> {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.subtle) {
    throw new Error('当前浏览器不支持安全登录');
  }
  if (encryptionKey.algorithm !== LOGIN_ENCRYPTION_ALGORITHM) {
    throw new Error('登录加密协议不受支持');
  }
  const passwordBytes = new TextEncoder().encode(password);
  if (passwordBytes.length > LOGIN_PASSWORD_MAX_BYTES) {
    throw new Error(`密码过长，最多支持 ${LOGIN_PASSWORD_MAX_BYTES} 个 UTF-8 字节`);
  }

  const publicKey = await cryptoApi.subtle.importKey(
    'spki',
    decodeBase64Url(encryptionKey.publicKey),
    { hash: 'SHA-256', name: 'RSA-OAEP' },
    false,
    ['encrypt'],
  );
  const ciphertext = await cryptoApi.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    passwordBytes,
  );

  return {
    ciphertext: encodeBase64Url(ciphertext),
    keyId: encryptionKey.keyId,
  };
}

export { encryptPassword };
