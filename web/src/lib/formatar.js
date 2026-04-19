export function formatarData(valor, opcoes = {}) {
  if (!valor) return '—';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', ...opcoes });
}

export function formatarDataHora(valor) {
  if (!valor) return '—';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const ESTADOS_CANDIDATURA = {
  OPEN: { label: 'Em preparação', cor: 'bg-slate-100 text-slate-700' },
  SUBMITTED: { label: 'Submetida', cor: 'bg-amber-100 text-amber-800' },
  IN_TALENT_REVIEW: { label: 'Em análise (Talent)', cor: 'bg-blue-100 text-blue-800' },
  IN_SERVICE_LINE_REVIEW: { label: 'Em análise (SL)', cor: 'bg-indigo-100 text-indigo-800' },
  SENT_BACK: { label: 'Devolvida', cor: 'bg-orange-100 text-orange-800' },
  APPROVED: { label: 'Aprovada', cor: 'bg-emerald-100 text-emerald-800' },
  REJECTED: { label: 'Rejeitada', cor: 'bg-rose-100 text-rose-800' },
  CLOSED: { label: 'Fechada', cor: 'bg-slate-200 text-slate-700' },
};

export function estadoCandidatura(estado) {
  return ESTADOS_CANDIDATURA[estado] || { label: estado || '—', cor: 'bg-slate-100 text-slate-700' };
}
