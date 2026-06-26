import {
  Award,
  Bell,
  Check,
  CheckCircle,
  Clock,
  FileText,
  RefreshCw,
  Settings,
  Trash2,
  TriangleAlert,
  XCircle,
} from 'lucide-react';

export const TOPBAR_NOTIFICACOES_QUERY_KEY = ['topbar-notificacoes-nao-lidas'];

export const FILTROS_NOTIFICACOES = [
  { valor: '', label: 'Todas' },
  { valor: 'CANDIDATURA', label: 'Candidatura' },
  { valor: 'BADGE', label: 'Badge' },
  { valor: 'SLA', label: 'SLA' },
  { valor: 'SISTEMA', label: 'Sistema' },
];

export function tempoRelativo(dataStr) {
  const data = new Date(dataStr);
  if (!dataStr || Number.isNaN(data.getTime())) return 'Agora';

  const diff = Math.max(0, Date.now() - data.getTime());
  const min = Math.floor(diff / 60_000);
  const horas = Math.floor(diff / 3_600_000);
  const dias = Math.floor(diff / 86_400_000);

  if (min < 60) return `há ${min || 1} minuto${min === 1 ? '' : 's'}`;
  if (horas < 24) return `há ${horas} hora${horas === 1 ? '' : 's'}`;
  if (dias === 1) return 'há 1 dia';
  return `há ${dias} dias`;
}

export function grupoPeriodo(dataStr) {
  const data = new Date(dataStr);
  const hoje = new Date();
  if (!dataStr || Number.isNaN(data.getTime())) return 'ANTERIOR';
  if (data.toDateString() === hoje.toDateString()) return 'HOJE';

  const diff = (hoje.getTime() - data.getTime()) / 86_400_000;
  if (diff < 7) return 'ESTA SEMANA';
  return 'ANTERIOR';
}

export function formatarDataHora(dataStr) {
  if (!dataStr) return '—';
  const data = new Date(dataStr);
  if (Number.isNaN(data.getTime())) return '—';
  return data.toLocaleString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function textoNormalizado(notif) {
  return `${notif?.tipo || ''} ${notif?.categoria || ''} ${notif?.titulo || ''}`.toUpperCase();
}

export function classificarNotificacao(notif) {
  const texto = textoNormalizado(notif);
  const categoria = (notif?.categoria || '').toUpperCase();

  if (texto.includes('EXPIR')) return 'EXPIRACAO';
  if (texto.includes('SLA')) return 'SLA';
  if (categoria === 'BADGE' || texto.includes('BADGE')) return 'BADGE';
  if (
    categoria === 'CANDIDATURA'
    || texto.includes('CANDIDATURA')
    || texto.includes('PEDIDO')
    || texto.includes('EVIDENCIA')
    || texto.includes('EVIDÊNCIA')
    || texto.includes('SUBMET')
    || texto.includes('VALIDA')
    || texto.includes('REVISAO')
    || texto.includes('REVISÃO')
  ) return 'CANDIDATURA';
  return 'SISTEMA';
}

export function tipoNotificacaoVisual(notif) {
  const texto = textoNormalizado(notif);

  if (texto.includes('APROV') || texto.includes('ATRIBUID')) {
    return {
      label: 'Aprovação',
      icon: CheckCircle,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      badge: 'bg-emerald-100 text-emerald-700',
      border: 'border-l-emerald-400',
    };
  }

  if (texto.includes('REJEIT')) {
    return {
      label: 'Rejeição',
      icon: XCircle,
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-600',
      badge: 'bg-rose-100 text-rose-700',
      border: 'border-l-rose-400',
    };
  }

  if (texto.includes('DEVOLV')) {
    return {
      label: 'Devolução',
      icon: RefreshCw,
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-600',
      badge: 'bg-orange-100 text-orange-700',
      border: 'border-l-orange-400',
    };
  }

  if (texto.includes('EXPIR')) {
    return {
      label: 'Expiração',
      icon: TriangleAlert,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      badge: 'bg-amber-100 text-amber-700',
      border: 'border-l-amber-400',
    };
  }

  if (texto.includes('SLA') || texto.includes('LIMITE')) {
    return {
      label: 'Alerta',
      icon: TriangleAlert,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      badge: 'bg-amber-100 text-amber-700',
      border: 'border-l-amber-400',
    };
  }

  if (texto.includes('VALIDA') || texto.includes('REVISAO') || texto.includes('REVISÃO') || texto.includes('PENDENTE')) {
    return {
      label: 'Validação',
      icon: TriangleAlert,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      badge: 'bg-amber-100 text-amber-700',
      border: 'border-l-amber-400',
    };
  }

  if (texto.includes('BADGE')) {
    return {
      label: 'Badge',
      icon: Award,
      iconBg: 'bg-softinsa-50',
      iconColor: 'text-softinsa-700',
      badge: 'bg-softinsa-100 text-softinsa-700',
      border: 'border-l-softinsa-400',
    };
  }

  if (classificarNotificacao(notif) === 'CANDIDATURA') {
    return {
      label: 'Candidatura',
      icon: FileText,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      badge: 'bg-blue-100 text-blue-700',
      border: 'border-l-blue-400',
    };
  }

  return {
    label: 'Sistema',
    icon: Settings,
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
    badge: 'bg-slate-100 text-slate-600',
    border: 'border-l-slate-300',
  };
}

export function NotificacaoItem({
  notif,
  onLer,
  onEliminar,
  acao,
  compacto = false,
}) {
  const visual = tipoNotificacaoVisual(notif);
  const Icon = visual.icon || Bell;
  const id = notif.id_notificacao;

  function marcarLida(e) {
    e.stopPropagation();
    onLer?.(id);
  }

  function eliminar(e) {
    e.stopPropagation();
    onEliminar?.(id);
  }

  function executarAcao(e) {
    e.stopPropagation();
    acao?.onClick?.(notif);
  }

  return (
    <div
      className={`flex gap-4 rounded-xl border border-l-4 bg-white shadow-sm transition hover:bg-slate-50/40 ${
        notif.lida ? 'border-l-slate-200 opacity-80' : visual.border
      } ${compacto ? 'p-4' : 'p-5'}`}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${visual.iconBg} ${visual.iconColor}`}>
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className={`text-sm ${notif.lida ? 'font-semibold text-slate-700' : 'font-bold text-slate-900'}`}>
                {notif.titulo}
              </p>
              {!notif.lida && <span className="h-2 w-2 rounded-full bg-softinsa-500" aria-label="Não lida" />}
            </div>
            {notif.mensagem && <p className="mt-1 text-sm leading-relaxed text-slate-500">{notif.mensagem}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                <Clock className="h-3.5 w-3.5" strokeWidth={1.8} />
                {tempoRelativo(notif.data_criacao)}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${visual.badge}`}>
                {visual.label}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            {acao && (
              <button
                type="button"
                onClick={executarAcao}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {acao.label}
              </button>
            )}
            {!notif.lida && onLer && (
              <button
                type="button"
                onClick={marcarLida}
                className="inline-flex items-center gap-1.5 rounded-lg bg-softinsa-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-softinsa-700"
              >
                <Check className="h-3.5 w-3.5" strokeWidth={2} />
                Marcar lida
              </button>
            )}
            {onEliminar && (
              <button
                type="button"
                onClick={eliminar}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                title="Eliminar"
                aria-label="Eliminar notificação"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.8} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
