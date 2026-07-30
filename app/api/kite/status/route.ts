import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();

  return NextResponse.json({
    apiKeyConfigured: Boolean(process.env.KITE_API_KEY),
    apiSecretConfigured: Boolean(process.env.KITE_API_SECRET),
    connected: Boolean(cookieStore.get("kite_access_token")?.value || process.env.KITE_ACCESS_TOKEN)
  });
}
