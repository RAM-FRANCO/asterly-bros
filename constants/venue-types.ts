export const VENUE_CATEGORIES = {
  COCKTAIL_BAR: "cocktail_bar",
  WINE_BAR: "wine_bar",
  RESTAURANT_WITH_BAR: "restaurant_with_bar",
  GASTROPUB: "gastropub",
  BOTTLE_SHOP: "bottle_shop",
  DELI: "deli",
  HOTEL_BAR: "hotel_bar",
  EVENT_SPACE: "event_space",
  PUB: "pub",
  CAFE: "cafe",
  OTHER: "other",
} as const;

export type VenueCategory =
  (typeof VENUE_CATEGORIES)[keyof typeof VENUE_CATEGORIES];

export const STANDARD_VENUE_TYPES: VenueCategory[] = [
  VENUE_CATEGORIES.COCKTAIL_BAR,
  VENUE_CATEGORIES.WINE_BAR,
  VENUE_CATEGORIES.RESTAURANT_WITH_BAR,
  VENUE_CATEGORIES.GASTROPUB,
  VENUE_CATEGORIES.BOTTLE_SHOP,
];

export const LONDON_AREAS = [
  "Peckham",
  "Shoreditch",
  "Hackney",
  "Dalston",
  "Brixton",
  "Soho",
  "Fitzrovia",
  "Bermondsey",
  "Islington",
  "Camden",
  "Notting Hill",
  "Clapham",
  "Battersea",
  "Clerkenwell",
  "Covent Garden",
  "Marylebone",
  "Mayfair",
  "Borough",
  "Kennington",
  "Bethnal Green",
] as const;

export const PIPELINE_STAGES = [
  { key: "new", label: "New", color: "bg-slate-100 text-slate-700" },
  { key: "enriched", label: "Enriched", color: "bg-blue-100 text-blue-700" },
  { key: "scored", label: "Scored", color: "bg-indigo-100 text-indigo-700" },
  {
    key: "email_drafted",
    label: "Email Drafted",
    color: "bg-purple-100 text-purple-700",
  },
  {
    key: "email_approved",
    label: "Approved",
    color: "bg-violet-100 text-violet-700",
  },
  { key: "emailed", label: "Emailed", color: "bg-cyan-100 text-cyan-700" },
  {
    key: "follow_up_1",
    label: "Follow-up 1",
    color: "bg-amber-100 text-amber-700",
  },
  {
    key: "follow_up_2",
    label: "Follow-up 2",
    color: "bg-orange-100 text-orange-700",
  },
  { key: "replied", label: "Replied", color: "bg-green-100 text-green-700" },
  {
    key: "meeting",
    label: "Meeting",
    color: "bg-emerald-100 text-emerald-700",
  },
  { key: "won", label: "Won", color: "bg-teal-100 text-teal-700" },
  { key: "lost", label: "Lost", color: "bg-red-100 text-red-700" },
  {
    key: "archived",
    label: "Archived",
    color: "bg-gray-100 text-gray-500",
  },
] as const;
