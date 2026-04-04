// @/app/setup/create-admin/route.js
import { NextResponse } from 'next/server';
import DBService from '@/data/rest.db.js';
import { encryptPassword, generateSalt } from '@/lib/crypt';
import { sendWelcomeEmail } from '@/lib/server/email';
import { cacheFunctions } from '@/lib/shared/cache';
import { v6 as uuidv6 } from 'uuid';

const timeNow = () => new Date().toISOString();

// Generate unique referral code (6 characters)
const generateReferralCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

export async function POST(request) {
    try {
        // Parse request body
        const body = await request.json();
        const { email, password, displayName } = body;

        // Validate input
        if (!email || !password) {
            return NextResponse.json(
                { success: false, error: 'Email and password are required' },
                { status: 400 }
            );
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { success: false, error: 'Invalid email format' },
                { status: 400 }
            );
        }

        // Password validation (minimum 8 characters)
        if (password.length < 8) {
            return NextResponse.json(
                { success: false, error: 'Password must be at least 8 characters long' },
                { status: 400 }
            );
        }

        // Check if any users already exist
        try {
            const existingUsers = await DBService.readAll('users');
            const usersData = existingUsers?.success ? existingUsers.data : {};
            const usersArray = Array.isArray(usersData) 
                ? usersData 
                : Object.values(usersData || {});
            
            if (usersArray.length > 0) {
                return NextResponse.json(
                    { success: false, error: 'Admin user already exists' },
                    { status: 400 }
                );
            }
        } catch (error) {
            // Table might not exist yet, which is fine - it will be created
            console.log('Users table check:', error.message);
        }

        // Generate salt via crypto API
        const salt = await generateSalt();
        
        // Encrypt password via crypto API
        const encryptedPassword = await encryptPassword(password, salt);
        
        // Generate unique user ID
        const uid = uuidv6();
        
        // Generate unique referral code
        const userReferralCode = generateReferralCode();
        
        // Prepare user registration data
        let userRegisterData = {
            id: uid,
            displayName: displayName || 'Administrator',
            email: email,
            password: encryptedPassword,
            salt: salt,
            role: 'admin', // First user is always admin
            referralCode: userReferralCode,
            referredBy: null,
            emailNotifications: true,
            orderUpdates: true,
            marketingEmails: true,
            newsletter: true,
            smsNotifications: false,
            isDeveloper: true,
            createdAt: timeNow()
        };
        
        // Create admin user in database
        const createResult = await DBService.create(userRegisterData, 'users');
        
        if (!createResult?.success) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: 'Failed to create admin user: ' + (createResult?.error || 'Unknown error') 
                },
                { status: 500 }
            );
        }
        
        // Update site settings to mark setup as complete and clear cache
        try {
            const { clearAllCache } = await cacheFunctions();
            await clearAllCache();
            await sendWelcomeEmail(userRegisterData.email, userRegisterData.displayName);
        } catch (e) {
            console.log('Welcome email failed:', e.message);
        }
        
        // Return success
        return NextResponse.json({
            success: true,
            message: 'Admin user created successfully',
            data: {
                email: userRegisterData.email,
                displayName: userRegisterData.displayName
            }
        });
        
    } catch (error) {
        console.error('Admin creation error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to create admin user',
                message: error.message
            },
            { status: 500 }
        );
    }
}
