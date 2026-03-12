export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiPatient {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  gender: string;
  date_of_birth: string | null;
  address: string;
}

export interface ApiAppointment {
  id: number;
  patient: number;
  patient_name: string;
  doctor: number;
  doctor_name: string;
  scheduled_at: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

export interface ApiCharge {
  id: number;
  patient: number;
  total_amount: string;
  paid_amount: string;
  status: 'unpaid' | 'partial' | 'paid';
  created_at: string;
}

export interface ApiDoctor {
  id: number;
  user_full_name: string;
  specialty: string;
  appointment_price: string;
  is_active: boolean;
}

export interface ApiService {
  id: number;
  code: string;
  name: string;
  category: string;
  price: string;
  is_active: boolean;
}
