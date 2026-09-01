export type Formula = {
  id: string;
  name: string;
  description: string | null;
  duration_hours: number;
  price_cents: number;
};

export type QuoteOption = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  formula_id: string | null;
};

export type Slot = {
  id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  is_open: boolean;
};

export type SelectedOption = {
  id: string;
  name: string;
  price_cents: number;
};

export type TravelInfo = {
  distanceKm: number;
  feeCents: number;
};
