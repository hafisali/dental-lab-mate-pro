import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Twilio sends POST with form-encoded data
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const from = (formData.get("From") as string || "")
      .replace("whatsapp:", "")
      .replace("+", "");
    const body = (formData.get("Body") as string || "").trim();

    if (!from || !body) {
      return new Response("<Response></Response>", {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Forward to the existing webhook handler in Meta format
    // so the same bot logic processes the message
    const baseUrl = req.nextUrl.origin;
    await fetch(`${baseUrl}/api/whatsapp/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        object: "whatsapp_business_account",
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      from: from,
                      type: "text",
                      text: { body: body },
                    },
                  ],
                },
              },
            ],
          },
        ],
      }),
    });

    // Return TwiML empty response (messages sent via API, not TwiML)
    return new Response("<Response></Response>", {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("[Twilio Webhook] Error:", error);
    return new Response("<Response></Response>", {
      headers: { "Content-Type": "text/xml" },
    });
  }
}
