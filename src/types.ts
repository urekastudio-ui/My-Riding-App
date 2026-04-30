export interface EmergencyContact {
  name: string;
  phone: string;
}

export interface UserProfile {
  odometer: number;
  emergencyContact?: EmergencyContact;
  lastUpdated?: string;
}

export interface MaintenanceRecord {
  id?: string;
  type: string;
  mileage: number;
  date: string;
  cost: number;
  notes?: string;
}

export interface SensorData {
  speed: number; // m/s
  distance: number; // meters for current trip
  coords: {
    latitude: number;
    longitude: number;
  } | null;
  accuracy: number;
}
