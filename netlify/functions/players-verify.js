const bcrypt = require("bcryptjs");

const AIRTABLE_API = "https://api.airtable.com/v0";

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

  const apiKey = process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableName = process.env.AIRTABLE_PLAYERS_TABLE || "Players";
  const passwordField = process.env.AIRTABLE_PLAYERS_PASSWORD_FIELD || "PasswordHash";

  if (!apiKey || !baseId) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Faltan variables de entorno de Airtable." }),
    };
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (error) {
    return { statusCode: 400, body: JSON.stringify({ message: "JSON invalido." }) };
  }

  const playerId = payload.playerId;
  const password = payload.password;
  if (!playerId || !password) {
    return { statusCode: 400, body: JSON.stringify({ message: "Faltan campos." }) };
  }

  const recordUrl = `${AIRTABLE_API}/${baseId}/${encodeURIComponent(tableName)}/${playerId}`;
  const recordResponse = await fetch(recordUrl, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!recordResponse.ok) {
    return { statusCode: 404, body: JSON.stringify({ message: "Jugador no encontrado." }) };
  }
  const record = await recordResponse.json();
  const passwordHash = record.fields?.[passwordField];
  if (!passwordHash || typeof passwordHash !== "string") {
    return { statusCode: 403, body: JSON.stringify({ message: "Hash no encontrado." }) };
  }

  const valid = await bcrypt.compare(password, passwordHash);
  if (!valid) {
    return { statusCode: 401, body: JSON.stringify({ message: "Clave incorrecta." }) };
  }

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ ok: true }),
  };
};
