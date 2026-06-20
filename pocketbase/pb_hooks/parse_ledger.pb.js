/// <reference path="../pb_data/types.d.ts" />

// Server-side agent that interprets an uploaded financial document (txt / csv / image / pdf)
// and extracts ledger entries. Uses a forced tool-call so Claude returns structured rows.
// The key stays server-side (same pattern as /api/chat). Nothing is written here — the
// client reviews the proposed rows and commits them to the `finances` collection itself.
routerAdd("POST", "/api/parse-ledger", (e) => {
  const apiKey = $os.getenv("ANTHROPIC_API_KEY")
  if (!apiKey) {
    return e.json(500, { error: "ANTHROPIC_API_KEY environment variable not set on the server" })
  }

  let body
  try {
    body = e.requestInfo().body
  } catch (err) {
    return e.json(400, { error: "Invalid JSON body" })
  }

  const kind = body && body.kind // "text" | "image" | "pdf"
  const text = body && body.text
  const data = body && body.data // base64 (no data: prefix) for image/pdf
  const mediaType = body && body.mediaType // e.g. image/png, application/pdf
  const today = (body && body.today) || ""

  // Build the user content blocks depending on the file kind.
  const content = []
  if (kind === "text") {
    if (!text || !String(text).trim()) {
      return e.json(400, { error: "Missing 'text' for text/csv import" })
    }
    content.push({
      type: "text",
      text: "Here is the contents of a finance file (txt or csv). Extract every transaction as a ledger entry:\n\n" + String(text).slice(0, 200000),
    })
  } else if (kind === "image") {
    if (!data || !mediaType) {
      return e.json(400, { error: "Missing 'data' or 'mediaType' for image import" })
    }
    content.push({ type: "image", source: { type: "base64", media_type: mediaType, data: data } })
    content.push({ type: "text", text: "Extract every transaction visible in this image as a ledger entry." })
  } else if (kind === "pdf") {
    if (!data) {
      return e.json(400, { error: "Missing 'data' for pdf import" })
    }
    content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: data } })
    content.push({ type: "text", text: "Extract every transaction in this PDF as a ledger entry." })
  } else {
    return e.json(400, { error: "Unknown 'kind' — expected text, image, or pdf" })
  }

  const systemPrompt = [
    "You are a meticulous bookkeeping assistant for a Grand Canyon expedition's shared fund.",
    "Extract financial transactions from the supplied document into structured ledger entries.",
    today ? ("Today's date is " + today + ". Resolve any relative or partial dates against it.") : "",
    "",
    "Rules for each entry:",
    "- direction: 'IN' for money coming INTO the expedition fund (paddler contributions, bank deposits, refunds received). 'OUT' for money spent (outfitter, fuel, food, NPS fees, travel).",
    "- amount: the positive transaction value in its ORIGINAL currency. Never negative.",
    "- ccy: one of GBP, USD, EUR. Infer from currency symbols (£=GBP, $=USD, €=EUR); default GBP if genuinely unclear.",
    "- date: ISO format YYYY-MM-DD. If only day/month is shown, use the most plausible year. Leave empty string if no date is present.",
    "- category: choose the best fit from BANK, Lottery, NPS, Outfitter, Travel, Food, Fuel, Misc, Refund. Use Misc if unsure.",
    "- paid_by: the person or payee/merchant name if identifiable, else empty string.",
    "- description: a short human-readable summary of the line.",
    "- confidence: 'high', 'med', or 'low' — how sure you are you read the row correctly (use 'low' for blurry/ambiguous figures).",
    "Do not invent transactions. Skip running balances, headers, and subtotals — only real individual transactions.",
  ].join("\n")

  const tool = {
    name: "record_ledger_entries",
    description: "Record the list of ledger entries extracted from the document.",
    input_schema: {
      type: "object",
      properties: {
        entries: {
          type: "array",
          items: {
            type: "object",
            properties: {
              date: { type: "string", description: "YYYY-MM-DD or empty" },
              direction: { type: "string", enum: ["IN", "OUT"] },
              category: { type: "string", enum: ["BANK", "Lottery", "NPS", "Outfitter", "Travel", "Food", "Fuel", "Misc", "Refund"] },
              paid_by: { type: "string" },
              amount: { type: "number" },
              ccy: { type: "string", enum: ["GBP", "USD", "EUR"] },
              description: { type: "string" },
              confidence: { type: "string", enum: ["high", "med", "low"] },
            },
            required: ["direction", "amount", "ccy", "description"],
          },
        },
        summary: { type: "string", description: "One-line note about what the document was and anything skipped." },
      },
      required: ["entries"],
    },
  }

  const requestPayload = {
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    system: systemPrompt,
    tools: [tool],
    tool_choice: { type: "tool", name: "record_ledger_entries" },
    messages: [{ role: "user", content: content }],
  }

  try {
    const res = $http.send({
      url: "https://api.anthropic.com/v1/messages",
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(requestPayload),
      timeout: 180,
    })

    if (res.statusCode !== 200) {
      return e.json(res.statusCode, {
        error: "Anthropic API returned non-200",
        status: res.statusCode,
        details: res.raw,
      })
    }

    const parsed = JSON.parse(res.raw)
    // Find the forced tool_use block and surface its structured input.
    let toolInput = null
    if (parsed.content && Array.isArray(parsed.content)) {
      for (let i = 0; i < parsed.content.length; i++) {
        if (parsed.content[i].type === "tool_use") {
          toolInput = parsed.content[i].input
          break
        }
      }
    }

    if (!toolInput) {
      return e.json(502, { error: "Model did not return structured entries", details: res.raw })
    }

    return e.json(200, {
      entries: toolInput.entries || [],
      summary: toolInput.summary || "",
      usage: parsed.usage,
    })
  } catch (err) {
    return e.json(500, { error: "Failed to reach Anthropic: " + err })
  }
})
