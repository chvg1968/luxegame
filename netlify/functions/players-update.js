const bcrypt = require("bcryptjs");

const AIRTABLE_API = "https://api.airtable.com/v0";
const RATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_MAX = 5;
const rateStore = new Map();

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const ip =
    event.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    event.headers["client-ip"] ||
    "unknown";
  const now = Date.now();
  const entry = rateStore.get(ip) || { count: 0, resetAt: now + RATE_WINDOW_MS };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + RATE_WINDOW_MS;
  }
  entry.count += 1;
  rateStore.set(ip, entry);
  if (entry.count > RATE_MAX) {
    return { statusCode: 429, body: "Too Many Requests" };
  }

  const apiKey = (process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY || "").trim();
  const baseId = (process.env.AIRTABLE_BASE_ID || "").trim();
  const tableName = (process.env.AIRTABLE_PLAYERS_TABLE || "Players").trim();
  const statusField = (process.env.AIRTABLE_PLAYERS_STATUS_FIELD || "Status").trim();
  const passwordField = (process.env.AIRTABLE_PLAYERS_PASSWORD_FIELD || "PasswordHash").trim();

  if (!apiKey || !baseId) {
    return { statusCode: 500, body: "Missing Airtable env vars" };
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (error) {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const playerId = payload.playerId;
  const desiredStatus = payload.desiredStatus;
  const password = payload.password;

  if (!playerId || !desiredStatus || !password) {
    return { statusCode: 400, body: "Missing fields" };
  }

  const recordUrl = `${AIRTABLE_API}/${baseId}/${encodeURIComponent(tableName)}/${playerId}`;
  const recordResponse = await fetch(recordUrl, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!recordResponse.ok) {
    return { statusCode: 404, body: "Player not found" };
  }
  const record = await recordResponse.json();
  const passwordHash = record.fields?.[passwordField];
  if (!passwordHash || typeof passwordHash !== "string") {
    return { statusCode: 403, body: "Password hash missing" };
  }

  const valid = await bcrypt.compare(password, passwordHash);
  if (!valid) {
    return { statusCode: 401, body: "Invalid password" };
  }

  const updateResponse = await fetch(recordUrl, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: {
        [statusField]: desiredStatus,
      },
    }),
  });
  if (!updateResponse.ok) {
    return { statusCode: 500, body: "Update failed" };
  }
  const updated = await updateResponse.json();
  const statusValue = updated.fields?.[statusField] || desiredStatus;

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ status: statusValue }),
  };
};
