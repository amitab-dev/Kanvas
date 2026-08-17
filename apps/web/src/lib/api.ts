import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios"

export const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api",
    withCredentials: true,
})

export type ApiEnvelope<T> = {
    success: boolean
    status: number
    data: T
    message: string
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }


let refreshRequest: Promise<void> | null = null

const refreshSession = () => {
    refreshRequest ??= api
        .post("/auth/refresh")
        .then(() => undefined)
        .finally(() => {
            refreshRequest = null
        })

    return refreshRequest
}

/**
 * A 401 that survives a refresh means the session is gone for good, which can
 * happen on any screen. Sending the browser to login here saves every caller
 * from having to recognise an expired session in its own error handling.
 */
const redirectToLogin = () => {
    if (typeof window === "undefined") return
    if (window.location.pathname.startsWith("/auth/")) return

    window.location.replace("/auth/login")
}

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const request = error.config as RetriableConfig | undefined

        const isAuthRoute = request?.url?.startsWith("/auth/")
        if (error.response?.status !== 401 || !request || request._retried || isAuthRoute) {
            return Promise.reject(error)
        }

        request._retried = true

        try {
            await refreshSession()
        } catch {
            redirectToLogin()
            return Promise.reject(error)
        }

        return api(request)
    },
)

export const apiErrorMessage = (error: unknown, fallback = "Something went wrong") => {
    if (!axios.isAxiosError(error)) return fallback

    const message = (error.response?.data as { message?: string } | undefined)?.message
    if (message) return message

    return error.response ? fallback : "Unable to reach the server. Please try again."
}

export const apiErrorStatus = (error: unknown) =>
    axios.isAxiosError(error) ? error.response?.status : undefined
