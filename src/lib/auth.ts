import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

const SALT_ROUNDS = 10

function getSecret(): string {
  return process.env.JWT_SECRET || 'dev-secret-change-in-production'
}

export type JwtPayload = {
  userId: string
  username: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: '7d' })
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getSecret()) as JwtPayload
}

export function getTokenFromCookies(): string | undefined {
  return cookies().get('token')?.value
}

export function getUserFromCookies(): JwtPayload | null {
  try {
    const token = getTokenFromCookies()
    if (!token) return null
    return verifyToken(token)
  } catch {
    return null
  }
}
