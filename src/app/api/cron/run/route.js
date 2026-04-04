// @/app/api/cron/run/route.js

import { NextResponse } from 'next/server';
import { getAllSystemCronjobs, isCronjobDue, executeCronjob } from '@/lib/server/cronjobs.js';
import DBService from '@/data/rest.db.js';

/**
 * Run due cronjobs (both system and custom) from database
 * Checks each cronjob's interval and executes if due based on lastRun time
 * Supports both system cronjobs (internal endpoints) and custom cronjobs (external URLs)
 */
export async function POST(request) {
    try {
        // Verify cron secret for internal calls
        const cronSecret = request.headers?.get('x-cron-secret') || 'null';
        const expectedSecret = process.env.CRON_SECRET || 'null';
        
        // Optional: uncomment to enforce secret validation
        // if (cronSecret !== expectedSecret) {
        //     return NextResponse.json(
        //         { success: false, error: 'Unauthorized - Invalid cron secret' },
        //         { status: 401 }
        //     );
        // }

        const results = [];

        // 1. Fetch and execute system cronjobs
        const systemJobsResult = await getAllSystemCronjobs();
        if (systemJobsResult?.success) {
            const systemJobs = systemJobsResult.data || [];
            
            for (const job of systemJobs) {
                try {
                    // Check if job is enabled and due to run
                    if (!job.enabled) continue;
                    
                    if (isCronjobDue(job)) {
                        const result = await executeCronjob(job);
                        results.push(result);
                    }
                } catch (err) {
                    console.error('Error executing system cronjob', job.id, err);
                    results.push({
                        id: job.id,
                        name: job.name,
                        type: 'system',
                        status: 'error',
                        error: err.message,
                        success: false
                    });
                }
            }
        }

        // 2. Fetch and execute custom cronjobs
        const all = await DBService.readAll('cronjobs');
        if (all?.success) {
            // Normalize records (array or object)
            const jobs = Array.isArray(all.data) ? all.data : Object.values(all.data || {});

            // Filter custom jobs only
            const customJobs = jobs.filter(job => job && job.type !== 'system');

            for (const job of customJobs) {
                try {
                    // Check if job is enabled and due to run
                    if (!job.enabled) continue;
                    
                    if (isCronjobDue(job)) {
                        const result = await executeCronjob(job);
                        results.push(result);
                    }
                } catch (err) {
                    console.error('Error executing custom cronjob', job.id || job.name, err);
                    results.push({
                        id: job.id || job.key || job._id,
                        name: job.name,
                        type: 'custom',
                        status: 'error',
                        error: err.message,
                        success: false
                    });
                }
            }
        }

        const systemExecuted = results.filter(r => r.type === 'system').length;
        const customExecuted = results.filter(r => r.type === 'custom').length;
        const successfulRuns = results.filter(r => r.success).length;
        const failedRuns = results.filter(r => !r.success).length;

        return NextResponse.json({
            success: true,
            message: `Executed ${results.length} due cronjob(s): ${systemExecuted} system, ${customExecuted} custom (${successfulRuns} succeeded, ${failedRuns} failed)`,
            data: results,
            summary: {
                total: results.length,
                system: systemExecuted,
                custom: customExecuted,
                succeeded: successfulRuns,
                failed: failedRuns
            },
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('POST /api/cron/run error', err);
        return NextResponse.json({
            success: false,
            error: err.message
        }, { status: 500 });
    }
}
