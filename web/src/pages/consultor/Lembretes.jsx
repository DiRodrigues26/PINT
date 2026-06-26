import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, ListTodo, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import { ConsultorSidebar, ConsultorTopbar } from '../../components/ConsultorShell';
import Carregando from '../../components/Carregando';
import FormLembrete from '../../components/lembretes/FormLembrete';
import ItemLembrete from '../../components/lembretes/ItemLembrete';
import { useLanguage } from '../../context/LanguageContext';

const FILTROS = [
  { key: 'pendentes', label: 'Pendentes' },
  { key: 'todos', label: 'Todos' },
  { key: 'concluidos', label: 'Concluídos' },
];

function ordenarLembretes(lista) {
  return [...lista].sort((a, b) => {
    if (Number(a.concluido) !== Number(b.concluido)) return Number(a.concluido) - Number(b.concluido);
    const dataA = a.data_limite ? new Date(a.data_limite).getTime() : Number.MAX_SAFE_INTEGER;
    const dataB = b.data_limite ? new Date(b.data_limite).getTime() : Number.MAX_SAFE_INTEGER;
    return dataA - dataB;
  });
}

export default function Lembretes() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [filtro, setFiltro] = useState('pendentes');

  const { data, isLoading } = useQuery({
    queryKey: ['lembretes', 'todos'],
    queryFn: async () => {
      const { data } = await api.get('/api/lembretes');
      return data;
    },
    staleTime: 60_000,
  });

  const criarLembrete = useMutation({
    mutationFn: (payload) => api.post('/api/lembretes', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lembretes'] });
      toast.success('Lembrete criado.');
      setMostrarForm(false);
      setFiltro('pendentes');
    },
    onError: () => toast.error('Erro ao criar lembrete.'),
  });

  const toggleLembrete = useMutation({
    mutationFn: (lembrete) => api.put(`/api/lembretes/${lembrete.id_lembrete}`, { concluido: !lembrete.concluido }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lembretes'] }),
    onError: () => toast.error('Erro ao atualizar lembrete.'),
  });

  const eliminarLembrete = useMutation({
    mutationFn: (id) => api.delete(`/api/lembretes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lembretes'] });
      toast.success('Lembrete eliminado.');
    },
    onError: () => toast.error('Erro ao eliminar lembrete.'),
  });

  const lembretes = useMemo(() => {
    const lista = data?.dados ?? [];
    const filtrada = lista.filter((lembrete) => {
      if (filtro === 'pendentes') return !lembrete.concluido;
      if (filtro === 'concluidos') return !!lembrete.concluido;
      return true;
    });
    return ordenarLembretes(filtrada);
  }, [data, filtro]);

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      <ConsultorSidebar />
      <div className="lg:pl-[260px]">
        <ConsultorTopbar subtitulo="Lembretes pessoais e próximos passos" />

        <main className="px-5 py-8 pb-24 lg:px-10 lg:pb-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-softinsa-100 px-3 py-1 text-xs font-bold text-softinsa-700">
                <ListTodo className="h-3.5 w-3.5" />
                {t('tab_lembretes')}
              </div>
              <h2 className="mt-3 text-2xl font-bold text-slate-900">Lembretes pessoais</h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Organiza tarefas, prazos e pequenos compromissos ligados à tua evolução profissional.
              </p>
            </div>

            {!mostrarForm && (
              <button
                type="button"
                onClick={() => setMostrarForm(true)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-softinsa-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-softinsa-700"
              >
                <Plus className="h-4 w-4" strokeWidth={2} />
                Novo lembrete
              </button>
            )}
          </div>

          {mostrarForm && (
            <div className="mt-6">
              <FormLembrete
                onCriar={(payload) => criarLembrete.mutate(payload)}
                onCancelar={() => setMostrarForm(false)}
                aPending={criarLembrete.isPending}
              />
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            {FILTROS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFiltro(item.key)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  filtro === item.key
                    ? 'bg-softinsa-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <Carregando />
            </div>
          ) : lembretes.length === 0 ? (
            <div className="mt-16 flex flex-col items-center text-center">
              <Bell className="h-14 w-14 text-slate-300" strokeWidth={1} />
              <p className="mt-4 text-base font-semibold text-slate-600">{t('sem_lembretes')}</p>
              <p className="mt-1 text-sm text-slate-400">{t('sem_lembretes_desc')}</p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {lembretes.map((lembrete) => (
                <ItemLembrete
                  key={lembrete.id_lembrete}
                  lembrete={lembrete}
                  onToggle={(item) => toggleLembrete.mutate(item)}
                  onEliminar={(id) => eliminarLembrete.mutate(id)}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
