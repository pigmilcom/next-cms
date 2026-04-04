// @/app/auth/handler/forgot/route.js

import { NextResponse } from 'next/server';
import DBService from '@/data/rest.db';
import { encryptHash } from '@/lib/crypt';
import { sendPasswordResetEmail } from '@/lib/server/email';

export async function POST(request) {
    try {
        const { email } = await request.json();

        // Validation
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({ success: false, error: 'invalidEmail' }, { status: 400 });
        }

        const address = email.toLowerCase();
        const userRes = await DBService.readBy('email', address, 'users');
        const user = userRes?.data;

        if (!user.password || !user.salt) {
            // User does not have a password set (possibly OAuth user)
            return NextResponse.json({
                success: false,
                message: 'errorSendingEmail'
            });
        }

        // Generate 6-digit code
        const randomCode = Math.floor(100000 + Math.random() * 900000).toString();

        const codeData = {
            email: address,
            code: randomCode,
            timestamp: Date.now(),
            expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
        };

        const codeDataEncrypted = encryptHash(codeData, 'reset-token');

        if (!user) {
            // Don't reveal that email doesn't exist for security
            return NextResponse.json({
                success: true,
                message: 'emailSentSuccess'
            });
        }

        // Send password reset email
        try {
            await sendPasswordResetEmail(address, randomCode, user.displayName || 'Utilizador');
        } catch (emailError) {
            return NextResponse.json({ success: false, error: 'errorSendingEmail' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'passwordResetSent',
            encryptedCode: codeDataEncrypted,
            // Remove this in production - only for demo/development
            demoCode: process.env.NODE_ENV === 'development' ? randomCode : undefined
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'errorProcessingRequest' }, { status: 500 });
    }
}
