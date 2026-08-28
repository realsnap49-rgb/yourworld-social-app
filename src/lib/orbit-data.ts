import reel1 from "@/assets/reel-1.jpg";
import reel2 from "@/assets/reel-2.jpg";
import reel3 from "@/assets/reel-3.jpg";
import post1 from "@/assets/post-1.jpg";
import type { OrbitMoodId } from "@/lib/orbit-mood";

export type OrbitProfile = {
  id: string;
  name: string;
  handle: string;
  age: number;
  /** Approximate area only — never an exact address or coordinates. */
  area: string;
  /** Private location fields — only the city is ever shown publicly. */
  country: string;
  state: string;
  city: string;
  /** Used only for Women / Men / Everyone filtering. */
  gender: "Women" | "Men";
  /** Who this person is here to meet. */
  lookingFor: "Women" | "Men" | "Everyone";
  hobbies: string[];
  distanceKm: number;
  headline: string;
  about: string;
  interests: string[];
  photo: string;
  hue: number;
  verified?: boolean;
  /** Optional — why this person is on Orbit right now. */
  mood?: OrbitMoodId;
};

/** Distance is always bucketed so an exact position can never be derived. */
export const approxDistance = (km: number) => {
  if (km < 2) return "Under 2 km away";
  if (km < 5) return "~5 km away";
  if (km < 10) return "~10 km away";
  if (km < 25) return "~25 km away";
  return "50 km+ away";
};

export const orbitProfiles: OrbitProfile[] = [
  {
    id: "o1",
    name: "Riko Tan",
    handle: "riko.night",
    age: 27,
    area: "Shibuya area",
    country: "Japan",
    state: "Tokyo",
    city: "Shibuya",
    gender: "Women",
    lookingFor: "Everyone",
    hobbies: ["Photography", "Art", "Food", "Movies"],
    distanceKm: 1.4,
    headline: "Night photographer · film only",
    about: "Long exposures, neon alleys and 3am ramen. Looking for people to shoot with.",
    interests: ["Photography", "Film", "Night walks", "Ramen"],
    photo: reel1,
    hue: 300,
    verified: true,
    mood: "photography",
  },
  {
    id: "o2",
    name: "Mara Vega",
    handle: "sea.salt",
    age: 24,
    area: "Coastal district",
    country: "Australia",
    state: "New South Wales",
    city: "Sydney",
    gender: "Women",
    lookingFor: "Men",
    hobbies: ["Travel", "Adventure", "Sports", "Photography"],
    distanceKm: 6.2,
    headline: "Surf at sunrise, edit at sunset",
    about: "Ocean person. Will absolutely talk your ear off about tides and board wax.",
    interests: ["Surf", "Ocean", "Travel", "Coffee"],
    photo: reel2,
    hue: 190,
    mood: "travel",
  },
  {
    id: "o3",
    name: "Ada Kim",
    handle: "spinsolo",
    age: 26,
    area: "Studio quarter",
    country: "United States",
    state: "California",
    city: "Los Angeles",
    gender: "Women",
    lookingFor: "Everyone",
    hobbies: ["Music", "Fashion", "Gym & Fitness", "Art"],
    distanceKm: 3.1,
    headline: "Dancer · one light, one take",
    about: "Choreographing for small rooms. Always down for a late rehearsal.",
    interests: ["Dance", "Studio", "Music", "Sneakers"],
    photo: reel3,
    hue: 40,
    verified: true,
    mood: "music",
  },
  {
    id: "o4",
    name: "Noah Ferre",
    handle: "slowbrunch",
    age: 31,
    area: "Old town",
    country: "Germany",
    state: "Bavaria",
    city: "Munich",
    gender: "Men",
    lookingFor: "Women",
    hobbies: ["Food", "Shopping", "Music", "Friends & Fun"],
    distanceKm: 12.5,
    headline: "Pastry-led lifestyle",
    about: "Sunday tables, no plans. I make a decent croissant and a terrible espresso.",
    interests: ["Food", "Baking", "Markets", "Vinyl"],
    photo: post1,
    hue: 15,
    mood: "coffee",
  },
  {
    id: "o5",
    name: "Kai Oduya",
    handle: "wavelen",
    age: 29,
    area: "Riverside",
    country: "United Kingdom",
    state: "England",
    city: "London",
    gender: "Men",
    lookingFor: "Everyone",
    hobbies: ["Music", "Technology", "Gym & Fitness", "Reading"],
    distanceKm: 22,
    headline: "Sound design & synths",
    about: "Making ambient loops nobody asked for. Collabs welcome.",
    interests: ["Music", "Synths", "Running", "Books"],
    photo: reel2,
    hue: 250,
    mood: "workout",
  },
  {
    id: "o6",
    name: "Ines Roth",
    handle: "moss.club",
    age: 25,
    area: "Green belt",
    country: "Canada",
    state: "Ontario",
    city: "Toronto",
    gender: "Women",
    lookingFor: "Women",
    hobbies: ["Art", "Pets", "Adventure", "Reading"],
    distanceKm: 44,
    headline: "Plants, ceramics, quiet weekends",
    about: "Trading cuttings and mugs. Introvert with strong opinions on soil.",
    interests: ["Plants", "Ceramics", "Hiking", "Tea"],
    photo: reel1,
    hue: 150,
    mood: "friends",
  },
];

export const orbitById = (id: string) => orbitProfiles.find((p) => p.id === id);