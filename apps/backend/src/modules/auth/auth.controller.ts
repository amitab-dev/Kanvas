import type { FastifyReply, FastifyRequest } from "fastify";
import { tokensTable, usersTable } from "@repo/db/schema";
import { and, eq } from "drizzle-orm";
import { loginSchema, registerSchema } from "./auth.types";
import { ApiError, ApiResponse } from "../../utils/response";
import bcrypt from "bcrypt";
import { generateRefreshToken, hashRefreshToken } from "../../utils/token";
import { readRefreshCookie } from "./auth.service";

const ACCESS_TOKEN_TTL = 60 * 15
const REFRESH_TOKEN_TTL = 60 * 60 * 24 * 7

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

export const loginUser = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;

    const { data, error } = loginSchema.safeParse(req.body);
    if (error) {
        throw new ApiError(422, "Validation error");
    }

    const user = await db.query.usersTable.findFirst({
        where: eq(usersTable.email, data.email),
    });

    if (!user || !user.password) {
        throw new ApiError(401, "Invalid email or password");
    }

    const passwordMatches = await bcrypt.compare(data.password, user.password);
    if (!passwordMatches) {
        throw new ApiError(401, "Invalid email or password");
    }

    const accessToken = req.server.jwt.sign({
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
    });

    const refreshToken = generateRefreshToken();
    const hashedRefreshToken = hashRefreshToken(refreshToken);

    await db.transaction(async (tx) => {
        tx.insert(tokensTable).values({
            userId: user.id,
            refreshToken: hashedRefreshToken,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL)
        })
    });

    return reply.code(200)
        .cookie("kanvas_access_token", accessToken, { secure: true, maxAge: ACCESS_TOKEN_TTL, sameSite: "lax" })
        .cookie("kanvas_refresh_token", refreshToken, { secure: true, maxAge: REFRESH_TOKEN_TTL, sameSite: "lax" })
        .send(
            new ApiResponse(200, { accessToken }, "Logged in successfully")
        );
};

export const logoutUser = async (req: FastifyRequest, reply: FastifyReply) => {
    const id = req.user
    const db = req.server.db;

    const refreshToken = readRefreshCookie(req)
    const hashedRefreshToken = hashRefreshToken(refreshToken)

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

export const refreshTokens = async (req: FastifyRequest, reply: FastifyReply) => {
    const db = req.server.db;

    const incomingRefreshToken = readRefreshCookie(req);
    const hashedRefreshToken = hashRefreshToken(incomingRefreshToken)

    const [user] = await db.transaction(async (tx) => {
        const [tokenUser] = await tx.update(tokensTable).set({
            revoked: true
        }).where(
            eq(tokensTable.refreshToken, hashedRefreshToken)
        ).returning({
            id: tokensTable.userId
        })

        const user = await tx.select({
            id: usersTable.id,
            email: usersTable.email,
            createdAt: usersTable.createdAt
        })
            .from(usersTable)
            .where(
                eq(usersTable.id, tokenUser?.id as string)
            )

        return user
    })

    const accessToken = req.server.jwt.sign({ ...user })
    const newRefeshToken = generateRefreshToken()
    const newHashedRefreshToken = hashRefreshToken(newRefeshToken);

    await db.insert(tokensTable).values({
        userId: user?.id!,
        refreshToken: newHashedRefreshToken,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL)
    })

    return reply
        .code(200)
        .cookie("kanvas_access_token", accessToken, { secure: true, maxAge: ACCESS_TOKEN_TTL, sameSite: "lax" })
        .cookie("kanvas_refresh_token", newRefeshToken, { secure: true, maxAge: REFRESH_TOKEN_TTL, sameSite: "lax" })
        .send(
            new ApiResponse(200, { accessToken }, "Token refreshed successfully"),
        );
};