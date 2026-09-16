// @vitest-environment node

import { Buffer } from 'node:buffer';
import { webcrypto } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

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
  it('works on an HTTP page without depending on Web Crypto subtle APIs', async () => {
    vi.stubGlobal('isSecureContext', false);

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
    const encrypted = await encryptPassword('secret', {
      algorithm: LOGIN_ENCRYPTION_ALGORITHM,
      keyId: 'a'.repeat(64),
      publicKey: encodeBase64Url(publicDer),
    });
    const plaintext = await cryptoApi.subtle.decrypt(
      { name: 'RSA-OAEP' },
      keyPair.privateKey,
      decodeBase64Url(encrypted.ciphertext),
    );

    expect(new TextDecoder().decode(plaintext)).toBe('secret');
    vi.unstubAllGlobals();
  });

  it('round-trips through direct RSA-OAEP without exposing plaintext', async () => {
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

    const encrypted = await encryptPassword(password, encryptionKey);
    const plaintext = await cryptoApi.subtle.decrypt(
      { name: 'RSA-OAEP' },
      keyPair.privateKey,
      decodeBase64Url(encrypted.ciphertext),
    );

    expect(new TextDecoder().decode(plaintext)).toBe(password);
    expect(JSON.stringify(encrypted)).not.toContain(password);
    expect(encrypted.keyId).toBe(encryptionKey.keyId);
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

    const first = await encryptPassword('secret', encryptionKey);
    const second = await encryptPassword('secret', encryptionKey);

    expect(first.ciphertext).not.toBe(second.ciphertext);
  });

  it('rejects passwords longer than the RSA plaintext limit', async () => {
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
      keyId: 'c'.repeat(64),
      publicKey: encodeBase64Url(publicDer),
    };

    await expect(encryptPassword('a'.repeat(319), encryptionKey)).rejects.toThrow(
      '密码过长',
    );
  });
});
