export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export const DAY_LABELS = {
  monday:    'Lunes',
  tuesday:   'Martes',
  wednesday: 'Miércoles',
  thursday:  'Jueves',
  friday:    'Viernes',
  saturday:  'Sábado',
};

export const TIME_SLOTS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
  '19:00', '20:00', '21:00',
];

export const ROOM_TYPES = { lab: 'Laboratorio', theory: 'Teórico' };

export const COMPUTER_TIERS = { none: 'Sin equipos', basic: 'Básico', high: 'Alto rendimiento' };

export const SOFTWARE_CATEGORIES = {
  design:        'Diseño',
  development:   'Desarrollo',
  cybersecurity: 'Ciberseguridad',
  networking:    'Redes',
  none:          'General',
};

export const LICENSE_TYPES = { free: 'Libre', commercial: 'Comercial', edu: 'Educativo' };

export const NEGOTIATION_STATUS = {
  pending:  'Pendiente',
  accepted: 'Aceptado',
  rejected: 'Rechazado',
};

export const REPORT_STATUS = {
  open:        'Abierto',
  'in-progress': 'En proceso',
  resolved:    'Resuelto',
};

export const REPORT_STATUS_COLORS = {
  open:          'danger',
  'in-progress': 'warning',
  resolved:      'success',
};

export const API_BASE = 'https://school-schedule-api.banyoloper.workers.dev/api';
