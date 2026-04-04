// @/app/api/cron/payments/route.js

import { NextResponse } from 'next/server';
import { checkPending } from '@/lib/server/gateways.js';

/**
 * Cron job endpoint to check pending payments
 * GET /api/cron/payments
 */
export async function GET(request) {
    try {
        // Optional: Add cron secret verification for security
        const cronSecret = request.nextUrl.searchParams.get('secret') || request.headers.get('x-cron-secret') || 'null';
        const expectedSecret = process.env.CRON_SECRET || 'null';
        
        if (expectedSecret && cronSecret !== expectedSecret) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: 'Unauthorized - Invalid cron secret' 
                },
                { status: 401 }
            );
        } 
        
        // Call the checkPending function from gateways
        const result = await checkPending();
        
        if (!result.success) {
            console.error('Payments cron job failed:', result.error);
            return NextResponse.json(
                { 
                    success: false, 
                    error: result.error,
                    timestamp: new Date().toISOString()
                },
                { status: 500 }
            );
        } 

        // Return success response with results
        return NextResponse.json({
            success: true,
            message: 'Payments check completed successfully',
            data: {
                checked: result.checked || 0,
                updated: result.updated || 0,
                cancelled: result.cancelled || 0,
                results: result.results || []
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Payments cron job error:', error);
        
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error during payments check',
                details: error.message,
                timestamp: new Date().toISOString()
            },
            { status: 500 }
        );
    }
}

/**
 * Handle unsupported HTTP methods
 */
export async function POST() {
    return NextResponse.json(
        { error: 'Method not allowed - Use GET for cron jobs' },
        { status: 405 }
    );
}

export async function PUT() {
    return NextResponse.json(
        { error: 'Method not allowed - Use GET for cron jobs' },
        { status: 405 }
    );
}

export async function DELETE() {
    return NextResponse.json(
        { error: 'Method not allowed - Use GET for cron jobs' },
        { status: 405 }
    );
}