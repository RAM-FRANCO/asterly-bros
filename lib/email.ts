import nodemailer from "nodemailer";
import type { EmailDraft } from "@/types/outreach";
import type { Lead } from "@/types/lead";
import { DEFAULT_BRAND_VOICE } from "@/constants/brand-voice";
import { aiGenerateEmail } from "@/lib/ai";

const SMTP_TIMEOUT_MS = 15000;

interface PocConfig {
  pocMode: boolean;
  redirectEmail: string;
}

function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
  });
}

export function getRedirectAddress(
  intendedEmail: string,
  redirectEmail: string
): string {
  if (!redirectEmail || !redirectEmail.includes("@")) {
    throw new Error(
      "PoC mode is active but no valid redirect email is configured. Set one in Settings before sending."
    );
  }

  const sanitized = intendedEmail
    .replace(/@/g, "-at-")
    .replace(/\./g, "-");
  const [localPart, domain] = redirectEmail.split("@");
  return `${localPart}+${sanitized}@${domain}`;
}

export async function sendOutreachEmail(
  draft: EmailDraft,
  pocConfig: PocConfig
): Promise<{ success: boolean; redirectedTo?: string; error?: string }> {
  const { pocMode, redirectEmail } = pocConfig;

  if (!pocMode) {
    return {
      success: false,
      error: "PoC mode is disabled — sending to real venues is blocked in this prototype. Enable PoC mode in Settings.",
    };
  }

  if (!redirectEmail || !redirectEmail.includes("@")) {
    return {
      success: false,
      error: "No valid redirect email configured. Set one in Settings before sending.",
    };
  }

  const transporter = createTransporter();
  const to = getRedirectAddress(draft.intendedRecipient, redirectEmail);

  const subjectPrefix = pocMode ? "[PoC] " : "";
  const subject =
    subjectPrefix + draft.subjectLines[draft.selectedSubjectIndex];

  const bodyAlreadyHasPocFooter = draft.fullBody.includes("[PoC Mode]");
  const footer =
    pocMode && !bodyAlreadyHasPocFooter
      ? `\n\n---\n[PoC Mode] Originally intended for: ${draft.intendedRecipient}\nRedirected to: ${to}`
      : pocMode && bodyAlreadyHasPocFooter
        ? `\nRedirected to: ${to}`
        : "";

  try {
    await transporter.sendMail({
      from: `"${DEFAULT_BRAND_VOICE.signatureName} — ${DEFAULT_BRAND_VOICE.brandName}" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      text: draft.fullBody + footer,
    });

    return { success: true, redirectedTo: pocMode ? to : undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

export async function sendNotificationEmail(
  leadName: string,
  holdReasons: string[],
  leadId: string,
  redirectEmail: string
): Promise<{ success: boolean; error?: string }> {
  if (!redirectEmail || !redirectEmail.includes("@")) {
    return {
      success: false,
      error: "No valid redirect email configured. Set one in Settings.",
    };
  }

  const transporter = createTransporter();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    await transporter.sendMail({
      from: `"Asterley Outreach Bot" <${process.env.GMAIL_USER}>`,
      to: redirectEmail,
      subject: `[Review Needed] ${leadName} — held for your approval`,
      text: [
        `A lead has been held for your review.\n`,
        `Venue: ${leadName}`,
        `Reason(s):`,
        ...holdReasons.map((r) => `  • ${r}`),
        `\nReview it here: ${appUrl}/leads/${leadId}`,
      ].join("\n"),
    });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

export async function generateEmailDraft(
  lead: Lead,
  tier: "high" | "medium" | "low" = "high"
): Promise<{
  subjectLines: string[];
  hook: string;
  bridge: string;
  fullBody: string;
}> {
  if (tier === "low") {
    return generateLightEmailDraft(lead);
  }

  const voice = DEFAULT_BRAND_VOICE;
  const enrichment = lead.enrichment;

  const prompt = `You are writing a cold outreach email on behalf of ${voice.brandName}.

BRAND VOICE:
- Tone: ${voice.tone}
- Personality: ${voice.personality}
- Key selling points: ${voice.keySellingPoints.join("; ")}
- AVOID these words/phrases: ${voice.avoidWords.join(", ")}

VENUE INFORMATION:
- Name: ${lead.name}
- Type: ${enrichment?.venueType ?? "unknown"}
- Vibe: ${enrichment?.vibe ?? "unknown"}
- Has cocktail menu: ${enrichment?.hasCocktailMenu ?? false}
- Serves Spritz/Negroni: ${enrichment?.servesSpritzOrNegroni ?? false}
- Key menu items: ${enrichment?.keyMenuItems?.join(", ") ?? "unknown"}
- Existing brands: ${enrichment?.existingBrands?.join(", ") ?? "none known"}
- Contact name: ${enrichment?.contactName ?? "there"}

TASK:
Generate ONLY the following in JSON format — no markdown, no explanation:

{
  "subjectLines": ["option 1", "option 2", "option 3"],
  "hook": "1-2 venue-specific sentences that show you know this venue. Reference something real from the venue data.",
  "bridge": "1 sentence naturally connecting the hook to Asterley Bros."
}

RULES:
- Hook must reference real details about the venue (menu items, vibe, brands they stock)
- Bridge must feel like a natural transition, not a sales pitch
- Subject lines should be short (under 50 chars), varied in style (question, statement, name-drop)
- Write as ${voice.signatureName}, not as an AI`;

  const raw = await aiGenerateEmail(prompt);

  try {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    const contactName = enrichment?.contactName ?? "there";
    const hook = parsed.hook ?? "";
    const bridge = parsed.bridge ?? "";

    const fullBody = [
      `Hi ${contactName},`,
      "",
      hook,
      "",
      bridge,
      "",
      voice.offerTemplate,
      "",
      voice.closeTemplate,
      "",
      `Best,`,
      voice.signatureName,
      voice.signatureTitle,
    ].join("\n");

    return {
      subjectLines: parsed.subjectLines ?? ["Intro from Asterley Bros"],
      hook,
      bridge,
      fullBody,
    };
  } catch {
    return {
      subjectLines: ["Intro from Asterley Bros"],
      hook: `I came across ${lead.name} and loved what you're doing.`,
      bridge:
        "We make award-winning botanical spirits — Vermouth, Amaro, and Aperitivo — right here in South London, and I think they'd be a brilliant fit for your cocktail menu.",
      fullBody: `Hi there,\n\nI came across ${lead.name} and loved what you're doing.\n\nWe make award-winning botanical spirits — Vermouth, Amaro, and Aperitivo — right here in South London, and I think they'd be a brilliant fit for your cocktail menu.\n\n${voice.offerTemplate}\n\n${voice.closeTemplate}\n\nBest,\n${voice.signatureName}\n${voice.signatureTitle}`,
    };
  }
}

function generateLightEmailDraft(lead: Lead): {
  subjectLines: string[];
  hook: string;
  bridge: string;
  fullBody: string;
} {
  const voice = DEFAULT_BRAND_VOICE;
  const contactName = lead.enrichment?.contactName ?? "there";
  const venueType = lead.enrichment?.venueType?.replace(/_/g, " ") ?? "venue";

  const hook = `I came across ${lead.name} and thought you might be interested in something new for your ${venueType}.`;
  const bridge = `We're Asterley Bros — we make award-winning Vermouth, Amaro, and Aperitivo in South London.`;

  const fullBody = [
    `Hi ${contactName},`,
    "",
    hook,
    "",
    bridge,
    "",
    voice.offerTemplate,
    "",
    `Happy to send over a sample if you're curious — no strings attached.`,
    "",
    `Best,`,
    voice.signatureName,
    voice.signatureTitle,
  ].join("\n");

  return {
    subjectLines: [
      `Quick intro — ${voice.brandName}`,
      `Craft spirits for ${lead.name}?`,
    ],
    hook,
    bridge,
    fullBody,
  };
}
