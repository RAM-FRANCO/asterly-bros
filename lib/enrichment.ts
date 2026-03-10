import * as cheerio from "cheerio";
import type { EnrichmentData } from "@/types/lead";
import { aiEnrich } from "@/lib/ai";

export async function enrichVenue(
  website: string | undefined,
  placeName: string,
  placeTypes: string[],
  rating?: number,
  reviewCount?: number
): Promise<EnrichmentData> {
  let pageText = "";
  let source: EnrichmentData["source"] = "google_places";

  if (website) {
    try {
      pageText = await scrapeWebsite(website);
      source = pageText.length > 100 ? "website" : "partial";
    } catch {
      source = "google_places";
    }
  }

  const contextBlock =
    source === "google_places" || pageText.length < 100
      ? buildGooglePlacesContext(placeName, placeTypes, rating, reviewCount)
      : pageText;

  const prompt = buildEnrichmentPrompt(placeName, contextBlock, source);
  const rawResponse = await aiEnrich(prompt);
  return parseEnrichmentResponse(rawResponse, source);
}

const MAX_SCRAPE_BYTES = 2 * 1024 * 1024; // 2MB cap

async function scrapeWebsite(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AsterleyBot/1.0; +https://asterleybros.com)",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_SCRAPE_BYTES) {
      throw new Error("Page too large to scrape");
    }

    const html = await response.text();
    if (html.length > MAX_SCRAPE_BYTES) {
      return extractText(html.slice(0, MAX_SCRAPE_BYTES));
    }
    return extractText(html);
  } finally {
    clearTimeout(timeout);
  }
}

function extractText(html: string): string {
  const $ = cheerio.load(html);

  $("script, style, noscript, iframe, svg, nav, footer, header").remove();

  const text = $("body").text();
  return text
    .replace(/\s+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 6000);
}

function buildGooglePlacesContext(
  name: string,
  types: string[],
  rating?: number,
  reviewCount?: number
): string {
  return [
    `Venue name: ${name}`,
    `Google types: ${types.join(", ")}`,
    rating ? `Rating: ${rating}/5 (${reviewCount ?? 0} reviews)` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildEnrichmentPrompt(
  venueName: string,
  context: string,
  source: string
): string {
  return `You are a research assistant for Asterley Bros, a London-based botanical spirits brand (Vermouth, Amaro, Aperitivo, Fernet).

Analyze this venue and extract structured data. Return ONLY valid JSON — no markdown, no explanation.

Venue: ${venueName}
Data source: ${source}

--- VENUE CONTENT ---
${context}
--- END CONTENT ---

Return this exact JSON structure:
{
  "venueType": "one of: cocktail_bar, wine_bar, restaurant_with_bar, gastropub, bottle_shop, deli, hotel_bar, event_space, pub, cafe, other",
  "venueSubType": "optional more specific description",
  "hasCocktailMenu": true/false,
  "hasBarProgram": true/false,
  "servesSpritzOrNegroni": true/false,
  "existingBrands": ["list of alcohol/aperitif brands mentioned"],
  "competitorAperitifs": ["competing Vermouth/Amaro/Aperitivo brands: Campari, Aperol, Martini, Cocchi, Lillet, Punt e Mes, etc."],
  "vibe": "brief description of venue atmosphere/style",
  "contactEmail": "email if found, null otherwise",
  "contactName": "contact person name if found, null otherwise",
  "socialMedia": { "instagram": "handle or null", "facebook": "url or null", "twitter": "handle or null" },
  "keyMenuItems": ["notable drinks or menu items related to cocktails/aperitifs"],
  "summary": "2-3 sentence summary of why this venue is/isn't a good fit for Asterley Bros"
}`;
}

function parseEnrichmentResponse(
  raw: string,
  source: EnrichmentData["source"]
): EnrichmentData {
  try {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      venueType: parsed.venueType ?? "other",
      venueSubType: parsed.venueSubType,
      hasCocktailMenu: Boolean(parsed.hasCocktailMenu),
      hasBarProgram: Boolean(parsed.hasBarProgram),
      servesSpritzOrNegroni: Boolean(parsed.servesSpritzOrNegroni),
      existingBrands: Array.isArray(parsed.existingBrands)
        ? parsed.existingBrands
        : [],
      competitorAperitifs: Array.isArray(parsed.competitorAperitifs)
        ? parsed.competitorAperitifs
        : [],
      vibe: parsed.vibe ?? "",
      contactEmail: parsed.contactEmail ?? undefined,
      contactName: parsed.contactName ?? undefined,
      socialMedia: parsed.socialMedia ?? undefined,
      keyMenuItems: Array.isArray(parsed.keyMenuItems)
        ? parsed.keyMenuItems
        : [],
      summary: parsed.summary ?? "",
      source,
      scrapedAt: new Date().toISOString(),
    };
  } catch {
    return fallbackEnrichment(source);
  }
}

function fallbackEnrichment(source: EnrichmentData["source"]): EnrichmentData {
  return {
    venueType: "other",
    hasCocktailMenu: false,
    hasBarProgram: false,
    servesSpritzOrNegroni: false,
    existingBrands: [],
    competitorAperitifs: [],
    vibe: "",
    keyMenuItems: [],
    summary: "Enrichment failed — manual review recommended.",
    source,
    scrapedAt: new Date().toISOString(),
  };
}
