// @/app/auth/callback.js

'use server';

import { decryptHash, encryptHash } from '@/lib/crypt';

// Utility function to get base URL from various sources
function getBaseUrl(req = null) {
    // 1. Try NEXTAUTH_URL (NextAuth's standard env var)
    if (process.env.NEXTAUTH_URL) {
        return process.env.NEXTAUTH_URL;
    }

    // 2. If we have a request object (rare in NextAuth context)
    if (req) {
        const headers = req.headers;
        const host = headers.get?.('host') || headers.host;
        const protocol =
            headers.get?.('x-forwarded-proto') ||
            headers['x-forwarded-proto'] ||
            (host?.includes('localhost') ? 'http' : 'https');
        return `${protocol}://${host}`;
    }

    // 3. Development fallback
    if (process.env.NODE_ENV === 'development') {
        return 'http://localhost:3000';
    }

    // 5. Last resort - return a default localhost URL for builds
    console.warn('Unable to determine base URL. Using default localhost:3000');
    return 'http://localhost:3000';
}

export async function authCallback(credentials, req = null) {
    try {
        const { email, password, client, action, name, referralCode } = credentials;

        if (!action) {
            return null;
        }
        if (!client) {
            return null;
        }
        if (!email || !password) {
            return null;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return null;
        }

        const inpEmail = email.toLowerCase();
        const password64 = atob(password);
        const passwordHash = encryptHash(password64, client);

        // Get base URL automatically
        const baseUrl = getBaseUrl(req);

        const authResponse = await fetch(`${baseUrl}/auth/handler`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: inpEmail,
                password: passwordHash,
                client,
                action,
                name,
                referralCode
            })
        });

        // Check if response is valid before parsing
        if (!authResponse) { 
            return { error: 'No response from authentication server.' };
        }

        // Handle authentication failures
        if (authResponse.status === 401) { 
            return { error: resHash?.error || 'An error occurred during authentication.' };
        }

        // Handle other errors (400, 409, etc.)
        if (!authResponse.ok) {
            return { error: res?.error || 'An error occurred during authentication.' };
        }

        const res = await authResponse.json();

        // Check if parsed response is valid
        if (!res || res?.error) {
            return { error: res?.error || 'Invalid response from authentication server.' };
        }

        // Handle response validation and decryption
        try {
            // Decrypt response data
            const resHash = decryptHash(res.hash, client);

            if (!resHash?.success || !resHash?.data || !resHash?.action) {
                return { error: 'An error occurred during authentication.' };
            }

            // Return decrypted data to client component
            return { success: true, data: res.hash, action: resHash.action };
        } catch (decryptionError) {
            console.error('Decryption error:', decryptionError);
            return { error: 'An error occurred during authentication.' };
        }
    } catch (error) {
        // Network errors or fetch failures
        return { error: error instanceof Error ? error.message : 'Authentication failed: Unknown error' };
    }
}
