import { Router } from 'express'
import {
  registerUser,
  authenticateUser,
  listUsers,
  verifyWalletAddress,
  getUserById,
  updateUserWallet,
  logAuthEvent,
} from '../clickhouse_auth.js'
import { getClient } from '../clickhouse_auth.js'
import { createFund, getAllFunds, getFund, joinFund } from '../lib/store.js'

const router = Router()
const client = getClient()
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const passwordPattern = /^(?=.*\d).{8,}$/
const postalCodePattern = /^[0-9A-Za-z\s-]{3,10}$/
const walletPattern = /^\$[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/[a-zA-Z0-9._~-]+$/
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function recordAuthEvent(event) {
  try {
    await logAuthEvent(client, event)
  } catch (error) {
    console.error('Auth event logging failed:', error)
  }
}

// ── Health ────────────────────────────────────────────────────
router.get('/health', (req, res) => res.json({ status: 'ok' }))

// ── Register ──────────────────────────────────────────────────
// POST /api/auth/register
// Body: { username, email, password, country, postalcode, walletAddress }
router.post('/auth/register', async (req, res) => {
  const username = String(req.body?.username ?? '').trim()
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  const password = String(req.body?.password ?? '')
  const country = String(req.body?.country ?? '').trim()
  const postalcode = String(req.body?.postalcode ?? '').trim()
  const walletAddress = String(req.body?.walletAddress ?? '').trim()
  const ipAddress = req.ip ?? ''
  const userAgent = req.get('user-agent') ?? ''

  if (!username || !email || !password || !country || !postalcode || !walletAddress) {
    await recordAuthEvent({
      eventType: 'register',
      success: false,
      email,
      reason: 'Missing required fields',
      ipAddress,
      userAgent,
    })
    return res.status(400).json({ error: 'All fields are required.' })
  }

  if (username.length < 2) {
    await recordAuthEvent({
      eventType: 'register',
      success: false,
      email,
      reason: 'Name must be at least 2 characters',
      ipAddress,
      userAgent,
    })
    return res.status(400).json({ error: 'Name must be at least 2 characters.' })
  }

  if (!emailPattern.test(email)) {
    await recordAuthEvent({
      eventType: 'register',
      success: false,
      email,
      reason: 'Invalid email format',
      ipAddress,
      userAgent,
    })
    return res.status(400).json({ error: 'Enter a valid email address.' })
  }

  if (!passwordPattern.test(password)) {
    await recordAuthEvent({
      eventType: 'register',
      success: false,
      email,
      reason: 'Invalid password format',
      ipAddress,
      userAgent,
    })
    return res.status(400).json({ error: 'Password must be at least 8 characters and include one number.' })
  }

  if (!postalCodePattern.test(postalcode)) {
    await recordAuthEvent({
      eventType: 'register',
      success: false,
      email,
      reason: 'Invalid postal code format',
      ipAddress,
      userAgent,
    })
    return res.status(400).json({ error: 'Enter a valid postal code.' })
  }

  if (!walletPattern.test(walletAddress)) {
    await recordAuthEvent({
      eventType: 'register',
      success: false,
      email,
      reason: 'Invalid wallet address format',
      ipAddress,
      userAgent,
    })
    return res.status(400).json({
      error: 'Enter a valid Interledger wallet address (e.g. $ilp.interledger-test.dev/username).',
    })
  }

  try {
    // Verify Interledger wallet exists before saving
    const walletCheck = await verifyWalletAddress(walletAddress)
    if (!walletCheck.valid) {
      await recordAuthEvent({
        eventType: 'register',
        success: false,
        email,
        reason: walletCheck.error ?? 'Invalid wallet address',
        ipAddress,
        userAgent,
      })
      return res.status(400).json({ error: walletCheck.error ?? 'Invalid wallet address.' })
    }

    const user = await registerUser(client, username, email, password, country, postalcode, walletAddress)
    await recordAuthEvent({
      eventType: 'register',
      success: true,
      email: user.email,
      userId: user.user_id,
      reason: 'Registration successful',
      ipAddress,
      userAgent,
    })
    return res.status(201).json({ success: true, user })
  } catch (err) {
    if (String(err?.message).includes('already registered')) {
      await recordAuthEvent({
        eventType: 'register',
        success: false,
        email,
        reason: err.message,
        ipAddress,
        userAgent,
      })
      return res.status(409).json({ error: err.message })
    }

    await recordAuthEvent({
      eventType: 'register',
      success: false,
      email,
      reason: err instanceof Error ? err.message : 'Unknown registration error',
      ipAddress,
      userAgent,
    })
    console.error('Registration error:', err)
    return res.status(500).json({ error: 'Unable to register user right now. Please try again.' })
  }
})

// ── Login ─────────────────────────────────────────────────────
// POST /api/auth/login
// Body: { email, password }
router.post('/auth/login', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  const password = String(req.body?.password ?? '')
  const ipAddress = req.ip ?? ''
  const userAgent = req.get('user-agent') ?? ''

  if (!email || !password) {
    await recordAuthEvent({
      eventType: 'login',
      success: false,
      email,
      reason: 'Missing email or password',
      ipAddress,
      userAgent,
    })
    return res.status(400).json({ error: 'Email and password are required.' })
  }

  if (!emailPattern.test(email)) {
    await recordAuthEvent({
      eventType: 'login',
      success: false,
      email,
      reason: 'Invalid email format',
      ipAddress,
      userAgent,
    })
    return res.status(400).json({ error: 'Enter a valid email address.' })
  }

  try {
    const user = await authenticateUser(client, email, password)

    if (!user) {
      await recordAuthEvent({
        eventType: 'login',
        success: false,
        email,
        reason: 'Incorrect email or password',
        ipAddress,
        userAgent,
      })
      return res.status(401).json({ error: 'Incorrect email or password.' })
    }

    await recordAuthEvent({
      eventType: 'login',
      success: true,
      email: user.email,
      userId: user.user_id,
      reason: 'Login successful',
      ipAddress,
      userAgent,
    })
    return res.json({ success: true, user })
  } catch (err) {
    await recordAuthEvent({
      eventType: 'login',
      success: false,
      email,
      reason: err instanceof Error ? err.message : 'Unknown login error',
      ipAddress,
      userAgent,
    })
    console.error('Login error:', err)
    return res.status(500).json({ error: 'Unable to log in right now. Please try again.' })
  }
})

// ── Wallet update ─────────────────────────────────────────────
// PUT /api/auth/wallet
// Body: { userId, email, walletAddress }
router.put('/auth/wallet', async (req, res) => {
  const userId = String(req.body?.userId ?? '').trim()
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  const walletAddress = String(req.body?.walletAddress ?? '').trim()
  const ipAddress = req.ip ?? ''
  const userAgent = req.get('user-agent') ?? ''

  if (!userId || !email || !walletAddress) {
    await recordAuthEvent({
      eventType: 'wallet_update',
      success: false,
      email,
      userId,
      reason: 'Missing userId, email, or walletAddress',
      ipAddress,
      userAgent,
    })
    return res.status(400).json({ error: 'userId, email, and walletAddress are required.' })
  }

  if (!uuidPattern.test(userId)) {
    await recordAuthEvent({
      eventType: 'wallet_update',
      success: false,
      email,
      userId,
      reason: 'Invalid userId format',
      ipAddress,
      userAgent,
    })
    return res.status(400).json({ error: 'Invalid userId format.' })
  }

  if (!emailPattern.test(email)) {
    await recordAuthEvent({
      eventType: 'wallet_update',
      success: false,
      email,
      userId,
      reason: 'Invalid email format',
      ipAddress,
      userAgent,
    })
    return res.status(400).json({ error: 'Enter a valid email address.' })
  }

  if (!walletPattern.test(walletAddress)) {
    await recordAuthEvent({
      eventType: 'wallet_update',
      success: false,
      email,
      userId,
      reason: 'Invalid wallet address format',
      ipAddress,
      userAgent,
    })
    return res.status(400).json({
      error: 'Enter a valid Interledger wallet address (e.g. $ilp.interledger-test.dev/username).',
    })
  }

  try {
    const user = await getUserById(client, userId)
    if (!user || String(user.email ?? '').toLowerCase() !== email) {
      await recordAuthEvent({
        eventType: 'wallet_update',
        success: false,
        email,
        userId,
        reason: 'User not found or email mismatch',
        ipAddress,
        userAgent,
      })
      return res.status(404).json({ error: 'User not found.' })
    }

    if (String(user.wallet_address ?? '').trim() === walletAddress) {
      return res.json({ success: true, user, message: 'Wallet address is unchanged.' })
    }

    const walletCheck = await verifyWalletAddress(walletAddress)
    if (!walletCheck.valid) {
      await recordAuthEvent({
        eventType: 'wallet_update',
        success: false,
        email,
        userId,
        reason: walletCheck.error ?? 'Invalid wallet address',
        ipAddress,
        userAgent,
      })
      return res.status(400).json({ error: walletCheck.error ?? 'Invalid wallet address.' })
    }

    const updatedUser = await updateUserWallet(client, userId, walletAddress)
    await recordAuthEvent({
      eventType: 'wallet_update',
      success: true,
      email,
      userId,
      reason: 'Wallet updated successfully',
      ipAddress,
      userAgent,
    })

    return res.json({ success: true, user: updatedUser })
  } catch (err) {
    await recordAuthEvent({
      eventType: 'wallet_update',
      success: false,
      email,
      userId,
      reason: err instanceof Error ? err.message : 'Unknown wallet update error',
      ipAddress,
      userAgent,
    })
    console.error('Wallet update error:', err)
    return res.status(500).json({ error: 'Unable to update wallet right now. Please try again.' })
  }
})

// ── List users (admin/dev only) ───────────────────────────────
// GET /api/auth/users
router.get('/auth/users', async (req, res) => {
  try {
    const users = await listUsers(client)
    return res.json(users)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

// ── Funds ──────────────────────────────────────────────────────
router.post('/funds', (req, res) => {
  const { name, description, targetAmount, creatorId } = req.body ?? {}
  if (!name || !creatorId) return res.status(400).json({ error: 'name and creatorId are required' })
  const fund = createFund({ name, description, targetAmount, creatorId })
  res.status(201).json({ fund })
})

router.get('/funds', (req, res) => {
  res.json({ funds: getAllFunds() })
})

router.get('/funds/:id', (req, res) => {
  const fund = getFund(req.params.id)
  if (!fund) return res.status(404).json({ error: 'Fund not found' })
  res.json({ fund })
})

router.post('/funds/:id/join', (req, res) => {
  const userId = String(req.body?.userId ?? '').trim()
  if (!userId) return res.status(400).json({ error: 'userId is required' })
  const fund = joinFund(req.params.id, userId)
  if (!fund) return res.status(404).json({ error: 'Fund not found' })
  res.json({ fund })
})

// ── Stats ──────────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  const all = getAllFunds()
  const totalContributed = all.reduce((s, f) => s + (f.currentAmount || 0), 0)
  const memberIds = new Set(all.flatMap(f => f.members))
  res.json({
    totalContributed,
    contributionCount: all.length,
    totalPaidOut: 0,
    payoutCount: 0,
    memberCount: memberIds.size,
    fundCount: all.length,
  })
})

router.get('/stats/transactions', (req, res) => {
  res.json({ transactions: [] })
})

// ── Disasters ──────────────────────────────────────────────────
router.get('/disasters/active', (req, res) => {
  res.json({ disasters: [] })
})

export default router
