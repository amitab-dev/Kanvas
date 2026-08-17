import { NextResponse, type NextRequest } from "next/server"

const ACCESS_COOKIE = "kanvas_access_token"
const REFRESH_COOKIE = "kanvas_refresh_token"

const LOGIN_PATH = "/auth/login"

const EXPIRED_PARAM = "expired"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api"

const apiHostname = (() => {
    try {
        return new URL(API_URL).hostname
    } catch {

        return null
    }
})()

const isProtectedPath = (pathname: string) =>
    pathname === "/" || pathname === "/dashboard" || pathname.startsWith("/dashboard/")

const isAuthPath = (pathname: string) => pathname.startsWith("/auth/")

const safeNextPath = (value: string | null) => {
    if (!value) return null
    if (!value.startsWith("/") || value.startsWith("//")) return null

    return value
}

export function proxy(request: NextRequest) {
    const { pathname, search } = request.nextUrl

    const hasSession =
        request.cookies.has(REFRESH_COOKIE) || request.cookies.has(ACCESS_COOKIE)

    if (isAuthPath(pathname)) {

        if (request.nextUrl.searchParams.has(EXPIRED_PARAM)) {
            const response = NextResponse.next()
            response.cookies.delete(ACCESS_COOKIE)
            response.cookies.delete(REFRESH_COOKIE)
            return response
        }

        if (hasSession) {
            const destination = request.nextUrl.clone()
            destination.search = ""
            destination.pathname =
                safeNextPath(request.nextUrl.searchParams.get("next")) ?? "/dashboard"
            return NextResponse.redirect(destination)
        }

        return NextResponse.next()
    }

    if (!isProtectedPath(pathname)) {
        return NextResponse.next()
    }

    if (hasSession) {
        return NextResponse.next()
    }

    if (apiHostname !== null && apiHostname !== request.nextUrl.hostname) {
        return NextResponse.next()
    }

    const login = request.nextUrl.clone()
    login.pathname = LOGIN_PATH
    login.search = ""
    if (pathname !== "/") {
        login.searchParams.set("next", `${pathname}${search}`)
    }

    return NextResponse.redirect(login)
}

export const config = {

    matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
}
