import { Patient, Appointment, Doctor, Payment, User } from './types';

export const currentUser: User = {
  id: '1',
  name: 'Aziz Raximov',
  role: 'SUPER_ADMIN',
  email: 'admin@medservise.uz'
};

export const patients: Patient[] = [
  { id: '1', name: 'Alisher Vohidov', phone: '+998901234567', dob: '1985-04-12', gender: 'Erkak', address: 'Toshkent sh. Chilonzor t.', lastVisit: '2023-10-15' },
  { id: '2', name: 'Malika Karimova', phone: '+998939876543', dob: '1992-08-25', gender: 'Ayol', address: 'Samarqand sh. Bogishamol t.', lastVisit: '2023-10-16' },
  { id: '3', name: 'Zokir Qodirov', phone: '+998991112233', dob: '1978-11-05', gender: 'Erkak', address: 'Buxoro sh.', lastVisit: '2023-10-10' },
  { id: '4', name: 'Nodira Xalikova', phone: '+998944445566', dob: '2001-02-18', gender: 'Ayol', address: 'Toshkent sh. Yunusobod t.', lastVisit: '2023-10-17' },
];

export const doctors: Doctor[] = [
  { id: '1', name: 'Dr. Temur Murodov', specialization: 'Kardiolog', room: '101', activePatients: 4 },
  { id: '2', name: 'Dr. Shahlo Turaeva', specialization: 'Nevropatolog', room: '102', activePatients: 2 },
  { id: '3', name: 'Dr. Botir Aliyev', specialization: 'Jarroh', room: '105', activePatients: 5 },
  { id: '4', name: 'Dr. Dildora Usmanova', specialization: 'Terapevt', room: '104', activePatients: 8 },
];

export const appointments: Appointment[] = [
  { id: '1', patientId: '1', patientName: 'Alisher Vohidov', doctorId: '1', doctorName: 'Dr. Temur Murodov', date: '2023-10-18', time: '09:00', status: 'Kutilmoqda' },
  { id: '2', patientId: '2', patientName: 'Malika Karimova', doctorId: '2', doctorName: 'Dr. Shahlo Turaeva', date: '2023-10-18', time: '10:30', status: 'Jarayonda' },
  { id: '3', patientId: '3', patientName: 'Zokir Qodirov', doctorId: '4', doctorName: 'Dr. Dildora Usmanova', date: '2023-10-18', time: '11:15', status: 'Yakunlandi' },
  { id: '4', patientId: '4', patientName: 'Nodira Xalikova', doctorId: '3', doctorName: 'Dr. Botir Aliyev', date: '2023-10-18', time: '14:00', status: 'Kutilmoqda' },
];

export const payments: Payment[] = [
  { id: '1', patientName: 'Alisher Vohidov', amount: 150000, paid: 150000, debt: 0, method: 'Naqd', status: 'Tolandi', date: '2023-10-18' },
  { id: '2', patientName: 'Malika Karimova', amount: 200000, paid: 100000, debt: 100000, method: 'Karta', status: 'Qisman', date: '2023-10-18' },
  { id: '3', patientName: 'Zokir Qodirov', amount: 350000, paid: 0, debt: 350000, method: 'Naqd', status: 'Tolanmadi', date: '2023-10-18' },
  { id: '4', patientName: 'Nodira Xalikova', amount: 120000, paid: 120000, debt: 0, method: 'Otkazma', status: 'Tolandi', date: '2023-10-18' },
];
