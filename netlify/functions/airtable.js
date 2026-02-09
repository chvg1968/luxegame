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

  const apiKey = (process.env.AIRTABLE_TOKEN || process.env.AIRTABLE_API_KEY || "").trim();
  const baseId = (process.env.AIRTABLE_BASE_ID || "").trim();
  const tableName = (process.env.AIRTABLE_TABLE_NAME || "Auxiliar Tasks").trim();

  if (!apiKey || !baseId) {
    return { statusCode: 500, body: "Missing Airtable env vars" };
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (error) {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const record = {
    fields: {
      "Task ID": payload.taskId || "",
      "Task Title": payload.taskTitle || "",
      "Subtask ID": payload.subtaskId || "",
      "Subtask Title": payload.subtaskTitle || "",
      "Type": payload.type || "",
      "Completed": Boolean(payload.completed),
      "Note": payload.note || "",
      "Player": payload.player || "",
      "Day Of Week": payload.dayOfWeek || "",
      "Date ISO": payload.dateISO || "",
    },
  };

  const response = await fetch(`${AIRTABLE_API}/${baseId}/${encodeURIComponent(tableName)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ records: [record] }),
  });

  const data = await response.text();
  return {
    statusCode: response.status,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
    body: data,
  };
};
