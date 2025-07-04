import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const token = request.cookies.get("auth-token")
  const { pathname } = request.nextUrl

  // Redirect to login if no token and trying to access protected routes
  if (!token && pathname.startsWith("/chat")) {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  // Redirect to chat if token exists and trying to access auth pages
  if (token && pathname.startsWith("/auth")) {
    return NextResponse.redirect(new URL("/chat", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/chat/:path*", "/auth/:path*"],
}
