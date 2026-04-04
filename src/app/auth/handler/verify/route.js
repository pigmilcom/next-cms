// @/app/auth/handler/verify/route.js
import { NextResponse } from 'next/server';
import { decryptHash } from '@/lib/crypt';

export async function POST(request) {
    try {
        const { code, encryptedCode } = await request.json();

        // Validation
        if (!code || !encryptedCode) {
            return NextResponse.json({ success: false, error: 'codeAndTokenRequired' }, { status: 400 });
        }

        // Validate code format (6 digits)
        if (!/^\d{6}$/.test(code)) {
            return NextResponse.json({ success: false, error: 'invalidCode' }, { status: 400 });
        }

        try {
            // Verify the code matches the encrypted version
            const decryptedCode = decryptHash(encryptedCode, 'reset-token');

            if (!decryptedCode || !decryptedCode.code) {
                return NextResponse.json({ success: false, error: 'invalidToken' }, { status: 400 });
            }

            if (code !== decryptedCode.code) {
                return NextResponse.json({ success: false, error: 'incorrectCode' }, { status: 400 });
            }

            // Check if code has expired (15 minutes)
            const now = new Date();
            const expiresAt = new Date(decryptedCode.expiresAt);

            if (now > expiresAt) {
                return NextResponse.json({ success: false, error: 'codeExpired' }, { status: 400 });
            }

            return NextResponse.json({
                success: true,
                message: 'codeVerified'
            });
        } catch (decryptError) {
            console.error('Decryption error:', decryptError);
            return NextResponse.json({ success: false, error: 'invalidOrExpiredToken' }, { status: 400 });
        }
    } catch (error) {
        console.error('Verify code error:', error);
        return NextResponse.json({ success: false, error: 'errorVerifyingCode' }, { status: 500 });
    }
}
