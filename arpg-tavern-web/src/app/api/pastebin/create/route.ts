import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      pobCode?: unknown;
    };

    const pobCode =
      typeof body.pobCode === "string" ? body.pobCode.trim() : "";

    if (!pobCode) {
      return NextResponse.json(
        { error: "Inserisci un codice PoB." },
        { status: 400 },
      );
    }

    const apiKey = process.env.PASTEBIN_API_KEY?.trim();

    if (!apiKey) {
      return NextResponse.json(
        { error: "La chiave Pastebin non è configurata sul server." },
        { status: 500 },
      );
    }

    const form = new URLSearchParams({
      api_dev_key: apiKey,
      api_option: "paste",
      api_paste_code: pobCode,
      api_paste_private: "1",
      api_paste_expire_date: "N",
      api_paste_format: "text",
    });

    const response = await fetch("https://pastebin.com/api/api_post.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "ARPG-Tavern/1.0",
      },
      body: form.toString(),
      cache: "no-store",
    });

    const result = (await response.text()).trim();

    if (!response.ok || !result.startsWith("https://pastebin.com/")) {
      console.error("Pastebin API error:", response.status, result.slice(0, 300));

      return NextResponse.json(
        { error: "Pastebin non ha restituito un link valido." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      url: result,
      provider: "pastebin",
    });
  } catch (error) {
    console.error("Pastebin create error:", error);

    return NextResponse.json(
      { error: "Non è stato possibile creare il link Pastebin." },
      { status: 500 },
    );
  }
}
