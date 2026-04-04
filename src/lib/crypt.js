// lib/crypt.js
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import CryptoJS from 'crypto-js';

const CryptoJSAesJson = {
    stringify: (cipherParams) => {
        try {
            const j = { ct: cipherParams.ciphertext.toString(CryptoJS.enc.Base64) };
            if (cipherParams.iv) j.iv = cipherParams.iv.toString();
            if (cipherParams.salt) j.s = cipherParams.salt.toString();
            return JSON.stringify(j);
        } catch (_error) {
            return null;
        }
    },
    parse: (jsonStr) => {
        try {
            if (!isValidJson(jsonStr)) return null;
            const j = JSON.parse(jsonStr);
            const cipherParams = CryptoJS.lib.CipherParams.create({
                ciphertext: CryptoJS.enc.Base64.parse(j.ct)
            });
            if (j.iv) cipherParams.iv = CryptoJS.enc.Hex.parse(j.iv);
            if (j.s) cipherParams.salt = CryptoJS.enc.Hex.parse(j.s);
            return cipherParams;
        } catch (_error) {
            return null;
        }
    }
};

function isValidJson(str) {
    if (typeof str !== 'string') return false;
    try {
        JSON.parse(str);
        return true;
    } catch {
        return false;
    }
}

export const encryptHash = (password, key) => {
    if (!key) {
        return null;
    }
    try {
        return CryptoJS.AES.encrypt(JSON.stringify(password), key, {
            format: CryptoJSAesJson
        }).toString();
    } catch (error) {
        throw new Error(`Encryption error: ${error}`);
    }
};

export const decryptHash = (encryptedPassword, key) => {
    if (!key) {
        return null;
    }
    try {
        const decrypted = CryptoJS.AES.decrypt(encryptedPassword, key, {
            format: CryptoJSAesJson
        }).toString(CryptoJS.enc.Utf8);

        if (!decrypted) {
            throw new Error('Decryption failed');
        }

        return JSON.parse(decrypted);
    } catch (error) {
        throw new Error(`Decryption error: ${error}`);
    }
};

const scryptAsync = promisify(scrypt);

// Encrypt password with salt
export async function encryptPassword(password, salt = null) {
    if (!salt) {
        salt = process.env.NEXTAUTH_SECRET || 'your-default-secret-key';
    }
    const hash = await scryptAsync(password.normalize(), salt, 64);
    return hash.toString('hex').normalize();
}

// Validate password
export async function validatePassword(password, salt, hashedPassword) {
    const inputHash = await scryptAsync(password.normalize(), salt, 64);
    const inputHashHex = inputHash.toString('hex').normalize();

    // Secure compare
    return timingSafeEqual(Buffer.from(inputHashHex, 'hex'), Buffer.from(hashedPassword, 'hex'));
}

// Generate salt
export function generateSalt(length = 16) {
    return randomBytes(length).toString('hex').normalize();
}
