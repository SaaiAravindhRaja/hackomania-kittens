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


// Client

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
 * Creates the `users` table if it doesn't already exist.
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
        created_at      DateTime64(3, 'UTC') DEFAULT now64()
      )
      ENGINE = MergeTree()
      ORDER BY (email)
    `,
  });
  console.log("✓ Table 'users' is ready.");
}

// ---------------------------------------------------------------------------
// Interledger wallet verification
// ---------------------------------------------------------------------------

/**
 * Verifies a wallet address exists by calling the Open Payments API.
 * Wallet address format: $hostname/username (e.g. $ilp.interledger-test.dev/alice)
 *
 * @param {string} walletAddress - e.g. "$ilp.interledger-test.dev/alice"
 * @returns {Promise<{valid: boolean, details?: object, error?: string}>}
 */
export async function verifyWalletAddress(walletAddress) {
  try {
    const trimmed = walletAddress.trim()

    // Must start with $
    if (!trimmed.startsWith('$')) {
      return { valid: false, error: 'Wallet address must start with $' }
    }

    // Convert $hostname/path → https://hostname/path
    const url = 'https://' + trimmed.slice(1)

    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!res.ok) {
      return { valid: false, error: `Wallet address not found (status ${res.status})` }
    }

    const details = await res.json()

    // A valid Open Payments wallet returns an "id" field
    if (!details.id) {
      return { valid: false, error: 'Invalid wallet response from Interledger' }
    }

    return { valid: true, details }
  } catch (err) {
    return { valid: false, error: `Could not reach Interledger: ${err.message}` }
  }
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

/**
 * Registers a new user.
 *
 * @param {object} client - ClickHouse client
 * @param {string} username
 * @param {string} email
 * @param {string} plainPassword  - plain-text; hashed before storage
 * @returns {Promise<{user_id, username, email, created_at}>}
 * @throws {Error} if the email is already taken
 */
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
        created_at: createdAt,
      },
    ],
    format: "JSONEachRow",
  });

  console.log(`✓ Registered user '${username}' (${userId})`);
  return { user_id: userId, username, email: normalizedEmail, country, postal_code: postalCode, wallet_address: walletAddress, created_at: createdAt };
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
      SELECT user_id, username, email, password_hash, created_at
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
    created_at: user.created_at,
  };
}

// ---------------------------------------------------------------------------
// Queries

/** Fetch a single user by email (password_hash excluded). */
export async function getUserByEmail(client, email) {
  const normalizedEmail = email.trim().toLowerCase();
  const result = await client.query({
    query: `
      SELECT user_id, username, email, created_at
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
      SELECT user_id, username, email, created_at
      FROM users WHERE user_id = {userId:UUID} LIMIT 1
    `,
    query_params: { userId },
    format: "JSONEachRow",
  });
  const rows = await result.json();
  return rows[0] ?? null;
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