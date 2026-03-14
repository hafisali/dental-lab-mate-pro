import { NextRequest, NextResponse } from "next/server";
import { processUpcomingReminders } from "@/lib/whatsapp-journey";

// GET /api/whatsapp/reminders
// Called by cron job (or Vercel cron) to auto-process appointment reminders
// Protected by CRON_SECRET env var
export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = req.headers.get("authorization");
      const querySecret = req.nextUrl.searchParams.get("secret");

      const providedSecret = authHeader?.replace("Bearer ", "") || querySecret;

      if (providedSecret !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const result = await processUpcomingReminders();

    return NextResponse.json({
      success: true,
      message: "Reminders processed",
      reminded24h: result.reminded24h,
      reminded1h: result.reminded1h,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[WhatsApp Reminders Cron] Error:", error);
    return NextResponse.json(
      { error: "Failed to process reminders" },
      { status: 500 }
    );
  }
}
