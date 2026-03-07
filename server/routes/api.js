import { Router } from 'express'
import { registerUser, authenticateUser, listUsers, verifyWalletAddress } from '../clickhouse_auth.js'
import { getClient } from '../clickhouse_auth.js'

const router = Router()
const client = getClient()
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const passwordPattern = /^(?=.*\d).{8,}$/
const postalCodePattern = /^[0-9A-Za-z\s-]{3,10}$/
const walletPattern = /^\$[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/[a-zA-Z0-9._~-]+$/

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

  if (!username || !email || !password || !country || !postalcode || !walletAddress) {
    return res.status(400).json({ error: 'All fields are required.' })
  }

  if (username.length < 2) {
    return res.status(400).json({ error: 'Name must be at least 2 characters.' })
  }

  if (!emailPattern.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' })
  }

  if (!passwordPattern.test(password)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters and include one number.' })
  }

  if (!postalCodePattern.test(postalcode)) {
    return res.status(400).json({ error: 'Enter a valid postal code.' })
  }

  if (!walletPattern.test(walletAddress)) {
    return res.status(400).json({
      error: 'Enter a valid Interledger wallet address (e.g. $ilp.interledger-test.dev/username).',
    })
  }

  try {
    // Verify Interledger wallet exists before saving
    const walletCheck = await verifyWalletAddress(walletAddress)
    if (!walletCheck.valid) {
      return res.status(400).json({ error: walletCheck.error ?? 'Invalid wallet address.' })
    }

    const user = await registerUser(client, username, email, password, country, postalcode, walletAddress)
    return res.status(201).json({ success: true, user })
  } catch (err) {
    if (String(err?.message).includes('already registered')) {
      return res.status(409).json({ error: err.message })
    }

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

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' })
  }

  if (!emailPattern.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' })
  }

  try {
    const user = await authenticateUser(client, email, password)

    if (!user) {
      return res.status(401).json({ error: 'Incorrect email or password.' })
    }

    return res.json({ success: true, user })
  } catch (err) {
    console.error('Login error:', err)
    return res.status(500).json({ error: 'Unable to log in right now. Please try again.' })
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

export default router
