export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'REGISTRATOR' | 'DOCTOR' | 'LAB_TECH' | 'TREATMENT_TECH';

export interface User {
  id: string;
  name: string;
  role: Role;
  email: string;
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  dob: string;
  gender: 'Erkak' | 'Ayol';
  address: string;
  lastVisit: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  time: string;
  status: 'Kutilmoqda' | 'Jarayonda' | 'Yakunlandi' | 'Bekor_qilindi';
}

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  room: string;
  activePatients: number;
}

export interface Payment {
  id: string;
  patientName: string;
  amount: number;
  paid: number;
  debt: number;
  method: 'Naqd' | 'Karta' | 'Otkazma';
  status: 'Tolandi' | 'Qisman' | 'Tolanmadi';
  date: string;
}
