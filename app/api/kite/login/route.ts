import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.KITE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "Missing KITE_API_KEY. Add it in Vercel Environment Variables, then redeploy."
      },
      { status: 500 }
    );
  }

  const loginUrl = new URL("https://kite.zerodha.com/connect/login");
  loginUrl.searchParams.set("v", "3");
  loginUrl.searchParams.set("api_key", apiKey);

  return NextResponse.redirect(loginUrl);
}
