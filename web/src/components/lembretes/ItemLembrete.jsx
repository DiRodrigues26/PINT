import { BookOpen, Check, RefreshCw, Trash2 } from 'lucide-react';

export function estadoLembrete(lembrete) {
  const vencido = lembrete.data_limite && !lembrete.concluido && new Date(lembrete.data_limite) < new Date();
  const dias = lembrete.data_limite
    ? Math.ceil((new Date(lembrete.data_limite) - Date.now()) / 86_400_000)
    : null;

  if (lembrete.concluido) return { texto: 'Concluído', tom: 'text-emerald-600' };
  if (vencido) return { texto: 'Prazo ultrapassado', tom: 'text-red-500' };
  if (dias === 0) return { texto: 'Vence hoje', tom: 'text-amber-600' };
  if (dias !== null) return { texto: `Vence em ${dias} dia${dias !== 1 ? 's' : ''}`, tom: dias <= 3 ? 'text-amber-600' : 'text-slate-400' };
  return { texto: 'Sem prazo definido', tom: 'text-slate-400' };
}

export default function ItemLembrete({ lembrete, onToggle, onEliminar, compacto = false }) {
  const vencido = lembrete.data_limite && !lembrete.concluido && new Date(lembrete.data_limite) < new Date();
  const estado = estadoLembrete(lembrete);

  return (
    <div className={`flex gap-4 rounded-xl border border-slate-200 border-l-4 bg-white shadow-sm ${
      lembrete.concluido ? 'border-l-emerald-400 opacity-70' : vencido ? 'border-l-red-400' : 'border-l-softinsa-400'
    } ${compacto ? 'p-4' : 'p-5'}`}>
      <div className={`flex ${compacto ? 'h-9 w-9' : 'h-11 w-11'} shrink-0 items-center justify-center rounded-full ${
        lembrete.concluido ? 'bg-emerald-100' : vencido ? 'bg-red-100' : 'bg-softinsa-100'
      }`}>
        <BookOpen className={`${compacto ? 'h-4 w-4' : 'h-5 w-5'} ${
          lembrete.concluido ? 'text-emerald-600' : vencido ? 'text-red-500' : 'text-softinsa-600'
        }`} strokeWidth={1.8} />
      </div>

      <div className="min-w-0 flex-1">
        <p className={`text-sm font-bold text-slate-800 ${lembrete.concluido ? 'line-through' : ''}`}>
          {lembrete.titulo}
        </p>
        {lembrete.descricao && !compacto && (
          <p className="mt-0.5 text-xs text-slate-500">{lembrete.descricao}</p>
        )}
        <p className={`mt-1 text-xs font-semibold ${estado.tom}`}>{estado.texto}</p>
      </div>

      <div className="flex shrink-0 items-start gap-1.5">
        <button
          type="button"
          onClick={() => onToggle(lembrete)}
          title={lembrete.concluido ? 'Reabrir lembrete' : 'Marcar como concluído'}
          className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
            lembrete.concluido
              ? 'border-slate-200 text-slate-400 hover:bg-slate-50'
              : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
          }`}
        >
          {lembrete.concluido ? <RefreshCw className="h-4 w-4" /> : <Check className="h-4 w-4" />}
        </button>
        {onEliminar && (
          <button
            type="button"
            onClick={() => onEliminar(lembrete.id_lembrete)}
            title="Eliminar lembrete"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
