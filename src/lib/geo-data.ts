/** Lightweight location catalogue. Only the city is ever shown publicly. */
export type GeoState = { name: string; cities: string[] };
export type GeoCountry = { name: string; states: GeoState[] };

export const GEO_COUNTRIES: GeoCountry[] = [
  {
    name: "United States",
    states: [
      { name: "California", cities: ["Los Angeles", "San Francisco", "San Diego", "Sacramento"] },
      { name: "New York", cities: ["New York City", "Brooklyn", "Buffalo", "Rochester"] },
      { name: "Texas", cities: ["Austin", "Dallas", "Houston", "San Antonio"] },
      { name: "Florida", cities: ["Miami", "Orlando", "Tampa", "Jacksonville"] },
    ],
  },
  {
    name: "United Kingdom",
    states: [
      { name: "England", cities: ["London", "Manchester", "Bristol", "Brighton"] },
      { name: "Scotland", cities: ["Edinburgh", "Glasgow", "Aberdeen"] },
      { name: "Wales", cities: ["Cardiff", "Swansea"] },
    ],
  },
  {
    name: "India",
    states: [
      { name: "Maharashtra", cities: ["Mumbai", "Pune", "Nagpur"] },
      { name: "Karnataka", cities: ["Bengaluru", "Mysuru", "Mangaluru"] },
      { name: "Delhi", cities: ["New Delhi", "Dwarka", "Rohini"] },
      { name: "Tamil Nadu", cities: ["Chennai", "Coimbatore", "Madurai"] },
    ],
  },
  {
    name: "Japan",
    states: [
      { name: "Tokyo", cities: ["Shibuya", "Shinjuku", "Setagaya"] },
      { name: "Osaka", cities: ["Osaka", "Sakai"] },
      { name: "Hokkaido", cities: ["Sapporo", "Hakodate"] },
    ],
  },
  {
    name: "Australia",
    states: [
      { name: "New South Wales", cities: ["Sydney", "Newcastle", "Wollongong"] },
      { name: "Victoria", cities: ["Melbourne", "Geelong"] },
      { name: "Queensland", cities: ["Brisbane", "Gold Coast", "Cairns"] },
    ],
  },
  {
    name: "Germany",
    states: [
      { name: "Berlin", cities: ["Berlin"] },
      { name: "Bavaria", cities: ["Munich", "Nuremberg"] },
      { name: "Hamburg", cities: ["Hamburg"] },
    ],
  },
  {
    name: "Canada",
    states: [
      { name: "Ontario", cities: ["Toronto", "Ottawa", "Hamilton"] },
      { name: "British Columbia", cities: ["Vancouver", "Victoria"] },
      { name: "Quebec", cities: ["Montreal", "Quebec City"] },
    ],
  },
  {
    name: "United Arab Emirates",
    states: [
      { name: "Dubai", cities: ["Dubai", "Jumeirah"] },
      { name: "Abu Dhabi", cities: ["Abu Dhabi", "Al Ain"] },
    ],
  },
];

export const statesOf = (country: string) =>
  GEO_COUNTRIES.find((c) => c.name === country)?.states ?? [];

export const citiesOf = (country: string, state: string) =>
  statesOf(country).find((s) => s.name === state)?.cities ?? [];
