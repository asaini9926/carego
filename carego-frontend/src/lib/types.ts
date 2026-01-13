// Matches 'users' table
export interface User {
  id: string;
  phone: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'SALES' | 'CLIENT';
}

// Matches 'cities' table
export interface City {
  id: string;
  name: string;
  state: string;
}

// Matches 'services' table
export interface Service {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  price_range: string;
}

// Matches 'leads' table
export interface Lead {
  id: string;
  type: 'SERVICE' | 'TRAINING' | 'OTHER';
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST';
  name: string;
  phone: string;
  email?: string;
  address_text?: string;
  city_name?: string;
  state_name?: string;
  pincode?: string;
  service_interest_id?: string;
  service_name?: string; // Joined from backend
  created_at: string;
}

// API Responses
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface LoginResponse {
  success: boolean;
  user: User;
  accessToken: string;
  refreshToken: string;
}