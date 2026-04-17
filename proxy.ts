import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

function getToken(request: NextRequest, cookieName: string): string | null {
  const cookie = request.cookies.get(cookieName)?.value;
  if (cookie) return cookie;
  const auth = request.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── FrameLink super admin dashboard ──────────────────────────────────────
  if (pathname.startsWith('/admin/dashboard')) {
    const token = getToken(request, 'admin_token');
    const payload = token ? await verifyToken(token) : null;
    if (payload?.role !== 'superadmin') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // ── FrameLink super admin API (except auth) ───────────────────────────────
  if (pathname.startsWith('/api/admin') && !pathname.startsWith('/api/admin/auth')) {
    const token = getToken(request, 'admin_token');
    const payload = token ? await verifyToken(token) : null;
    if (payload?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // ── Client dashboard pages  /c/:slug/admin/dashboard ─────────────────────
  const clientDashMatch = pathname.match(/^\/c\/([^/]+)\/admin\/dashboard/);
  if (clientDashMatch) {
    const slug = clientDashMatch[1];
    const token = getToken(request, `client_token_${slug}`);
    const payload = token ? await verifyToken(token) : null;
    const allowed =
      payload?.role === 'superadmin' ||
      (payload?.role === 'client' && payload.slug === slug);
    if (!allowed) {
      return NextResponse.redirect(new URL(`/c/${slug}/admin/login`, request.url));
    }
  }

  // ── Client API routes  /c/:slug/api/* (except public endpoints) ─────────
  // chat and config are public — no login required to use the chatbot
  const clientApiMatch = pathname.match(/^\/c\/([^/]+)\/api\/(.+)/);
  const publicClientRoutes = ['auth', 'config', 'chat'];
  if (clientApiMatch && !publicClientRoutes.includes(clientApiMatch[2])) {
    const slug = clientApiMatch[1];
    const token = getToken(request, `client_token_${slug}`) ?? getToken(request, 'admin_token');
    const payload = token ? await verifyToken(token) : null;
    const allowed =
      payload?.role === 'superadmin' ||
      (payload?.role === 'client' && payload.slug === slug);
    if (!allowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/dashboard/:path*',
    '/api/admin/:path*',
    '/c/:slug/admin/dashboard/:path*',
    '/c/:slug/api/:path*',
  ],
};
