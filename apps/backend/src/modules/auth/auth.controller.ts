import type { FastifyReply, FastifyRequest } from "fastify";
import { tokensTable, usersTable } from "@repo/db/schema";
import { and, eq, gt } from "drizzle-orm";
import { loginSchema, registerSchema } from "./auth.types";
import { ApiError, ApiResponse } from "../../utils/response";
import bcrypt from "bcrypt";
import { generateRefreshToken, hashRefreshToken } from "../../utils/token";
import { readRefreshCookie, tokenCookieOptions } from "./auth.service";

/**
 * Token strategy: a short-lived JWT access token the API verifies on every
 * request, plus a long-lived opaque refresh token that is stored hashed and
 * exchanged for a new pair. Both travel as cookies; the access token is also
 * returned in the body for clients that prefer an Authorization header.
 */

// Both are in SECONDS, which is what the cookie `maxAge` option expects.
// `Date` works in milliseconds, so anything written to `expires_at` goes
// through `expiresAt()` rather than adding a TTL to `Date.now()` directly.
const ACCESS_TOKEN_TTL = 60 * 15
const REFRESH_TOKEN_TTL = 60 * 60 * 24 * 7

const expiresAt = (ttlSeconds: number) => new Date(Date.now() + ttlSeconds * 1000)

/** Creates an account. Does not log the user in; the client calls /login next. */
export const registerUser = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;

    const { data, error } = registerSchema.safeParse(req.body);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    const existingUser = await db.query.usersTable.findFirst({
        where: eq(usersTable.email, data.email),
    });
    if (existingUser) {
        throw new ApiError(409, "Email already taken");
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    // `returning` lists columns explicitly so the password hash cannot leak
    // into the response by way of a `select *`.
    const [createdUser] = await db
        .insert(usersTable)
        .values({
            fullName: data.fullName,
            email: data.email,
            password: hashedPassword,
        })
        .returning({
            id: usersTable.id,
            fullName: usersTable.fullName,
            email: usersTable.email,
            role: usersTable.role,
            avatar: usersTable.avatar,
            createdAt: usersTable.createdAt,
        });

    if (!createdUser) {
        throw new ApiError(500, "Failed to create user");
    }

    return reply
        .code(201)
        .send(new ApiResponse(201, createdUser, "Account created successfully"));
};

/** Verifies credentials and issues an access/refresh token pair. */
export const loginUser = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;

    const { data, error } = loginSchema.safeParse(req.body);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    const user = await db.query.usersTable.findFirst({
        where: eq(usersTable.email, data.email),
    });

    // A missing user and a provider account with no password share the wrong
    // password's message, so the response cannot be used to enumerate emails.
    if (!user || !user.password) {
        throw new ApiError(401, "Invalid email or password");
    }

    const passwordMatches = await bcrypt.compare(data.password, user.password);
    if (!passwordMatches) {
        throw new ApiError(401, "Invalid email or password");
    }

    // Claims are kept to what the authenticate plugin needs; anything richer
    // would go stale, since the JWT is not re-checked against the row.
    const accessToken = req.server.jwt.sign({
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
    });


    const refreshToken = generateRefreshToken();
    const hashedRefreshToken = hashRefreshToken(refreshToken);

    await db.insert(tokensTable).values({
        userId: user.id,
        refreshToken: hashedRefreshToken,
        expiresAt: expiresAt(REFRESH_TOKEN_TTL)
    });

    return reply.code(200)
        .cookie("kanvas_access_token", accessToken, tokenCookieOptions(ACCESS_TOKEN_TTL))
        .cookie("kanvas_refresh_token", refreshToken, tokenCookieOptions(REFRESH_TOKEN_TTL))
        .send(
            new ApiResponse(200, { accessToken }, "Logged in successfully")
        );
};

/**
 * Revokes the refresh token presented by this session and clears both cookies.
 * Other sessions keep working; only a password change revokes all of them.
 */
export const logoutUser = async (req: FastifyRequest, reply: FastifyReply) => {
    const id = req.user
    const db = req.server.db;

    const refreshToken = readRefreshCookie(req)
    const hashedRefreshToken = hashRefreshToken(refreshToken)

    // Matching on user id as well as the hash keeps one user from revoking
    // another's token by replaying a stolen cookie value.
    await db.update(tokensTable).set({
        revoked: true
    }).where(
        and(
            eq(tokensTable.userId, String(id)),
            eq(tokensTable.refreshToken, hashedRefreshToken)
        )
    )

    return reply
        .code(200)
        .clearCookie("kanvas_access_token")
        .clearCookie("kanvas_refresh_token")
        .send(new ApiResponse(200, null, "Logged out successfully"));
};

/**
 * Exchanges a refresh token for a new pair, rotating the refresh token so a
 * stolen one is usable at most once.
 */
export const refreshTokens = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;

    const incomingRefreshToken = readRefreshCookie(req);
    const hashedRefreshToken = hashRefreshToken(incomingRefreshToken)

    // Revoking and re-reading in one transaction is what makes rotation atomic:
    // two concurrent refreshes cannot both walk away with a valid token.
    const user = await db.transaction(async (tx) => {
        // Matching on `revoked` and `expiresAt` as well as the hash is what
        // makes this a one-shot exchange: a token that was already spent, or
        // one that has aged out, updates no rows and falls through to a 401.
        const [tokenUser] = await tx.update(tokensTable).set({
            revoked: true
        }).where(
            and(
                eq(tokensTable.refreshToken, hashedRefreshToken),
                eq(tokensTable.revoked, false),
                gt(tokensTable.expiresAt, new Date())
            )
        ).returning({
            id: tokensTable.userId
        })

        if (!tokenUser) {
            throw new ApiError(401, "Invalid or expired refresh token");
        }

        const [user] = await tx.select({
            id: usersTable.id,
            email: usersTable.email,
            createdAt: usersTable.createdAt
        })
            .from(usersTable)
            .where(
                eq(usersTable.id, tokenUser.id)
            )

        // The token row cascades with its user, so this is unreachable short of
        // the row being deleted mid-request.
        if (!user) {
            throw new ApiError(401, "Invalid or expired refresh token");
        }

        return user
    })

    const accessToken = req.server.jwt.sign({ ...user })
    const newRefreshToken = generateRefreshToken()
    const newHashedRefreshToken = hashRefreshToken(newRefreshToken);

    await db.insert(tokensTable).values({
        userId: user.id,
        refreshToken: newHashedRefreshToken,
        expiresAt: expiresAt(REFRESH_TOKEN_TTL)
    })

    return reply
        .code(200)
        .cookie("kanvas_access_token", accessToken, tokenCookieOptions(ACCESS_TOKEN_TTL))
        .cookie("kanvas_refresh_token", newRefreshToken, tokenCookieOptions(REFRESH_TOKEN_TTL))
        .send(
            new ApiResponse(200, { accessToken }, "Token refreshed successfully"),
        );
};