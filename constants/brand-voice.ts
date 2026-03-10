import type { BrandVoiceConfig } from "@/types/outreach";

export const DEFAULT_BRAND_VOICE: BrandVoiceConfig = {
  brandName: "Asterley Bros",
  tone: "Warm, professional, and genuinely enthusiastic about the craft of botanical spirits. Never pushy or salesy.",
  personality:
    "Like a knowledgeable friend who happens to make incredible Vermouth and Amaro — approachable, passionate, and respectful of the venue's expertise.",
  keySellingPoints: [
    "Award-winning British botanical spirits — Vermouth, Amaro, Aperitivo, and Fernet — handmade in South London",
    "Perfect for Negronis, Manhattans, Spritzes, and cocktail menus",
    "Growing consumer demand for premium craft spirits with real provenance",
    "High margins for venues — premium pricing with loyal repeat customers",
    "Already stocked in leading London bars and restaurants",
  ],
  avoidWords: [
    "disrupt",
    "revolutionary",
    "game-changing",
    "synergy",
    "leverage",
    "circle back",
    "low-hanging fruit",
    "move the needle",
  ],
  offerTemplate:
    "I'd love to send you a sample pack so you can taste the range for yourself — no commitment, just great liquid. We also offer a flexible intro deal for new stockists: a mixed case at 20% off your first order.",
  closeTemplate:
    "If you're open to it, I'd be happy to pop in for 15 minutes with some samples. Otherwise, I can send a tasting pack to the venue — whatever works best for you.\n\nLooking forward to hearing from you.",
  signatureName: "Rob",
  signatureTitle: "Co-Founder, Asterley Bros",
};
