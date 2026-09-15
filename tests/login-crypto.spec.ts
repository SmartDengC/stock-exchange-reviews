// @vitest-environment node

import { Buffer } from 'node:buffer';
import { webcrypto } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  encryptPassword,
  LOGIN_ENCRYPTION_ALGORITHM,
  type LoginEncryptionKey,
} from '#/api/login-crypto';

const cryptoApi = webcrypto;

function encodeBase64Url(value: ArrayBuffer) {
  return Buffer.from(value).toString('base64url');
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, 'base64url');
}

describe('login password encryption', () => {
  it('round-trips through RSA-OAEP and AES-GCM without exposing plaintext', async () => {
    const keyPair = await cryptoApi.subtle.generateKey(
      {
        hash: 'SHA-256',
        modulusLength: 3072,
        name: 'RSA-OAEP',
        publicExponent: new Uint8Array([1, 0, 1]),
      },
      true,
      ['encrypt', 'decrypt'],
    );
    const publicDer = await cryptoApi.subtle.exportKey('spki', keyPair.publicKey);
    const encryptionKey: LoginEncryptionKey = {
      algorithm: LOGIN_ENCRYPTION_ALGORITHM,
      keyId: 'a'.repeat(64),
      publicKey: encodeBase64Url(publicDer),
    };
    const username = 'admin';
    const password = 'secret密码';

    const encrypted = await encryptPassword(password, username, encryptionKey);
    const encryptedAesKey = await cryptoApi.subtle.decrypt(
      { name: 'RSA-OAEP' },
      keyPair.privateKey,
      decodeBase64Url(encrypted.encryptedKey),
    );
    const aesKey = await cryptoApi.subtle.importKey(
      'raw',
      encryptedAesKey,
      { name: 'AES-GCM' },
      false,
      ['decrypt'],
    );
    const plaintext = await cryptoApi.subtle.decrypt(
      {
        additionalData: new TextEncoder().encode(`login:v1\n${encryptionKey.keyId}\n${username}`),
        iv: decodeBase64Url(encrypted.iv),
        name: 'AES-GCM',
      },
      aesKey,
      decodeBase64Url(encrypted.ciphertext),
    );

    expect(new TextDecoder().decode(plaintext)).toBe(password);
    expect(JSON.stringify(encrypted)).not.toContain(password);
  });

  it('uses fresh random encryption values for each submission', async () => {
    const keyPair = await cryptoApi.subtle.generateKey(
      {
        hash: 'SHA-256',
        modulusLength: 3072,
        name: 'RSA-OAEP',
        publicExponent: new Uint8Array([1, 0, 1]),
      },
      true,
      ['encrypt', 'decrypt'],
    );
    const publicDer = await cryptoApi.subtle.exportKey('spki', keyPair.publicKey);
    const encryptionKey: LoginEncryptionKey = {
      algorithm: LOGIN_ENCRYPTION_ALGORITHM,
      keyId: 'b'.repeat(64),
      publicKey: encodeBase64Url(publicDer),
    };

    const first = await encryptPassword('secret', 'admin', encryptionKey);
    const second = await encryptPassword('secret', 'admin', encryptionKey);

    expect(first.iv).not.toBe(second.iv);
    expect(first.encryptedKey).not.toBe(second.encryptedKey);
    expect(first.ciphertext).not.toBe(second.ciphertext);
  });
});
