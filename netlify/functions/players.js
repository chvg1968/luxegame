const AIRTABLE_API = "https://api.airtable.com/v0";

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const apiKey = (process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY || "").trim();
  const baseId = (process.env.AIRTABLE_BASE_ID || "").trim();
  const tableName = (process.env.AIRTABLE_PLAYERS_TABLE || "Players").trim();
  const viewName = (process.env.AIRTABLE_PLAYERS_VIEW || "").trim();
  const nameField = (process.env.AIRTABLE_PLAYERS_NAME_FIELD || "Name").trim();
  const statusField = (process.env.AIRTABLE_PLAYERS_STATUS_FIELD || "Status").trim();

  if (!apiKey || !baseId) {
    return { statusCode: 500, body: "Missing Airtable env vars" };
  }

  if (event.queryStringParameters?.debug === "1") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        hasApiKey: Boolean(apiKey),
        hasBaseId: Boolean(baseId),
        baseId,
        tableName,
        viewName: viewName || "",
        nameField,
        statusField,
      }),
    };
  }

  const params = new URLSearchParams();
  if (viewName) {
    params.set("view", viewName);
  }
  params.append("fields[]", nameField);
  params.append("fields[]", statusField);
  params.set("pageSize", "100");

  const url = `${AIRTABLE_API}/${baseId}/${encodeURIComponent(tableName)}?${params.toString()}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    return {
      statusCode: response.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Error al leer Players desde Airtable.",
        airtableStatus: response.status,
        airtableError: data,
      }),
    };
  }
  const players = Array.isArray(data.records)
    ? data.records
        .map((record) => ({
          id: record.id,
          name: record.fields?.[nameField],
          status: record.fields?.[statusField] || "Active",
        }))
        .filter((record) => typeof record.name === "string" && record.name.trim().length > 0)
    : [];

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ players }),
  };
};
