import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicRoutes = ['/login']
const authApiRoutes = ['/api/auth/login']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('token')?.value

  if (authApiRoutes.some(r => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/')) {
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }
    return NextResponse.next()
  }

  if (publicRoutes.includes(pathname)) {
    if (token) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/).*)'],
}
