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

  const apiKey = process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableName = process.env.AIRTABLE_PLAYERS_TABLE || "Players";
  const viewName = process.env.AIRTABLE_PLAYERS_VIEW;
  const nameField = process.env.AIRTABLE_PLAYERS_NAME_FIELD || "Name";
  const statusField = process.env.AIRTABLE_PLAYERS_STATUS_FIELD || "Status";

  if (!apiKey || !baseId) {
    return { statusCode: 500, body: "Missing Airtable env vars" };
  }

  const params = new URLSearchParams();
  if (viewName) {
    params.set("view", viewName);
  }
  params.set("fields[]", nameField);
  params.set("fields[]", statusField);
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
