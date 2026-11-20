export interface DeliveryLocation {
  id: string;
  city: string;
  state: string;
  country: string;
  isPune: boolean;
  standardDays: number;
  expressDays: number;
  expressLabel: string;
  codAvailable: boolean;
}

export interface LocationLookupResult {
  serviceable: boolean;
  location?: DeliveryLocation;
  city?: string;
  state?: string;
  country?: string;
  days?: number;
  expressDays?: number;
  codAvailable: boolean;
  estimatedDateLabel?: string;
  message: string;
}

export const SELECTABLE_INDIAN_LOCATIONS: DeliveryLocation[] = [
  {
    id: 'pune-maharashtra-india',
    city: 'Pune',
    state: 'Maharashtra',
    country: 'India',
    isPune: true,
    standardDays: 2,
    expressDays: 1,
    expressLabel: 'Priority Pune Dispatch',
    codAvailable: true
  },
  {
    id: 'mumbai-maharashtra-india',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    isPune: false,
    standardDays: 3,
    expressDays: 2,
    expressLabel: 'Maharashtra Express Transit',
    codAvailable: true
  },
  {
    id: 'nagpur-maharashtra-india',
    city: 'Nagpur',
    state: 'Maharashtra',
    country: 'India',
    isPune: false,
    standardDays: 3,
    expressDays: 2,
    expressLabel: 'Maharashtra Air Transit',
    codAvailable: true
  },
  {
    id: 'nashik-maharashtra-india',
    city: 'Nashik',
    state: 'Maharashtra',
    country: 'India',
    isPune: false,
    standardDays: 3,
    expressDays: 2,
    expressLabel: 'Maharashtra Express Road',
    codAvailable: true
  },
  {
    id: 'bengaluru-karnataka-india',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    isPune: false,
    standardDays: 4,
    expressDays: 2,
    expressLabel: 'Metro Air Express',
    codAvailable: true
  },
  {
    id: 'new-delhi-delhi-india',
    city: 'New Delhi',
    state: 'Delhi',
    country: 'India',
    isPune: false,
    standardDays: 4,
    expressDays: 2,
    expressLabel: 'Metro Air Express',
    codAvailable: true
  },
  {
    id: 'hyderabad-telangana-india',
    city: 'Hyderabad',
    state: 'Telangana',
    country: 'India',
    isPune: false,
    standardDays: 4,
    expressDays: 2,
    expressLabel: 'Metro Air Express',
    codAvailable: true
  },
  {
    id: 'jaipur-rajasthan-india',
    city: 'Jaipur',
    state: 'Rajasthan',
    country: 'India',
    isPune: false,
    standardDays: 4,
    expressDays: 3,
    expressLabel: 'Insured Air Transit',
    codAvailable: true
  },
  {
    id: 'chennai-tamil-nadu-india',
    city: 'Chennai',
    state: 'Tamil Nadu',
    country: 'India',
    isPune: false,
    standardDays: 4,
    expressDays: 3,
    expressLabel: 'Metro Air Transit',
    codAvailable: true
  },
  {
    id: 'kolkata-west-bengal-india',
    city: 'Kolkata',
    state: 'West Bengal',
    country: 'India',
    isPune: false,
    standardDays: 5,
    expressDays: 3,
    expressLabel: 'Metro Air Transit',
    codAvailable: true
  },
  {
    id: 'ahmedabad-gujarat-india',
    city: 'Ahmedabad',
    state: 'Gujarat',
    country: 'India',
    isPune: false,
    standardDays: 4,
    expressDays: 3,
    expressLabel: 'Western Air Transit',
    codAvailable: true
  },
  {
    id: 'kochi-kerala-india',
    city: 'Kochi',
    state: 'Kerala',
    country: 'India',
    isPune: false,
    standardDays: 5,
    expressDays: 3,
    expressLabel: 'Coastal Air Transit',
    codAvailable: true
  }
];

// Default website location: Pune, Maharashtra, India
export const DEFAULT_DELIVERY_LOCATION: DeliveryLocation = SELECTABLE_INDIAN_LOCATIONS[0];

export function formatLocationLabel(loc: Pick<DeliveryLocation, 'city' | 'state' | 'country'>): string {
  const city = loc.city?.trim() || 'Pune';
  const state = loc.state?.trim() || 'Maharashtra';
  const country = loc.country?.trim() || 'India';
  return `${city}, ${state}, ${country}`;
}

export function formatEstimatedDate(daysFromNow: number): string {
  const target = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  return target.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
}

export function findLocationByCityOrState(rawQuery: string): DeliveryLocation | null {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return null;

  const exactCity = SELECTABLE_INDIAN_LOCATIONS.find(
    (loc) =>
      loc.city.toLowerCase() === q ||
      `${loc.city}, ${loc.state}`.toLowerCase() === q ||
      formatLocationLabel(loc).toLowerCase() === q
  );
  if (exactCity) return exactCity;

  const partial = SELECTABLE_INDIAN_LOCATIONS.find(
    (loc) =>
      formatLocationLabel(loc).toLowerCase().includes(q) ||
      q.includes(loc.city.toLowerCase())
  );
  return partial || null;
}

export function resolveLocationDelivery(rawQuery: string): LocationLookupResult {
  const cleaned = rawQuery.trim();
  if (!cleaned) {
    return {
      serviceable: false,
      codAvailable: false,
      message: 'Please select a city or enter your city in India (default: Pune, Maharashtra, India).'
    };
  }

  const matched = findLocationByCityOrState(cleaned);
  if (matched) {
    const estDate = formatEstimatedDate(matched.expressDays);
    return {
      serviceable: true,
      location: matched,
      city: matched.city,
      state: matched.state,
      country: matched.country,
      days: matched.expressDays,
      expressDays: matched.expressDays,
      codAvailable: matched.codAvailable,
      estimatedDateLabel: estDate,
      message: `Delivering to ${formatLocationLabel(matched)} — Est. arrival by ${estDate}`
    };
  }

  return {
    serviceable: false,
    codAvailable: false,
    message: `Delivery estimate for "${cleaned}" is not currently pre-configured. Choose Pune, Maharashtra, India or another listed Indian city.`
  };
}
