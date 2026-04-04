// @/proxy.js
import { NextResponse } from 'next/server';

export default function middleware(req) {
    const { pathname } = req.nextUrl;

    // Set pathname header for metadata generation (lightweight operation)
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-pathname', pathname);

    // Allow request to continue
    return NextResponse.next({
        request: {
            headers: requestHeaders
        }
    });
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|uploads).*)'
    ]
};
