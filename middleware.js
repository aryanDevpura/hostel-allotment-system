import { NextResponse } from 'next/server';

// Protects /admin/* pages and all admin-only API routes.
// Uses a signed session cookie set by POST /api/admin/login.
export function middleware(request) {
    const { pathname } = request.nextUrl;

    // ── Routes that require admin auth ───────────────────────────────────────
    const isAdminPage = pathname.startsWith('/admin');
    const isAdminApi =
        pathname.startsWith('/api/sessions') ||
        pathname.startsWith('/api/allotment') ||
        pathname.startsWith('/api/allotments') ||
        pathname.startsWith('/api/upload') ||
        pathname.startsWith('/api/validate') ||
        pathname.startsWith('/api/export') ||
        pathname.startsWith('/api/results') ||
        pathname.startsWith('/api/blocks') ||
        pathname.startsWith('/api/admin');

    if (!isAdminPage && !isAdminApi) {
        return NextResponse.next();
    }

    // ── Allow the login page and login API itself through ────────────────────
    if (pathname === '/admin/login' || pathname === '/api/admin/login') {
        return NextResponse.next();
    }

    // ── Check for valid session cookie ───────────────────────────────────────
    const sessionCookie = request.cookies.get('admin_session');
    const expectedToken = process.env.ADMIN_SESSION_TOKEN;

    if (!expectedToken) {
        // ADMIN_SESSION_TOKEN not configured — fail closed (safe default)
        if (isAdminApi) {
            return NextResponse.json({ error: 'Admin authentication not configured on server.' }, { status: 503 });
        }
        return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    if (!sessionCookie || sessionCookie.value !== expectedToken) {
        if (isAdminApi) {
            return NextResponse.json({ error: 'Unauthorized. Admin login required.' }, { status: 401 });
        }
        return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/admin/:path*',
        '/api/sessions/:path*',
        '/api/allotment/:path*',
        '/api/allotments/:path*',
        '/api/upload/:path*',
        '/api/validate/:path*',
        '/api/export/:path*',
        '/api/results/:path*',
        '/api/blocks/:path*',
        '/api/admin/:path*',
    ],
};
