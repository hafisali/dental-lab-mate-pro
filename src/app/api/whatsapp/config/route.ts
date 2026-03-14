import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { getWhatsAppProvider } from "@/lib/whatsapp";

const CONFIG_PATH = path.join(process.cwd(), "whatsapp-bot-config.json");

interface BotConfig {
  autoReplyEnabled: boolean;
  businessHoursStart: string;
  businessHoursEnd: string;
  greetingMessage: string;
  updatedAt: string;
}

const DEFAULT_CONFIG: BotConfig = {
  autoReplyEnabled: true,
  businessHoursStart: "09:00",
  businessHoursEnd: "18:00",
  greetingMessage:
    "Welcome to DentalLab! We are here to help you with appointments and dental services.",
  updatedAt: new Date().toISOString(),
};

async function loadConfig(): Promise<BotConfig> {
  try {
    const raw = await readFile(CONFIG_PATH, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

async function saveConfig(config: BotConfig): Promise<void> {
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

// GET - return current bot config and connection status
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await loadConfig();
  const provider = getWhatsAppProvider();
  const twilioConfigured = !!(
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  );

  return NextResponse.json({
    config,
    provider,
    connection: {
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
      hasAccessToken: !!process.env.WHATSAPP_ACCESS_TOKEN,
      hasVerifyToken: !!process.env.WHATSAPP_VERIFY_TOKEN,
      webhookUrl: `${process.env.NEXTAUTH_URL || ""}/api/whatsapp/webhook`,
      connected:
        !!process.env.WHATSAPP_PHONE_NUMBER_ID &&
        !!process.env.WHATSAPP_ACCESS_TOKEN,
    },
    twilio: {
      configured: twilioConfigured,
      accountSid: process.env.TWILIO_ACCOUNT_SID
        ? process.env.TWILIO_ACCOUNT_SID.slice(0, 8) + "..."
        : "",
      hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
      sandboxNumber: process.env.TWILIO_WHATSAPP_NUMBER || "+14155238886",
      webhookUrl: `${process.env.NEXTAUTH_URL || ""}/api/whatsapp/twilio`,
    },
  });
}

// POST - update bot settings
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const current = await loadConfig();

    const updated: BotConfig = {
      autoReplyEnabled:
        body.autoReplyEnabled !== undefined
          ? body.autoReplyEnabled
          : current.autoReplyEnabled,
      businessHoursStart:
        body.businessHoursStart || current.businessHoursStart,
      businessHoursEnd: body.businessHoursEnd || current.businessHoursEnd,
      greetingMessage: body.greetingMessage || current.greetingMessage,
      updatedAt: new Date().toISOString(),
    };

    await saveConfig(updated);

    return NextResponse.json({ success: true, config: updated });
  } catch (error) {
    console.error("[WhatsApp Config] Error:", error);
    return NextResponse.json(
      { error: "Failed to update config" },
      { status: 500 }
    );
  }
}
