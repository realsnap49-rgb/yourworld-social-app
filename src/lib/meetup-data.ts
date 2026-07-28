/**
 * Meetup suggestions are privacy-first: venues are matched only against a
 * coarse, shared *area* label (never coordinates, never an exact address of
 * either user). Hotels and other private-stay venues are intentionally
 * excluded from the default catalogue.
 */

export type MeetupCategoryId =
  | "cafes"
  | "restaurants"
  | "parks"
  | "malls"
  | "cinemas"
  | "bowling"
  | "attractions";

export type MeetupCategory = {
  id: MeetupCategoryId;
  emoji: string;
  label: string;
};

export const meetupCategories: MeetupCategory[] = [
  { id: "cafes", emoji: "☕", label: "Cafés" },
  { id: "restaurants", emoji: "🍽️", label: "Restaurants" },
  { id: "parks", emoji: "🌳", label: "Parks" },
  { id: "malls", emoji: "🛍️", label: "Shopping Malls" },
  { id: "cinemas", emoji: "🎬", label: "Movie Theatres" },
  { id: "bowling", emoji: "🎳", label: "Bowling" },
  { id: "attractions", emoji: "🏛️", label: "Tourist Attractions" },
];

export type MeetupPlace = {
  id: string;
  name: string;
  category: MeetupCategoryId;
  /** Coarse public area only — never a precise address. */
  area: string;
  /** Why it is a safe pick: busy, public, well-lit, easy to reach. */
  safety: string;
  hours: string;
  /** Rough travel fairness for both people, bucketed. */
  fairness: string;
};

const catalogue: MeetupPlace[] = [
  {
    id: "p1",
    name: "Lantern Row Coffee",
    category: "cafes",
    area: "Central district",
    safety: "Busy all day, street-facing seating",
    hours: "7:00 – 21:00",
    fairness: "Roughly midway",
  },
  {
    id: "p2",
    name: "Blue Hour Espresso Bar",
    category: "cafes",
    area: "Station quarter",
    safety: "Inside a staffed transit hall",
    hours: "6:30 – 22:00",
    fairness: "Short trip for both",
  },
  {
    id: "p3",
    name: "The Copper Table",
    category: "restaurants",
    area: "Old town",
    safety: "Open kitchen, always staffed",
    hours: "11:00 – 23:00",
    fairness: "Roughly midway",
  },
  {
    id: "p4",
    name: "Night Market Hall",
    category: "restaurants",
    area: "Riverside",
    safety: "Public food hall, high footfall",
    hours: "12:00 – 23:30",
    fairness: "Slightly closer to you",
  },
  {
    id: "p5",
    name: "Willow Commons Park",
    category: "parks",
    area: "Green belt",
    safety: "Lit main paths, daytime recommended",
    hours: "Daylight hours",
    fairness: "Roughly midway",
  },
  {
    id: "p6",
    name: "Harbour Promenade",
    category: "parks",
    area: "Coastal district",
    safety: "Open waterfront, constant foot traffic",
    hours: "Daylight hours",
    fairness: "Short trip for both",
  },
  {
    id: "p7",
    name: "Meridian Galleria",
    category: "malls",
    area: "Central district",
    safety: "Security on site, indoor meeting points",
    hours: "10:00 – 22:00",
    fairness: "Roughly midway",
  },
  {
    id: "p8",
    name: "Northside Arcade",
    category: "malls",
    area: "Studio quarter",
    safety: "Staffed entrances, camera coverage",
    hours: "10:00 – 21:00",
    fairness: "Slightly closer to them",
  },
  {
    id: "p9",
    name: "Aurora Cinema 8",
    category: "cinemas",
    area: "Central district",
    safety: "Ticketed public venue, lit lobby",
    hours: "11:00 – 00:30",
    fairness: "Roughly midway",
  },
  {
    id: "p10",
    name: "Reel House Cinematheque",
    category: "cinemas",
    area: "Old town",
    safety: "Small public theatre, staffed foyer",
    hours: "14:00 – 23:00",
    fairness: "Short trip for both",
  },
  {
    id: "p11",
    name: "Strike Lane Bowling",
    category: "bowling",
    area: "Riverside",
    safety: "Family venue, staffed until close",
    hours: "12:00 – 00:00",
    fairness: "Roughly midway",
  },
  {
    id: "p12",
    name: "Pinpoint Social Club",
    category: "bowling",
    area: "Station quarter",
    safety: "Open-plan lanes beside a transit hub",
    hours: "13:00 – 23:00",
    fairness: "Short trip for both",
  },
  {
    id: "p13",
    name: "City Museum Steps",
    category: "attractions",
    area: "Old town",
    safety: "Landmark plaza, always public",
    hours: "9:00 – 18:00",
    fairness: "Roughly midway",
  },
  {
    id: "p14",
    name: "Observatory Lookout",
    category: "attractions",
    area: "Green belt",
    safety: "Ticketed viewpoint with staff on site",
    hours: "10:00 – 20:00",
    fairness: "Slightly closer to them",
  },
];

/** Public places only, filtered by category. Hotels are never included. */
export const placesFor = (category: MeetupCategoryId) =>
  catalogue.filter((p) => p.category === category);

export const meetupTimeSlots = ["Today evening", "Tomorrow morning", "This weekend"] as const;
export type MeetupTimeSlot = (typeof meetupTimeSlots)[number];

export const meetupMessage = (place: MeetupPlace, when: MeetupTimeSlot) =>
  `📍 Meetup suggestion — ${place.name}\n${categoryLabel(place.category)} · ${place.area} (approx. area only)\n🕒 ${when} · open ${place.hours}\n🛡️ ${place.safety}`;

export const categoryLabel = (id: MeetupCategoryId) => {
  const c = meetupCategories.find((x) => x.id === id);
  return c ? `${c.emoji} ${c.label}` : "Public place";
};