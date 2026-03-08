/**
 * clickhouse_auth.js
 * ------------------
 * Full Node.js module for storing & querying user registration credentials
 * in ClickHouse Cloud.
 *
 * Install dependencies:
 *   npm install @clickhouse/client bcryptjs dotenv uuid
 *
 * Environment variables (.env):
 *   CH_HOST       e.g. abc123.us-east-1.aws.clickhouse.cloud
 *   CH_PORT       default: 8443
 *   CH_USER       default: default
 *   CH_PASSWORD   your ClickHouse Cloud password
 *   CH_DATABASE   default: default
 */

import { createClient } from "@clickhouse/client";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import "dotenv/config";

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export function getClient() {
  return createClient({
    url: `https://${process.env.CH_HOST}:${process.env.CH_PORT ?? 8443}`,
    username: process.env.CH_USER ?? "default",
    password: process.env.CH_PASSWORD,
    database: process.env.CH_DATABASE ?? "default",
  });
}

// ---------------------------------------------------------------------------
// Schema setup
// ---------------------------------------------------------------------------

/**
 * Creates required tables if they don't already exist.
 * Call once at app startup.
 */
export async function createTable(client) {
  await client.command({
    query: `
      CREATE TABLE IF NOT EXISTS users (
        user_id         UUID          DEFAULT generateUUIDv4(),
        username        String,
        email           String,
        password_hash   String,
        country         String,
        postal_code     String,
        wallet_address  String,
        latitude        Float64,
        longitude       Float64,
        created_at      DateTime64(3, 'UTC') DEFAULT now64()
      )
      ENGINE = MergeTree()
      ORDER BY (email)
    `,
  });
  await client.command({
    query: `
      CREATE TABLE IF NOT EXISTS auth_events (
        event_id     UUID                DEFAULT generateUUIDv4(),
        event_type   LowCardinality(String),
        success      UInt8,
        email        String,
        user_id      String,
        reason       String,
        ip_address   String,
        user_agent   String,
        created_at   DateTime64(3, 'UTC') DEFAULT now64()
      )
      ENGINE = MergeTree()
      ORDER BY (created_at, email)
    `,
  });

  await client.command({
    query: `
      CREATE TABLE IF NOT EXISTS donation_events (
        event_id              UUID                DEFAULT generateUUIDv4(),
        donation_id           String,
        status                LowCardinality(String),
        user_id               String,
        email                 String,
        donor_wallet_address  String,
        fund_wallet_url       String,
        amount_cents          Int64,
        redirect_url          String,
        outgoing_payment_id   String,
        error_message         String,
        created_at            DateTime64(3, 'UTC') DEFAULT now64()
      )
      ENGINE = MergeTree()
      ORDER BY (created_at, donation_id)
    `,
  });

  await client.command({
    query: `
      CREATE TABLE IF NOT EXISTS payout_events (
        event_id                 UUID                DEFAULT generateUUIDv4(),
        disaster_event_id        String,
        disaster_event_title     String,
        user_id                  String,
        username                 String,
        recipient_wallet_address String,
        amount_cents             Int64,
        success                  UInt8,
        outgoing_payment_id      String,
        error_message            String,
        created_at               DateTime64(3, 'UTC') DEFAULT now64()
      )
      ENGINE = MergeTree()
      ORDER BY (created_at, disaster_event_id, user_id)
    `,
  });

  console.log("✓ Tables 'users', 'auth_events', 'donation_events', and 'payout_events' are ready.");
}

// ---------------------------------------------------------------------------
// Interledger wallet verification
// ---------------------------------------------------------------------------

/**
 * Verifies a wallet address exists using the Open Payments SDK.
 * Wallet address format: $hostname/username (e.g. $ilp.interledger-test.dev/alice)
 *
 * @param {string} walletAddress - e.g. "$ilp.interledger-test.dev/alice"
 * @returns {Promise<{valid: boolean, details?: object, error?: string}>}
 */
export async function verifyWalletAddress(walletAddress) {
  try {
    const trimmed = walletAddress.trim()

    if (!trimmed.startsWith('$')) {
      return { valid: false, error: 'Wallet address must start with $' }
    }

    // Convert $hostname/path → https://hostname/path
    const url = 'https://' + trimmed.slice(1)

    const { createUnauthenticatedClient } = await import('@interledger/open-payments')
    const client = await createUnauthenticatedClient({ walletAddressUrl: url })

    const details = await client.walletAddress.get({ url })

    if (!details || !details.id) {
      return { valid: false, error: 'Wallet address not found on Interledger network' }
    }

    return { valid: true, details }
  } catch (err) {
    return { valid: false, error: `Invalid wallet address: ${err.message}` }
  }
}

// ---------------------------------------------------------------------------
// Geocoding
// ---------------------------------------------------------------------------

/**
 * Converts a postal code + country to [longitude, latitude] coordinates
 * using OpenStreetMap Nominatim (free, no API key required).
 */
export async function postalCodeToCoords(postalCode, country) {
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
// Register
// ---------------------------------------------------------------------------

export async function registerUser(client, username, email, plainPassword, country, postalCode, walletAddress) {
  const normalizedEmail = email.trim().toLowerCase();

  // Duplicate check
  const check = await client.query({
    query: "SELECT count() AS n FROM users WHERE email = {email:String}",
    query_params: { email: normalizedEmail },
    format: "JSONEachRow",
  });
  const [{ n }] = await check.json();
  if (Number(n) > 0) {
    throw new Error(`Email '${normalizedEmail}' is already registered.`);
  }

  // Geocode postal code to coordinates
  const coords = await postalCodeToCoords(postalCode, country)
  const longitude = coords ? coords[0] : 0
  const latitude  = coords ? coords[1] : 0

  if (!coords) {
    console.warn(`⚠ Could not geocode postal code ${postalCode}, ${country} — storing 0,0`)
  }

  const passwordHash = await bcrypt.hash(plainPassword, 12);
  const userId = uuidv4();
  const createdAt = new Date().toISOString().replace("T", " ").replace("Z", "");

  await client.insert({
    table: "users",
    values: [
      {
        user_id: userId,
        username: username.trim(),
        email: normalizedEmail,
        password_hash: passwordHash,
        country: country.trim(),
        postal_code: postalCode.trim(),
        wallet_address: walletAddress.trim(),
        latitude,
        longitude,
        created_at: createdAt,
      },
    ],
    format: "JSONEachRow",
  });

  console.log(`✓ Registered user '${username}' (${userId}) at [${longitude}, ${latitude}]`)
  return { user_id: userId, username, email: normalizedEmail, country, postal_code: postalCode, wallet_address: walletAddress, latitude, longitude, created_at: createdAt };
}

// ---------------------------------------------------------------------------
// Authenticate (login)
// ---------------------------------------------------------------------------

/**
 * Verifies credentials.
 *
 * @returns {Promise<{user_id, username, email, created_at} | null>}
 *   User object on success, null on bad credentials.
 */
export async function authenticateUser(client, email, plainPassword) {
  const normalizedEmail = email.trim().toLowerCase();

  const result = await client.query({
    query: `
      SELECT user_id, username, email, password_hash, country, postal_code, wallet_address, created_at
      FROM users
      WHERE email = {email:String}
      LIMIT 1
    `,
    query_params: { email: normalizedEmail },
    format: "JSONEachRow",
  });

  const rows = await result.json();
  if (!rows.length) return null;

  const user = rows[0];
  const match = await bcrypt.compare(plainPassword, user.password_hash);
  if (!match) return null;

  return {
    user_id: user.user_id,
    username: user.username,
    email: user.email,
    country: user.country,
    postal_code: user.postal_code,
    wallet_address: user.wallet_address,
    created_at: user.created_at,
  };
}

// ---------------------------------------------------------------------------
// Event logs
// ---------------------------------------------------------------------------

function cleanString(value) {
  return String(value ?? "").trim();
}

export async function logAuthEvent(
  client,
  { eventType = "login", success = false, email = "", userId = "", reason = "", ipAddress = "", userAgent = "" } = {}
) {
  await client.insert({
    table: "auth_events",
    values: [
      {
        event_type: cleanString(eventType),
        success: success ? 1 : 0,
        email: cleanString(email).toLowerCase(),
        user_id: cleanString(userId),
        reason: cleanString(reason),
        ip_address: cleanString(ipAddress),
        user_agent: cleanString(userAgent),
      },
    ],
    format: "JSONEachRow",
  });
}

export async function logDonationEvent(
  client,
  {
    donationId = "",
    status = "initiated",
    userId = "",
    email = "",
    donorWalletAddress = "",
    fundWalletUrl = "",
    amountCents = 0,
    redirectUrl = "",
    outgoingPaymentId = "",
    errorMessage = "",
  } = {}
) {
  await client.insert({
    table: "donation_events",
    values: [
      {
        donation_id: cleanString(donationId),
        status: cleanString(status),
        user_id: cleanString(userId),
        email: cleanString(email).toLowerCase(),
        donor_wallet_address: cleanString(donorWalletAddress),
        fund_wallet_url: cleanString(fundWalletUrl),
        amount_cents: Number.isFinite(Number(amountCents)) ? Number(amountCents) : 0,
        redirect_url: cleanString(redirectUrl),
        outgoing_payment_id: cleanString(outgoingPaymentId),
        error_message: cleanString(errorMessage),
      },
    ],
    format: "JSONEachRow",
  });
}

export async function logPayoutEvent(
  client,
  {
    disasterEventId = "",
    disasterEventTitle = "",
    userId = "",
    username = "",
    recipientWalletAddress = "",
    amountCents = 0,
    success = false,
    outgoingPaymentId = "",
    errorMessage = "",
  } = {}
) {
  await client.insert({
    table: "payout_events",
    values: [
      {
        disaster_event_id: cleanString(disasterEventId),
        disaster_event_title: cleanString(disasterEventTitle),
        user_id: cleanString(userId),
        username: cleanString(username),
        recipient_wallet_address: cleanString(recipientWalletAddress),
        amount_cents: Number.isFinite(Number(amountCents)) ? Number(amountCents) : 0,
        success: success ? 1 : 0,
        outgoing_payment_id: cleanString(outgoingPaymentId),
        error_message: cleanString(errorMessage),
      },
    ],
    format: "JSONEachRow",
  });
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Fetch a single user by email (password_hash excluded). */
export async function getUserByEmail(client, email) {
  const normalizedEmail = email.trim().toLowerCase();
  const result = await client.query({
    query: `
      SELECT user_id, username, email, country, postal_code, wallet_address, latitude, longitude, created_at
      FROM users WHERE email = {email:String} LIMIT 1
    `,
    query_params: { email: normalizedEmail },
    format: "JSONEachRow",
  });
  const rows = await result.json();
  return rows[0] ?? null;
}

/** Fetch a single user by user_id. */
export async function getUserById(client, userId) {
  const result = await client.query({
    query: `
      SELECT user_id, username, email, country, postal_code, wallet_address, latitude, longitude, created_at, donated_total_cents
      FROM users WHERE user_id = {userId:UUID} LIMIT 1
    `,
    query_params: { userId },
    format: "JSONEachRow",
  });
  const rows = await result.json();
  return rows[0] ?? null;
}

/** Update a user's wallet address and return the latest record. */
export async function updateUserWallet(client, userId, walletAddress) {
  await client.command({
    query: `
      ALTER TABLE users
      UPDATE wallet_address = {walletAddress:String}
      WHERE user_id = {userId:UUID}
      SETTINGS mutations_sync = 2
    `,
    query_params: {
      userId,
      walletAddress: walletAddress.trim(),
    },
  });

  return getUserById(client, userId);
}

/** List the most recently registered users. */
export async function listUsers(client, limit = 50) {
  const result = await client.query({
    query: `
      SELECT user_id, username, email, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT {limit:UInt32}
    `,
    query_params: { limit },
    format: "JSONEachRow",
  });
  return result.json();
}

export async function updateRunningTotal(client, userId, increment) {
  const user = await getUserById(client, userId);
  console.log(user);

  console.log(user.donated_total_cents + increment);
  const result = await client.query({
    query: `ALTER TABLE users
    UPDATE donated_total_cents = {running_total:Int64}
    WHERE user_id = {userId:UUID}
    SETTINGS mutations_sync = 2
    `, query_params: { userId, running_total: user.donated_total_cents + increment},
  });

  return getUserById(client, userId);
}
