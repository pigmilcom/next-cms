// @/app/api/cron/route.js

import { NextResponse } from 'next/server';
import { getAllSystemCronjobs } from '@/lib/server/cronjobs.js';
import DBService from '@/data/rest.db.js';

/**
 * Main Cron Orchestrator
 * GET /api/cron - List all available cron jobs and their status (system + custom)
 * POST /api/cron - Run all enabled cron jobs (system + custom based on their frequencies)
 */

// Verify cron secret if configured
function verifyCronSecret(request) {
    const cronSecret = request.nextUrl?.searchParams?.get('secret') || request.headers?.get('x-cron-secret') || 'null';
    const expectedSecret = process.env.CRON_SECRET || 'null';
    
    if (cronSecret !== expectedSecret) {
        return false;
    }
    return true;
}

/**
 * GET /api/cron
 * Returns list of all available cron jobs (system + custom) and their last run status
 */
export async function GET(request) {
    try {
        if (!verifyCronSecret(request)) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized - Invalid cron secret' },
                { status: 401 }
            );
        }

        // Fetch system cronjobs
        const systemJobsResult = await getAllSystemCronjobs();
        const systemJobs = systemJobsResult?.success ? systemJobsResult.data : [];

        // Fetch custom cronjobs from database
        const allJobs = await DBService.readAll('cronjobs');
        const jobs = Array.isArray(allJobs?.data) 
            ? allJobs.data 
            : Object.values(allJobs?.data || {});

        // Filter custom jobs only (exclude system jobs from database query)
        const customJobs = jobs
            .filter(job => job != null && job.type !== 'system')
            .map(job => ({
                id: job.id || job.key || job._id || Math.random().toString(36).substring(2, 15),
                name: job.name || job.id || 'Undefined',
                description: job.description || 'Custom HTTP job',
                type: 'custom',
                config: job.config,
                enabled: job.enabled || false,
                lastRun: job.lastRun || null,
                lastStatus: job.lastStatus || null,
                lastResult: job.lastResult || null,
                intervalMinutes: job.intervalMinutes || 60,
                runCount: job.runCount || 0
            }));

        return NextResponse.json({
            success: true,
            data: {
                system: systemJobs,
                custom: customJobs,
                total: systemJobs.length + customJobs.length,
                enabled: systemJobs.filter(j => j.enabled).length + customJobs.filter(j => j.enabled).length
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('GET /api/cron error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

/**
 * POST /api/cron
 * Run all enabled cron jobs (system + custom) based on their frequency intervals
 * This is the main endpoint to be called by external cron services (Coolify, cron-job.org, etc.)
 * 
 * When called, this will:
 * 1. Execute all enabled system cronjobs that are due based on their intervals
 * 2. Execute all enabled custom cronjobs that are due based on their intervals
 */
export async function POST(request) {
    try {
        if (!verifyCronSecret(request)) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized - Invalid cron secret' },
                { status: 401 }
            );
        }

        const results = [];
        const baseUrl = new URL(request.url).origin;

        // Execute the centralized run endpoint which handles both system and custom jobs
        // This endpoint checks intervals and runs only due jobs
        try {
            const response = await fetch(`${baseUrl}/api/cron/run`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-cron-secret': process.env.CRON_SECRET || 'null'
                }
            });
            const data = await response.json();
            
            const systemJobsExecuted = data.data?.filter(r => r.type === 'system').length || 0;
            const customJobsExecuted = data.data?.filter(r => r.type === 'custom').length || 0;
            
            results.push({
                category: 'all-jobs',
                success: data.success,
                systemExecuted: systemJobsExecuted,
                customExecuted: customJobsExecuted,
                totalExecuted: data.data?.length || 0,
                jobs: data.data || [],
                error: data.error || null
            });
        } catch (error) {
            results.push({
                category: 'all-jobs',
                success: false,
                error: error.message
            });
        }

        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;
        const totalExecuted = results[0]?.totalExecuted || 0;
        const systemExecuted = results[0]?.systemExecuted || 0;
        const customExecuted = results[0]?.customExecuted || 0;

        return NextResponse.json({
            success: failureCount === 0,
            message: `Executed ${totalExecuted} cronjob(s): ${systemExecuted} system, ${customExecuted} custom`,
            data: {
                results,
                summary: {
                    total: results.length,
                    succeeded: successCount,
                    failed: failureCount,
                    systemJobsExecuted: systemExecuted,
                    customJobsExecuted: customExecuted,
                    totalJobsExecuted: totalExecuted
                }
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('POST /api/cron error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

/**
 * Handle unsupported HTTP methods
 */
export async function PUT() {
    return NextResponse.json(
        { error: 'Method not allowed - Use GET to list jobs or POST to run jobs' },
        { status: 405 }
    );
}

export async function DELETE() {
    return NextResponse.json(
        { error: 'Method not allowed - Use GET to list jobs or POST to run jobs' },
        { status: 405 }
    );
}
