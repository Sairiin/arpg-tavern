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

    const response = await fetch("https://pobb.in/pob/", {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        Accept: "text/plain",
        "User-Agent": "ARPG-Tavern/1.0",
      },
      body: pobCode,
      cache: "no-store",
    });

    const id = (await response.text()).trim();

    if (!response.ok || !/^[A-Za-z0-9_-]+$/.test(id)) {
      return NextResponse.json(
        { error: "pobb.in non ha restituito un identificativo valido." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      id,
      url: `https://pobb.in/${id}`,
    });
  } catch (error) {
    console.error("pobb.in share error:", error);

    return NextResponse.json(
      { error: "Non è stato possibile creare il link pobb.in." },
      { status: 500 },
    );
  }
}
