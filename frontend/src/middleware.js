import { NextResponse } from 'next/server';

const AUTH_PAGES = ['/login', '/register', '/verify-email', '/forgot-password', '/verify-login-otp'];
const PROTECTED_PREFIXES = ['/dashboard', '/profile', '/admin', '/seller/dashboard', '/cart', '/wishlist', '/checkout', '/payment', '/chat', '/assistant'];

function isAuthPage(pathname) {
  return AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function isProtectedRoute(pathname) {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  if (token && isAuthPage(pathname) && !pathname.startsWith('/reset-password')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (!token && isProtectedRoute(pathname)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
