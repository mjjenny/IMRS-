import crypto from "crypto";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestToken = url.searchParams.get("request_token");
  const status = url.searchParams.get("status");
  const apiKey = process.env.KITE_API_KEY;
  const apiSecret = process.env.KITE_API_SECRET;

  if (status && status !== "success") {
    return NextResponse.redirect(new URL(`/?kite=failed`, url.origin));
  }

  if (!requestToken) {
    return NextResponse.json({ error: "Missing Kite request_token." }, { status: 400 });
  }

  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      {
        error: "Missing KITE_API_KEY or KITE_API_SECRET. Add both in Vercel Environment Variables, then redeploy."
      },
      { status: 500 }
    );
  }

  const checksum = crypto.createHash("sha256").update(`${apiKey}${requestToken}${apiSecret}`).digest("hex");
  const body = new URLSearchParams({
    api_key: apiKey,
    request_token: requestToken,
    checksum
  });

  const response = await fetch("https://api.kite.trade/session/token", {
    method: "POST",
    headers: {
      "X-Kite-Version": "3",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  const payload = await response.json();

  if (!response.ok || payload.status !== "success" || !payload.data?.access_token) {
    return NextResponse.json(
      {
        error: "Kite token exchange failed.",
        details: payload
      },
      { status: 400 }
    );
  }

  const redirect = NextResponse.redirect(new URL("/?kite=connected", url.origin));
  redirect.cookies.set("kite_access_token", payload.data.access_token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 18 * 60 * 60,
    path: "/"
  });

  return redirect;
}
