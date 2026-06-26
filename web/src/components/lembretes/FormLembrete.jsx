import { useState } from 'react';

export default function FormLembrete({ onCriar, onCancelar, aPending }) {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataLimite, setDataLimite] = useState('');

  function submeter(e) {
    e.preventDefault();
    if (!titulo.trim()) return;
    onCriar({
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      data_limite: dataLimite || null,
    });
  }

  return (
    <form onSubmit={submeter} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-600">Título *</label>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex.: Concluir curso de AWS"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-softinsa-400"
            autoFocus
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-600">Descrição</label>
          <input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Detalhes (opcional)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-softinsa-400"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Data limite</label>
          <input
            type="date"
            value={dataLimite}
            onChange={(e) => setDataLimite(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-softinsa-400"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={aPending || !titulo.trim()}
          className="rounded-lg bg-softinsa-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-softinsa-700 disabled:opacity-60"
        >
          {aPending ? 'A guardar...' : 'Criar lembrete'}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
