// Digital Twin chat proxy for /tools/greg-brown-site/.
// Keeps the OpenRouter credential server-side. Set OPENROUTER_API_KEY as an
// encrypted environment variable on the Cloudflare Pages project.
import { SYSTEM_PROMPT } from "../../../../functions-lib/twin-knowledge.js";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "openai/gpt-oss-120b";
const MAX_TURNS = 12;
const MAX_CHARS_PER_TURN = 4000;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function onRequestPost({ request, env }) {
  const apiKey = env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    return json({ error: "unconfigured" }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const messages = (Array.isArray(body?.messages) ? body.messages : [])
    .filter(
      (m) =>
        (m?.role === "user" || m?.role === "assistant") &&
        typeof m?.content === "string" &&
        m.content.trim(),
    )
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS_PER_TURN) }));

  if (messages.length === 0) {
    return json({ error: "Messages are required." }, 400);
  }

  let upstream;
  try {
    upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "HTTP-Referer": new URL(request.url).origin,
        "X-Title": "Greg Brown Digital Twin",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        temperature: 0.45,
        max_tokens: 1024,
        reasoning: { effort: "minimal", exclude: true },
      }),
    });
  } catch (err) {
    console.error("OpenRouter request failed", err);
    return json({ error: "unavailable" }, 502);
  }

  if (!upstream.ok) {
    // Upstream detail stays in the Cloudflare log; visitors get a neutral message.
    console.error("OpenRouter error", upstream.status, await upstream.text());
    return json({ error: upstream.status === 401 ? "unconfigured" : "unavailable" }, 502);
  }

  const data = await upstream.json();
  const message = data?.choices?.[0]?.message?.content?.trim();
  if (!message) {
    return json({ error: "unavailable" }, 502);
  }

  return json({ message });
}
