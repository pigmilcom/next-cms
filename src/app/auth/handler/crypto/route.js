// @/app/auth/handler/crypto/route.js

import { NextResponse } from 'next/server';
import { encryptPassword, generateSalt } from '@/lib/crypt';

export async function GET() {
    try {
        const salt = await generateSalt();
        return new NextResponse(salt);
    } catch (error) {
        console.error('Salt generation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { password, salt } = await request.json();

        if (!password || !salt) {
            return NextResponse.json({ error: 'passwordSaltRequired' }, { status: 400 });
        }

        const encryptedPassword = await encryptPassword(password, salt);

        return NextResponse.json({ encryptedPassword });
    } catch (error) {
        console.error('Password encryption error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
