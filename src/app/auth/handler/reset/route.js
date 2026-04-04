// @/app/auth/handler/reset/route.js
import { NextResponse } from 'next/server';
import DBService from '@/data/rest.db';
import { decryptHash, encryptPassword, generateSalt } from '@/lib/crypt';

const passwordValid = (pwd) => {
    return (
        pwd.length >= 8 &&
        pwd.length <= 32 &&
        /[a-z]/.test(pwd) &&
        /[A-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd)
    );
};

export async function POST(request) {
    try {
        const { email, newPassword, confirmPassword, code, token } = await request.json();

        // Validation
        if (!email || !newPassword || !confirmPassword || !code || !token) {
            return NextResponse.json({ success: false, error: 'allFieldsRequired' }, { status: 400 });
        }

        if (newPassword !== confirmPassword) {
            return NextResponse.json({ success: false, error: 'passwordsDontMatch' }, { status: 400 });
        }

        if (!passwordValid(newPassword)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'passwordRequirements'
                },
                { status: 400 }
            );
        }

        try {
            // Verify Token
            const decryptedToken = decryptHash(token, 'reset-token');

            if (!decryptedToken || !decryptedToken.code || !decryptedToken.email) {
                return NextResponse.json({ success: false, error: 'invalidToken' }, { status: 400 });
            }

            if (code !== decryptedToken.code) {
                return NextResponse.json({ success: false, error: 'incorrectCode' }, { status: 400 });
            }

            // Verify email matches
            if (decryptedToken.email.toLowerCase() !== email.toLowerCase()) {
                return NextResponse.json({ success: false, error: 'emailNotMatchToken' }, { status: 400 });
            }

            // Check if code has expired (15 minutes)
            const now = new Date();
            const expiresAt = new Date(decryptedToken.expiresAt);

            if (now > expiresAt) {
                return NextResponse.json({ success: false, error: 'codeExpired' }, { status: 400 });
            }
        } catch (decryptError) {
            console.error('Token decryption error:', decryptError);
            return NextResponse.json({ success: false, error: 'invalidOrExpiredToken' }, { status: 400 });
        }

        const address = email.toLowerCase();
        const userRes = await DBService.readBy('email', address, 'users');
        const user = userRes?.data;

        if (!user) {
            return NextResponse.json({ success: false, error: 'userNotFound' }, { status: 404 });
        }

        // Get the user's key to update the record
        let userKey = user?.key || user?.id;
        if (!userKey) {
            userKey = await DBService.getItemKey('email', address, 'users');
            if (!userKey) {
                return NextResponse.json({ success: false, error: 'userKeyMissing' }, { status: 500 });
            }
        }

        // Generate new salt and encrypt password
        const newSalt = await generateSalt();
        const encryptedPassword = await encryptPassword(newPassword, newSalt);

        // Update user with new password
        const updateResult = await DBService.update(
            userKey,
            {
                password: encryptedPassword,
                salt: newSalt,
                passwordChangedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            'users'
        );

        if (!updateResult || !updateResult.success) {
            return NextResponse.json({ success: false, error: 'failedUpdatePasswordRetry' }, { status: 500 });
        }
        return NextResponse.json({
            success: true,
            message: 'passwordUpdated'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json({ success: false, error: 'errorUpdatingPassword' }, { status: 500 });
    }
}
