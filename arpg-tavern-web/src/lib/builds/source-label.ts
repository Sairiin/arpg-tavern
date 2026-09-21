export type BuildSourceLabel = {
  key:
    | "pobb"
    | "path-of-building"
    | "maxroll"
    | "mobalytics"
    | "youtube"
    | "grimtools"
    | "planner"
    | "external";
  label: string;
};

export function getBuildSourceUrl(build: {
  sourceUrl?: string;
  buildLink?: string;
}) {
  return build.sourceUrl?.trim() || build.buildLink?.trim() || "";
}

export function getBuildSourceLabel(url: string): BuildSourceLabel | null {
  const normalizedUrl = url.trim().toLowerCase();

  if (!normalizedUrl) {
    return null;
  }

  if (normalizedUrl.includes("pobb.in")) {
    return { key: "pobb", label: "pobb.in" };
  }

  if (
    normalizedUrl.includes("pathofbuilding") ||
    normalizedUrl.includes("path-of-building")
  ) {
    return { key: "path-of-building", label: "Path of Building" };
  }

  if (normalizedUrl.includes("maxroll.gg")) {
    return { key: "maxroll", label: "Maxroll" };
  }

  if (normalizedUrl.includes("mobalytics.gg")) {
    return { key: "mobalytics", label: "Mobalytics" };
  }

  if (
    normalizedUrl.includes("youtube.com") ||
    normalizedUrl.includes("youtu.be")
  ) {
    return { key: "youtube", label: "YouTube" };
  }

  if (normalizedUrl.includes("grimtools.com")) {
    return { key: "grimtools", label: "GrimTools" };
  }

  if (
    normalizedUrl.includes("lastepochtools.com") ||
    normalizedUrl.includes("maxroll.gg") ||
    normalizedUrl.includes("d4builds.gg")
  ) {
    return { key: "planner", label: "Build planner" };
  }

  return { key: "external", label: "Link esterno" };
}
