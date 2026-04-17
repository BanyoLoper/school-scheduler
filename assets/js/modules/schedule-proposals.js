import { getProfile } from '../core/profile.js';
import { escapeHtml } from '../utils/helpers.js';

const STORAGE_KEY = 'school-schedule-proposals';

function getStored() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
}

function persist(proposals) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(proposals));
}

export async function renderProposalsList() {
  const container = document.getElementById('proposals-list');
  if (!container) return;

  const profile   = await getProfile();
  const proposals = getStored();

  if (!proposals.length) {
    container.innerHTML = '<p style="color:var(--color-muted)">No hay propuestas guardadas aún.</p>';
    return;
  }

  container.innerHTML = `<div class="proposals-grid">${proposals.map(p => buildCard(p, profile)).join('')}</div>`;

  container.querySelectorAll('[data-vote]').forEach(btn => {
    btn.addEventListener('click', () => vote(btn.dataset.pid, btn.dataset.vote, profile.email));
  });
  container.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => viewProposal(btn.dataset.pid));
  });
  container.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => deleteProposal(btn.dataset.pid));
  });
}

function buildCard(p, profile) {
  const upVotes   = Object.values(p.votes ?? {}).filter(v => v === 'up').length;
  const downVotes = Object.values(p.votes ?? {}).filter(v => v === 'down').length;
  const myVote    = p.votes?.[profile.email];

  const createdAt   = new Date(p.created_at).toLocaleString('es-MX', { dateStyle:'medium', timeStyle:'short' });
  const coverageText = p.coverage?.map(c =>
    `${escapeHtml(c.career_name)}: sem. ${c.semesters.join(', ')}`
  ).join('<br>') ?? '—';

  const statusBadge = p.violation_count > 0
    ? `<span class="badge badge-warning">⚠ ${p.violation_count} advertencia${p.violation_count > 1 ? 's' : ''}</span>`
    : `<span class="badge badge-success">Sin advertencias</span>`;

  const canDelete = profile.role === 'admin' || p.created_by === profile.email;

  return `
    <div class="proposal-card">
      <div class="proposal-meta">
        <span class="proposal-author">${escapeHtml(p.created_by)}</span>
        <span class="proposal-date">${createdAt}</span>
      </div>
      <div class="proposal-coverage">${coverageText}</div>
      <div class="proposal-stats">
        ${statusBadge}
        <span class="badge">${p.assignments?.length ?? 0} asignaciones</span>
      </div>
      <div class="proposal-actions">
        <button class="btn btn-sm ${myVote === 'up' ? 'btn-primary' : 'btn-secondary'}"
                data-vote="up" data-pid="${p.id}">
          👍 <span class="vote-count">${upVotes}</span>
        </button>
        <button class="btn btn-sm ${myVote === 'down' ? 'btn-danger' : 'btn-secondary'}"
                data-vote="down" data-pid="${p.id}">
          👎 <span class="vote-count">${downVotes}</span>
        </button>
        <button class="btn btn-sm btn-secondary" data-view="${p.id}">Ver horario</button>
        ${canDelete ? `<button class="btn btn-sm btn-danger" data-del="${p.id}">Eliminar</button>` : ''}
      </div>
    </div>`;
}

function vote(pid, direction, email) {
  const proposals = getStored();
  const p = proposals.find(x => x.id === pid);
  if (!p) return;

  if (p.votes[email] === direction) {
    delete p.votes[email];
  } else {
    p.votes[email] = direction;
  }

  persist(proposals);
  renderProposalsList();
}

function deleteProposal(pid) {
  if (!confirm('¿Eliminar esta propuesta? No se puede deshacer.')) return;
  persist(getStored().filter(p => p.id !== pid));
  renderProposalsList();
}

function viewProposal(pid) {
  // Dispatch event — schedule.js listens and activates read-only mode
  document.dispatchEvent(new CustomEvent('schedule:view-proposal', { detail: { pid } }));

  // Switch to editor tab
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => { p.hidden = true; });
  document.querySelector('[data-tab="editor"]')?.classList.add('active');
  const editorTab = document.getElementById('tab-editor');
  if (editorTab) editorTab.hidden = false;
}
