export async function onRequestPost({ request, env }) {
  try {
    const data = await request.json();
    const { name, email, message, service } = data;

    if (!email || !message) {
      return new Response(JSON.stringify({ error: "Email and message are required." }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const payloadText = `**New Inquiry from Support Finder**\n**Name:** ${name || "Not provided"}\n**Email:** ${email}\n**Service:** ${service || "Unknown"}\n\n**Message:**\n${message}`;

    // 1. Webhook (e.g. Slack, Teams, Discord, Zapier)
    if (env.INTAKE_WEBHOOK_URL) {
      const res = await fetch(env.INTAKE_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: payloadText })
      });
      if (!res.ok) {
        console.error("Webhook delivery failed", res.status, await res.text());
        return new Response(JSON.stringify({ error: "Delivery failed" }), { status: 502, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // 2. Resend API
    if (env.RESEND_API_KEY) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "intake@techniekengineering.com",
          to: "gregory@techniekengineering.com",
          reply_to: email,
          subject: `Techniek Support Inquiry: ${service || "General"}`,
          text: payloadText
        })
      });
      if (!res.ok) {
        console.error("Resend delivery failed", res.status, await res.text());
        return new Response(JSON.stringify({ error: "Delivery failed" }), { status: 502, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // 3. Unconfigured fallback
    console.error("No INTAKE_WEBHOOK_URL or RESEND_API_KEY configured.");
    return new Response(JSON.stringify({ error: "unconfigured" }), { 
      status: 503,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("Intake parsing error", err);
    return new Response(JSON.stringify({ error: "Invalid request payload" }), { 
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
}