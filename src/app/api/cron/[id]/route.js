// @/app/api/cron/[id]/route.js

import { NextResponse } from 'next/server';
import DBService from '@/data/rest.db.js';

// Runtime configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
    return NextResponse.json(
        { error: 'Method not allowed - Use PUT to update or DELETE to remove' },
        { status: 405 }
    );
}

export async function POST(req, { params }) {
    return NextResponse.json(
        { error: 'Method not allowed - Use PUT to update or DELETE to remove' },
        { status: 405 }
    );
}

export async function PUT(req, { params }) {
    try {
        const id = params.id;
        const body = await req.json();
        const updated = await DBService.update(id, body, 'cronjobs');
        return NextResponse.json({ success: true, data: updated });
    } catch (err) {
        console.error('PUT /api/cron/[id] error', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const id = params.id;
        const result = await DBService.delete(id, 'cronjobs');
        return NextResponse.json({ success: true, data: result });
    } catch (err) {
        console.error('DELETE /api/cron/[id] error', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
