import {
  Coffee,
  Clapperboard,
  UtensilsCrossed,
  MapPin,
  Pizza,
  Navigation,
  Hotel,
} from "lucide-react";
import type { PlaceResult } from "@/lib/places.functions";

export type InviteKind =
  | "cafe"
  | "movie"
  | "restaurant"
  | "meet"
  | "food"
  | "location"
  | "hotel";

export type InviteOption = {
  id: InviteKind;
  label: string;
  icon: typeof Coffee;
  /** Search phrase sent to Google Places. */
  query: string;
};

export const inviteOptions: InviteOption[] = [
  { id: "cafe", label: "Café", icon: Coffee, query: "cafes" },
  { id: "movie", label: "Movie", icon: Clapperboard, query: "movie theatres" },
  { id: "restaurant", label: "Restaurant", icon: UtensilsCrossed, query: "restaurants" },
  { id: "meet", label: "Meet", icon: MapPin, query: "parks and public meeting spots" },
  { id: "food", label: "Food", icon: Pizza, query: "food delivery and takeaway" },
  { id: "location", label: "Location", icon: Navigation, query: "landmarks" },
  { id: "hotel", label: "Hotel", icon: Hotel, query: "hotels" },
];

export const inviteById = (id: InviteKind) =>
  inviteOptions.find((o) => o.id === id) ?? inviteOptions[0];

export type InviteCard = {
  kind: InviteKind;
  title: string;
  place: string;
  address: string;
  rating?: number;
  open?: boolean;
  mapsUrl?: string;
};

export const buildInvite = (kind: InviteKind, place: PlaceResult): InviteCard => ({
  kind,
  title: `${inviteById(kind).label} invite`,
  place: place.name,
  address: place.address,
  rating: place.rating,
  open: place.open,
  mapsUrl: place.mapsUrl,
});
