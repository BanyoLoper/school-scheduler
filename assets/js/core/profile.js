import { api } from './api.js';

let _profile = null;

export async function getProfile() {
  if (_profile) return _profile;
  _profile = await api.get('/me');
  return _profile;
}

export function isAdmin() {
  return _profile?.role === 'admin';
}

export function hasCareer(careerId) {
  if (!_profile) return false;
  if (_profile.role === 'admin') return true;
  return _profile.career_ids.includes(careerId);
}
