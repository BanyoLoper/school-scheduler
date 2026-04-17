import { buildProposal } from './scheduler-engine.js';

export async function runScheduler(DB, careerId, semester) {
  return buildProposal(DB, careerId, semester ?? null);
}
