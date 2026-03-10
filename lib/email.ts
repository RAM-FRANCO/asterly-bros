import nodemailer from "nodemailer";
import type { EmailDraft } from "@/types/outreach";
import type { Lead } from "@/types/lead";
import { DEFAULT_BRAND_VOICE } from "@/constants/brand-voice";
import { aiGenerateEmail } from "@/lib/ai";

const POC_MODE = process.env.POC_MODE === "true";
const POC_REDIRECT_EMAIL = process.env.POC_REDIRECT_EMAIL ?? "";

const SMTP_TIMEOUT_MS = 15000;

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

export function getRedirectAddress(intendedEmail: string): string {
  if (!POC_MODE) return intendedEmail;

  const sanitized = intendedEmail
    .replace(/@/g, "-at-")
    .replace(/\./g, "-");
  const [localPart] = POC_REDIRECT_EMAIL.split("@");
  const domain = POC_REDIRECT_EMAIL.split("@")[1];
  return `${localPart}+${sanitized}@${domain}`;
}

export async function sendOutreachEmail(
  draft: EmailDraft
): Promise<{ success: boolean; redirectedTo?: string; error?: string }> {
  const transporter = createTransporter();
  const to = getRedirectAddress(draft.intendedRecipient);

  const subjectPrefix = POC_MODE ? "[PoC] " : "";
  const subject =
    subjectPrefix + draft.subjectLines[draft.selectedSubjectIndex];

  const footer = POC_MODE
    ? `\n\n---\n[PoC Mode] This email was intended for: ${draft.intendedRecipient}\nRedirected to: ${to}`
    : "";

  try {
    await transporter.sendMail({
      from: `"${DEFAULT_BRAND_VOICE.signatureName} — ${DEFAULT_BRAND_VOICE.brandName}" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      text: draft.fullBody + footer,
    });

    return { success: true, redirectedTo: POC_MODE ? to : undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

export async function sendNotificationEmail(
  leadName: string,
  holdReasons: string[],
  leadId: string
): Promise<{ success: boolean; error?: string }> {
  const transporter = createTransporter();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    await transporter.sendMail({
      from: `"Asterley Outreach Bot" <${process.env.GMAIL_USER}>`,
      to: POC_REDIRECT_EMAIL || process.env.GMAIL_USER,
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

export async function generateEmailDraft(lead: Lead): Promise<{
  subjectLines: string[];
  hook: string;
  bridge: string;
  fullBody: string;
}> {
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
