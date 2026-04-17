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

export const REPORTER_LABELS = { teacher: 'Profesor', student: 'Alumno' };

export const REPORT_STATUS = {
  pending:       'Pendiente',
  fixed:         'Arreglado',
  'false-alarm': 'Falsa alarma',
  duplicate:     'Duplicado',
};

export const REPORT_STATUS_COLORS = {
  pending:       'warning',
  fixed:         'success',
  'false-alarm': 'secondary',
  duplicate:     'info',
};

const LOCAL = ['localhost', '127.0.0.1'].includes(window.location.hostname);
export const API_BASE = LOCAL
  ? 'http://localhost:8787/api'
  : 'https://school-schedule-api.banyoloper.workers.dev/api';
