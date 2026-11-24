export type Role = "admin" | "employee";

export type Profile = {
  id: string;
  full_name: string;
  role: Role;
  active: boolean;
  created_at: string;
};

export type Client = {
  id: string;
  name: string;
  phone: string;
  tax_id: string | null;
  notes: string | null;
  created_at: string;
};

export type Repair = {
  id: string;
  code: string | null;
  client_id: string;
  console: string | null;
  fault: string | null;
  detail: string | null;
  cost: number | string | null;
  received_at: string;
  repaired_at: string | null;
  informed_at: string | null;
  collected_at: string | null;
  payment_method: string | null;
  created_by: string | null;
  created_at: string;
  updated_at?: string;
  client?: ClientBrief | ClientBrief[] | null;
};

export type ClientBrief = {
  id: string;
  name: string;
  phone: string;
  tax_id?: string | null;
};

export type Quote = {
  found: boolean;
  live?: boolean;
  console?: string;
  fault?: string;
  price?: number;
  base_price?: number;
  min_days?: number;
  max_days?: number;
  pending?: number;
  threshold?: number;
  busy?: boolean;
  surcharge_percent?: number;
  notes?: string | null;
};

export type CatalogItem = {
  console: string;
  family: string;
  fault: string;
  display_order: number;
  fault_order: number;
};

export type TimeEntry = {
  id: string;
  employee_id: string;
  clock_in: string;
  clock_out: string | null;
  original_clock_in: string | null;
  original_clock_out: string | null;
  correction_note: string | null;
  corrected_at: string | null;
  corrected_by: string | null;
};

export type Invoice = {
  id: string;
  repair_id: string | null;
  series: string;
  number: number;
  issue_date: string;
  issuer_name: string | null;
  issuer_tax_id: string | null;
  client_name: string;
  client_tax_id: string | null;
  description: string;
  base_amount: number | string;
  tax_rate: number | string;
  tax_amount: number | string;
  total: number | string;
  payment_method: string | null;
  status: string;
  verifactu_status: string;
  previous_hash: string | null;
  invoice_hash: string | null;
};

export type PriceRow = {
  id: string;
  console: string;
  console_family: string;
  fault: string;
  base_price: number | string;
  min_days: number;
  max_days: number;
  display_order: number;
  fault_order: number;
  notes: string | null;
  active: boolean;
};

export type ShopSettings = {
  id: number;
  shop_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  legal_name: string | null;
  tax_id: string | null;
  invoice_series: string;
  pending_threshold: number;
  surcharge_percent: number | string;
  invite_code: string;
};
