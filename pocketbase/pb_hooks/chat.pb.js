/// <reference path="../pb_data/types.d.ts" />

// Server-side proxy to Anthropic API.
// Reads ANTHROPIC_API_KEY from env so it never reaches the browser.
routerAdd("POST", "/api/chat", (e) => {
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

  const messages = body && body.messages
  const system = body && body.system
  const tools = body && body.tools
  const toolChoice = body && body.tool_choice

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return e.json(400, { error: "Missing or empty 'messages' array" })
  }

  const requestPayload = {
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: messages,
  }
  if (system) {
    requestPayload.system = system
  }
  // Optional tool use — lets Hance propose structured actions (e.g. fixing ledger conversions).
  if (tools && Array.isArray(tools) && tools.length > 0) {
    requestPayload.tools = tools
    if (toolChoice) requestPayload.tool_choice = toolChoice
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
      timeout: 60,
    })

    if (res.statusCode !== 200) {
      return e.json(res.statusCode, {
        error: "Anthropic API returned non-200",
        status: res.statusCode,
        details: res.raw,
      })
    }

    const parsed = JSON.parse(res.raw)
    // Concatenate any text blocks for the simple text path, and pass the full
    // content array so the client can detect/handle tool_use blocks.
    let text = ""
    if (parsed.content && Array.isArray(parsed.content)) {
      for (let i = 0; i < parsed.content.length; i++) {
        if (parsed.content[i].type === "text") text += parsed.content[i].text
      }
    }
    return e.json(200, {
      content: text,
      blocks: parsed.content || [],
      stop_reason: parsed.stop_reason,
      usage: parsed.usage,
    })
  } catch (err) {
    return e.json(500, { error: "Failed to reach Anthropic: " + err })
  }
})
