import { NextResponse } from 'next/server';

export const revalidate = 3600;

const isAllowedProtocol = (url) => url.protocol === 'http:' || url.protocol === 'https:';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const targetUrl = searchParams.get('url');

        if (!targetUrl) {
            return NextResponse.json({ error: 'Image URL is required.' }, { status: 400 });
        }

        let parsedUrl;
        try {
            parsedUrl = new URL(targetUrl);
        } catch {
            return NextResponse.json({ error: 'Invalid image URL.' }, { status: 400 });
        }

        if (!isAllowedProtocol(parsedUrl)) {
            return NextResponse.json({ error: 'Only HTTP and HTTPS image URLs are allowed.' }, { status: 400 });
        }

        const upstreamResponse = await fetch(parsedUrl.toString(), {
            headers: {
                Accept: 'image/*,*/*;q=0.8'
            },
            next: { revalidate: 3600 }
        });

        if (!upstreamResponse.ok) {
            return NextResponse.json({ error: 'Failed to fetch image asset.' }, { status: upstreamResponse.status });
        }

        const contentType = upstreamResponse.headers.get('content-type') || '';
        if (contentType && !contentType.startsWith('image/')) {
            return NextResponse.json({ error: 'Remote asset is not an image.' }, { status: 415 });
        }

        const buffer = await upstreamResponse.arrayBuffer();

        return new Response(buffer, {
            status: 200,
            headers: {
                'Content-Type': contentType || 'application/octet-stream',
                'Cache-Control': 'public, max-age=3600, s-maxage=3600'
            }
        });
    } catch (error) {
        console.error('Proxy image fetch failed:', error);
        return NextResponse.json({ error: 'Failed to proxy image asset.' }, { status: 500 });
    }
}