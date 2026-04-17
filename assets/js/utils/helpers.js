import { DAY_LABELS, TIME_SLOTS } from './constants.js';

export function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function slotsOverlap(aStart, aEnd, bStart, bEnd) {
  return timeToMinutes(aStart) < timeToMinutes(bEnd) &&
         timeToMinutes(bStart) < timeToMinutes(aEnd);
}

export function formatDay(day) {
  return DAY_LABELS[day] ?? day;
}

export function formatTimeRange(start, end) {
  return `${start} – ${end}`;
}

export function generateTimeSlotsBetween(start, end) {
  const slots = [];
  const startMin = timeToMinutes(start);
  const endMin   = timeToMinutes(end);
  for (const slot of TIME_SLOTS) {
    const m = timeToMinutes(slot);
    if (m >= startMin && m < endMin) slots.push(slot);
  }
  return slots;
}

export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function groupBy(array, key) {
  return array.reduce((acc, item) => {
    const k = typeof key === 'function' ? key(item) : item[key];
    (acc[k] ??= []).push(item);
    return acc;
  }, {});
}
