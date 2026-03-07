import { Router } from 'express'
import { createClient } from '@clickhouse/client'
import { loadEnvFile } from 'node:process'
import haversine from 'haversine'
import { runDisasterPayouts } from './payments/payments.js'

try {
  loadEnvFile()
} catch (error) {
  console.log('No .env file found, relying on environment variables')
}

const router = Router()

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MAX_RADIUS_KM    = 2000  // beyond this → no payment
const MAX_PAYMENT_CENTS = 10000 // $100.00 at scale 2 — full payment for those at epicenter

// ---------------------------------------------------------------------------
// ClickHouse client
// ---------------------------------------------------------------------------

function getClient() {
  return createClient({
    url: `https://${process.env.CH_HOST}:${process.env.CH_PORT ?? 8443}`,
    username: process.env.CH_USER ?? 'default',
    password: process.env.CH_PASSWORD,
    database: process.env.CH_DATABASE ?? 'default',
  })
}

// ---------------------------------------------------------------------------
// Haversine helper  (GeoJSON coords are [lon, lat])
// ---------------------------------------------------------------------------

function getDistanceKm(a, b) {
  return haversine(
    { latitude: a[1], longitude: a[0] },
    { latitude: b[1], longitude: b[0] },
    { unit: 'km' }
  )
}

// ---------------------------------------------------------------------------
// Convert postal code → coordinates via Open Street Map Nominatim (free, no key)
// ---------------------------------------------------------------------------

async function postalCodeToCoords(postalCode, country) {
  try {
    const query = encodeURIComponent(`${postalCode}, ${country}`)
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
      { headers: { 'User-Agent': 'KittenFinance/1.0' } }
    )
    const data = await res.json()
    if (!data.length) return null
    return [parseFloat(data[0].lon), parseFloat(data[0].lat)] // [lon, lat]
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Payment falloff — linear decay from epicenter to MAX_RADIUS_KM
// ---------------------------------------------------------------------------

function calculatePayment(distanceKm) {
  if (distanceKm >= MAX_RADIUS_KM) return 0
  const ratio = 1 - (distanceKm / MAX_RADIUS_KM) // 1.0 at center, 0.0 at edge
  return Math.round(MAX_PAYMENT_CENTS * ratio)
}

// ---------------------------------------------------------------------------
// Get latest disaster events from NASA EONET
// ---------------------------------------------------------------------------

async function getEvents(limit = 1) {
  const res = await fetch(`https://eonet.gsfc.nasa.gov/api/v3/events?limit=${limit}`)
  if (!res.ok) throw new Error(`EONET error: ${res.status}`)
  const data = await res.json()
  return data.events
}

// ---------------------------------------------------------------------------
// Get epicenter — latest coordinate point of the event
// ---------------------------------------------------------------------------

function getEpicenter(event) {
  const points = event.geometry.filter(g => g.type === 'Point')
  if (!points.length) return null
  return points[points.length - 1].coordinates // most recent point
}

// ---------------------------------------------------------------------------
// Find affected users and calculate their payment amounts
// ---------------------------------------------------------------------------

async function getAffectedUsers(epicenterCoords) {
  const client = getClient()

  const rows = await client.query({
    query: 'SELECT user_id, username, email, country, postal_code, wallet_address, latitude, longitude FROM users',
    format: 'JSONEachRow',
  })

  const users = await rows.json()
  const affected = []

  for (const user of users) {
    // Skip users with no coordinates stored
    if (!user.latitude || !user.longitude) {
      console.log(`⚠ No coordinates for ${user.username}, skipping`)
      continue
    }

    const userCoords = [user.longitude, user.latitude]
    const distanceKm = getDistanceKm(epicenterCoords, userCoords)
    const paymentCents = calculatePayment(distanceKm)

    console.log(`  ${user.username}: ${Math.round(distanceKm)}km away → $${(paymentCents / 100).toFixed(2)}`)

    if (paymentCents > 0) {
      affected.push({
        ...user,
        distanceKm: Math.round(distanceKm),
        paymentCents,
        paymentDollars: (paymentCents / 100).toFixed(2),
      })
    }
  }

  // Sort by distance — closest first
  return affected.sort((a, b) => a.distanceKm - b.distanceKm)
}

function getTestEvent() {
  return {
    id: 'EONET_18423',
    title: 'Tropical Cyclone 26S',
    categories: [{ id: 'severeStorms', title: 'Severe Storms' }],
    geometry: [
      { type: 'Point', date: '2026-03-06T00:00:00Z', coordinates: [113.7, -15.8] },
      { type: 'Point', date: '2026-03-06T06:00:00Z', coordinates: [113.4, -15.9] },
      { type: 'Point', date: '2026-03-06T12:00:00Z', coordinates: [112.9, -15.9] },
      { type: 'Point', date: '2026-03-06T18:00:00Z', coordinates: [112.5, -16.1] },
      { type: 'Point', date: '2026-03-07T00:00:00Z', coordinates: [111.8, -16.5] },
    ],
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// GET /epicenter
// Returns the latest disaster event and all affected users with payment amounts
router.get('/', async (req, res) => {
  try {
    const events = await getEvents(1)
    const event = events[0]
    const epicenter = getEpicenter(event)

    if (!epicenter) {
      return res.status(400).json({ error: 'No point geometry found for this event' })
    }

    console.log(`\n🌍 Disaster: ${event.title}`)
    console.log(`📍 Epicenter: [${epicenter}]`)
    console.log(`👥 Checking affected users...\n`)

    const affectedUsers = await getAffectedUsers(epicenter)

    return res.json({
      event: {
        id: event.id,
        title: event.title,
        categories: event.categories,
        epicenter,
        date: event.geometry[event.geometry.length - 1].date,
      },
      maxRadiusKm: MAX_RADIUS_KM,
      maxPaymentDollars: (MAX_PAYMENT_CENTS / 100).toFixed(2),
      affectedCount: affectedUsers.length,
      affectedUsers,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message })
  }
})

// GET /epicenter/test
// Uses the hardcoded Tropical Cyclone 26S test case
router.get('/test', async (req, res) => {
  try {
    const testEvent = getTestEvent()

    const epicenter = getEpicenter(testEvent)

    console.log(`\n🌍 TEST Disaster: ${testEvent.title}`)
    console.log(`📍 Epicenter: [${epicenter}]`)
    console.log(`👥 Checking affected users...\n`)

    const affectedUsers = await getAffectedUsers(epicenter)

    return res.json({
      event: {
        id: testEvent.id,
        title: testEvent.title,
        categories: testEvent.categories,
        epicenter,
        date: testEvent.geometry[testEvent.geometry.length - 1].date,
      },
      maxRadiusKm: MAX_RADIUS_KM,
      maxPaymentDollars: (MAX_PAYMENT_CENTS / 100).toFixed(2),
      affectedCount: affectedUsers.length,
      affectedUsers,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message })
  }
})

// POST /epicentre/trigger-payouts
// Body: { mode?: 'live' | 'test' }
router.post('/trigger-payouts', async (req, res) => {
  try {
    const mode = String(req.body?.mode ?? 'live').toLowerCase()
    const event =
      mode === 'test'
        ? getTestEvent()
        : (await getEvents(1))[0]

    if (!event) {
      return res.status(404).json({ error: 'No disaster events available.' })
    }

    const epicenter = getEpicenter(event)

    if (!epicenter) {
      return res.status(400).json({ error: 'No point geometry found for this event.' })
    }

    const affectedUsers = await getAffectedUsers(epicenter)

    if (affectedUsers.length === 0) {
      return res.json({
        success: true,
        event: {
          id: event.id,
          title: event.title,
          categories: event.categories,
          epicenter,
          date: event.geometry[event.geometry.length - 1]?.date,
        },
        affectedCount: 0,
        payoutSummary: {
          successCount: 0,
          failureCount: 0,
          totalPayoutCents: 0,
          totalPayoutDollars: '0.00',
          results: [],
        },
        message: 'No eligible recipients found for this event.',
      })
    }

    const payoutSummary = await runDisasterPayouts(affectedUsers, {
      id: event.id,
      title: event.title,
    })

    return res.json({
      success: true,
      event: {
        id: event.id,
        title: event.title,
        categories: event.categories,
        epicenter,
        date: event.geometry[event.geometry.length - 1]?.date,
      },
      affectedCount: affectedUsers.length,
      payoutSummary,
    })
  } catch (err) {
    console.error('Trigger payout error:', err)
    return res.status(500).json({ error: err.message })
  }
})

export default router
