export const LOGIN_ENCRYPTION_ALGORITHM = 'RSA-OAEP-256+A256GCM' as const;

export type LoginEncryptionKey = {
  algorithm: typeof LOGIN_ENCRYPTION_ALGORITHM;
  keyId: string;
  publicKey: string;
};

export type EncryptedPassword = {
  algorithm: typeof LOGIN_ENCRYPTION_ALGORITHM;
  ciphertext: string;
  encryptedKey: string;
  iv: string;
  keyId: string;
};

const LOGIN_ENCRYPTION_IV_LENGTH = 12;

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

function loginAssociatedData(keyId: string, username: string) {
  return new TextEncoder().encode(`login:v1\n${keyId}\n${username}`);
}

async function encryptPassword(
  password: string,
  username: string,
  encryptionKey: LoginEncryptionKey,
): Promise<EncryptedPassword> {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.subtle) {
    throw new Error('当前浏览器不支持安全登录');
  }
  if (encryptionKey.algorithm !== LOGIN_ENCRYPTION_ALGORITHM) {
    throw new Error('登录加密协议不受支持');
  }

  const publicKey = await cryptoApi.subtle.importKey(
    'spki',
    decodeBase64Url(encryptionKey.publicKey),
    { hash: 'SHA-256', name: 'RSA-OAEP' },
    false,
    ['encrypt'],
  );
  const aesKey = await cryptoApi.subtle.generateKey(
    { length: 256, name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt'],
  );
  const rawAesKey = await cryptoApi.subtle.exportKey('raw', aesKey);
  const iv = cryptoApi.getRandomValues(new Uint8Array(LOGIN_ENCRYPTION_IV_LENGTH));
  const ciphertext = await cryptoApi.subtle.encrypt(
    {
      additionalData: loginAssociatedData(encryptionKey.keyId, username),
      iv,
      name: 'AES-GCM',
    },
    aesKey,
    new TextEncoder().encode(password),
  );
  const encryptedKey = await cryptoApi.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    rawAesKey,
  );

  return {
    algorithm: LOGIN_ENCRYPTION_ALGORITHM,
    ciphertext: encodeBase64Url(ciphertext),
    encryptedKey: encodeBase64Url(encryptedKey),
    iv: encodeBase64Url(iv),
    keyId: encryptionKey.keyId,
  };
}

export { encryptPassword };
