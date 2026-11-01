import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

// POST /api/admin/login
// Validates admin password and sets a secure session cookie.
export async function POST(request) {
    try {
        const { password } = await request.json();

        if (!password) {
            return NextResponse.json({ error: 'Password is required.' }, { status: 400 });
        }

        const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
        const sessionToken = process.env.ADMIN_SESSION_TOKEN;

        if (!adminPasswordHash || !sessionToken) {
            return NextResponse.json(
                { error: 'Admin credentials not configured on server. Set ADMIN_PASSWORD_HASH and ADMIN_SESSION_TOKEN in environment variables.' },
                { status: 503 }
            );
        }

        const valid = await bcrypt.compare(password, adminPasswordHash);
        if (!valid) {
            return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
        }

        const response = NextResponse.json({ success: true });

        // HttpOnly cookie — not accessible to JavaScript, expires in 8 hours
        response.cookies.set('admin_session', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 8, // 8 hours
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Admin login error:', error);
        return NextResponse.json({ error: 'Login failed.' }, { status: 500 });
    }
}

// DELETE /api/admin/login — logout (clears the cookie)
export async function DELETE() {
    const response = NextResponse.json({ success: true });
    response.cookies.set('admin_session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
    });
    return response;
}
