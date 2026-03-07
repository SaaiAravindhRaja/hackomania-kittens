import { Router } from 'express'
import { registerUser, authenticateUser, listUsers, verifyWalletAddress } from '../clickhouse_auth.js'
import { getClient } from '../clickhouse_auth.js'

const router = Router()
const client = getClient()

// ── Health ────────────────────────────────────────────────────
router.get('/health', (req, res) => res.json({ status: 'ok' }))

// ── Register ──────────────────────────────────────────────────
// POST /api/auth/register
// Body: { username, email, password, country, postalcode, walletAddress }
router.post('/auth/register', async (req, res) => {
  const { username, email, password, country, postalcode, walletAddress } = req.body ?? {}

  if (!username || !email || !password || !country || !postalcode || !walletAddress) {
    return res.status(400).json({ error: 'All fields are required.' })
  }

  // Verify Interledger wallet exists before saving
  const walletCheck = await verifyWalletAddress(walletAddress)
  if (!walletCheck.valid) {
    return res.status(400).json({ error: `Invalid wallet address: ${walletCheck.error}` })
  }

  try {
    const user = await registerUser(client, username, email, password, country, postalcode, walletAddress)
    return res.status(201).json({ success: true, user })
  } catch (err) {
    return res.status(409).json({ error: err.message })
  }
})

// ── Login ─────────────────────────────────────────────────────
// POST /api/auth/login
// Body: { email, password }
router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body ?? {}

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required.' })
  }

  const user = await authenticateUser(client, email, password)

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials.' })
  }

  return res.json({ success: true, user })
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