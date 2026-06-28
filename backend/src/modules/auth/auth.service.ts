import bcrypt from 'bcrypt'
import { userRepository } from '../users/user.repository'
import { authRepository } from './auth.repository'
import { signAccessToken, signRefreshToken, verifyRefreshToken, msFromExpiry } from '../../utils/jwt'
import { env } from '../../config/env'

const BCRYPT_ROUNDS = 10

export const authService = {
  async register(nombre: string, email: string, password: string) {
    const existing = await userRepository.findByEmail(email)
    if (existing) throw new Error('EMAIL_TAKEN')

    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS)
    const user = await userRepository.create({ nombre, email, password: hashed })

    const { password: _pw, ...safeUser } = user
    return safeUser
  },

  async login(email: string, password: string) {
    const user = await userRepository.findByEmail(email)
    if (!user) throw new Error('INVALID_CREDENTIALS')

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) throw new Error('INVALID_CREDENTIALS')

    const accessToken = signAccessToken(user.id)
    const refreshToken = signRefreshToken(user.id)
    const expiresAt = new Date(Date.now() + msFromExpiry(env.JWT_REFRESH_EXPIRES_IN))

    await authRepository.createRefreshToken({ token: refreshToken, userId: user.id, expiresAt })

    const { password: _pw, ...safeUser } = user
    return { accessToken, refreshToken, user: safeUser }
  },

  async refresh(token: string) {
    let payload: { sub: string }
    try {
      payload = verifyRefreshToken(token)
    } catch {
      throw new Error('INVALID_TOKEN')
    }

    const stored = await authRepository.findRefreshToken(token)
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new Error('INVALID_TOKEN')
    }

    await authRepository.revokeRefreshToken(stored.id)

    const accessToken = signAccessToken(payload.sub)
    const newRefreshToken = signRefreshToken(payload.sub)
    const expiresAt = new Date(Date.now() + msFromExpiry(env.JWT_REFRESH_EXPIRES_IN))

    await authRepository.createRefreshToken({
      token: newRefreshToken,
      userId: payload.sub,
      expiresAt,
    })

    return { accessToken, refreshToken: newRefreshToken }
  },

  async logout(token: string) {
    const stored = await authRepository.findRefreshToken(token)
    if (stored && !stored.revokedAt) {
      await authRepository.revokeRefreshToken(stored.id)
    }
  },
}