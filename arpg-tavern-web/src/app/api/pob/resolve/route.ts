import { NextResponse } from "next/server";

const ALLOWED_HOSTS = new Set([
  "pobb.in",
  "www.pobb.in",
  "pastebin.com",
  "www.pastebin.com",
]);

function getPobbRawUrls(url: URL): string[] {
  const pathParts = url.pathname.split("/").filter(Boolean);

  if (pathParts.length === 1) {
    const [buildId] = pathParts;
    const encodedId = encodeURIComponent(buildId);

    return [
      `https://pobb.in/pob/${encodedId}/raw`,
      `https://pobb.in/${encodedId}/raw`,
    ];
  }

  if (pathParts.length === 3 && pathParts[0] === "u") {
    const [, username, buildId] = pathParts;

    return [
      `https://pobb.in/u/${encodeURIComponent(username)}/${encodeURIComponent(
        buildId
      )}/raw`,
    ];
  }

  return [];
}

function getPastebinRawUrl(url: URL): string | null {
  const match = url.pathname.match(/^\/([^/?#]+)\/?$/);

  if (!match?.[1]) {
    return null;
  }

  return `https://pastebin.com/raw/${encodeURIComponent(match[1])}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: unknown };
    const input = typeof body.url === "string" ? body.url.trim() : "";

    if (!input) {
      return NextResponse.json(
        { error: "Inserisci un link Path of Building." },
        { status: 400 }
      );
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(input);
    } catch {
      return NextResponse.json(
        { error: "Il link non è un URL valido." },
        { status: 400 }
      );
    }

    if (parsedUrl.protocol !== "https:") {
      return NextResponse.json(
        { error: "Sono consentiti soltanto link HTTPS." },
        { status: 400 }
      );
    }

    const host = parsedUrl.hostname.toLowerCase();

    if (!ALLOWED_HOSTS.has(host)) {
      return NextResponse.json(
        {
          error:
            "Link non supportato. Per ora usa un link pobb.in o pastebin.com, oppure incolla direttamente il codice PoB.",
        },
        { status: 400 }
      );
    }

    const rawUrls =
  host === "pobb.in" || host === "www.pobb.in"
    ? getPobbRawUrls(parsedUrl)
    : [getPastebinRawUrl(parsedUrl)].filter(
        (rawUrl): rawUrl is string => Boolean(rawUrl)
      );

if (rawUrls.length === 0) {
  return NextResponse.json(
    { error: "Non riesco a individuare l’ID della build nel link." },
    { status: 400 }
  );
}

let pobCode = "";
let lastStatus: number | null = null;

for (const rawUrl of rawUrls) {
  const response = await fetch(rawUrl, {
    headers: {
      Accept: "text/plain, text/html;q=0.9, */*;q=0.8",
      "User-Agent":
        "ARPG-Tavern/1.0 localhost (contact: admin@arpg-tavern.local)",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  lastStatus = response.status;

  if (!response.ok) {
    continue;
  }

  const rawBuild = (await response.text()).trim();

  if (rawBuild) {
    pobCode = rawBuild;
    break;
  }
}

if (!pobCode) {
  return NextResponse.json(
    {
      error: `Impossibile recuperare una build valida dal link${
        lastStatus ? ` (ultimo HTTP ${lastStatus})` : ""
      }.`,
    },
    { status: 422 }
  );
}
    if (!pobCode) {
      return NextResponse.json(
        { error: "Il link non contiene un codice PoB utilizzabile." },
        { status: 422 }
      );
    }

    if (pobCode.length > 2_000_000) {
      return NextResponse.json(
        { error: "Il codice PoB recuperato è troppo grande." },
        { status: 413 }
      );
    }

    console.log("PoB link resolved:", {
  host,
  length: pobCode.length,
  preview: pobCode.slice(0, 120),
});

return NextResponse.json({ pobCode });
  } catch (error) {
    console.error("PoB URL resolver error:", error);

    return NextResponse.json(
      { error: "Non è stato possibile recuperare il codice PoB dal link." },
      { status: 500 }
    );
  }
}