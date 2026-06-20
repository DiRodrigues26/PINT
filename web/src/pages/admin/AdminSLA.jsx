import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Download,
  Eye,
  FileText,
  Save,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extrairErro } from '../../lib/api';
import { descarregarCsv, imprimirTabela } from '../../lib/exportar';
import { useLanguage } from '../../context/LanguageContext';
import { DetalheCandidatura, Modal } from './AdminCandidaturas';
import Paginacao from '../../components/admin/Paginacao';

const CONFIG_INICIAL = {
  TALENT_REVIEW: { limite: 48, unidade: 'horas', ativo: true },
  SERVICE_LINE_REVIEW: { limite: 72, unidade: 'horas', ativo: true },
};

const ICONES = {
  bell: Bell,
  download: Download,
  eye: Eye,
  file: FileText,
  save: Save,
};

function Icon({ nome, className = 'h-5 w-5' }) {
  const Componente = ICONES[nome] || FileText;
  return <Componente className={className} aria-hidden="true" strokeWidth={1.8} />;
}

function horasLimite(item) {
  if (!item?.ativo) return null;
  return Number(item.limite || 0) * (item.unidade === 'dias' ? 24 : 1);
}

function estadoSla(item, t) {
  if (!item.limite_horas) return { label: t('admin_sla_sem_sla'), cor: 'bg-slate-100 text-slate-600' };
  if (item.estado_sla === 'ULTRAPASSADO') return { label: t('admin_sla_ultrapassado'), cor: 'bg-rose-100 text-rose-700' };
  if (item.estado_sla === 'PROXIMO_LIMITE') return { label: t('admin_sla_proximo_limite'), cor: 'bg-orange-100 text-orange-700' };
  return { label: t('admin_sla_dentro_prazo'), cor: 'bg-emerald-100 text-emerald-700' };
}

function estadoProcesso(estado, t) {
  const labels = {
    OPEN: t('admin_dash_state_open'),
    SUBMITTED: t('admin_rel_est_submitted'),
    IN_TALENT_REVIEW: t('admin_rel_est_talent_review'),
    IN_SERVICE_LINE_REVIEW: t('admin_rel_est_sl_review'),
    SENT_BACK: t('admin_dash_state_sent_back'),
    APPROVED: t('admin_dash_state_approved'),
    REJECTED: t('admin_dash_state_rejected'),
    CLOSED: t('admin_rel_est_closed'),
  };
  return labels[estado] || estado || '—';
}

function dadosSla(items, t) {
  const headers = [
    t('admin_dash_col_consultant'), t('admin_dash_col_badge'), t('admin_rel_col_area'), t('admin_dash_col_service_line'),
    t('admin_sla_col_estado_processo'), t('admin_sla_col_tempo_decorrido'), t('admin_sla_col_sla_definido'), t('admin_sla_col_estado_sla'),
  ];
  const linhas = items.map((item) => [
    item.nome_consultor,
    item.titulo_badge,
    item.nome_area,
    item.nome_service_line,
    estadoProcesso(item.estado_atual, t),
    `${item.horas_em_fase || 0}h`,
    item.limite_horas ? `${item.limite_horas}h` : t('admin_sla_sem_sla'),
    estadoSla(item, t).label,
  ]);
  return { headers, linhas };
}

function CardConfig({ meta, form, onChange, t }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-bold text-slate-800">{meta.titulo}</h3>
      <p className="mt-2 text-sm text-slate-500">{meta.descricao}</p>

      <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">{t('admin_sla_tempo_maximo')}</label>
          <input
            type="number"
            min="1"
            className="input"
            value={form.limite}
            onChange={(e) => onChange(meta.fase, 'limite', e.target.value)}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">{t('admin_sla_unidade')}</label>
          <select className="input" value={form.unidade} onChange={(e) => onChange(meta.fase, 'unidade', e.target.value)}>
            <option value="horas">{t('admin_sla_horas')}</option>
            <option value="dias">{t('admin_sla_dias')}</option>
          </select>
        </div>
      </div>

      <div className="mt-6 flex gap-5 text-base text-slate-700">
        <label className="flex items-center gap-2">
          <input type="radio" className="h-4 w-4 text-softinsa-600" checked={form.ativo} onChange={() => onChange(meta.fase, 'ativo', true)} />
          {t('admin_sla_ativo')}
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" className="h-4 w-4 text-softinsa-600" checked={!form.ativo} onChange={() => onChange(meta.fase, 'ativo', false)} />
          {t('admin_sla_inativo')}
        </label>
      </div>
    </section>
  );
}

export default function AdminSLA() {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [form, setForm] = useState(CONFIG_INICIAL);
  const [pagina, setPagina] = useState(1);
  const [modal, setModal] = useState(null);
  const porPagina = 5;

  const FASES = [
    { fase: 'TALENT_REVIEW', titulo: t('admin_sla_fase_talent_titulo'), descricao: t('admin_sla_fase_talent_desc') },
    { fase: 'SERVICE_LINE_REVIEW', titulo: t('admin_sla_fase_sl_titulo'), descricao: t('admin_sla_fase_sl_desc') },
  ];

  const slas = useQuery({
    queryKey: ['admin', 'sla'],
    queryFn: async () => (await api.get('/api/sla')).data,
  });

  const monitorizacao = useQuery({
    queryKey: ['admin', 'sla', 'monitorizacao'],
    queryFn: async () => (await api.get('/api/sla/fora-prazo', { params: { todos: 1 } })).data,
    refetchInterval: 15000,
  });

  useEffect(() => {
    const dados = slas.data?.dados;
    if (!dados) return;
    setForm((atual) => {
      const proximo = { ...atual };
      for (const item of dados) {
        proximo[item.fase] = {
          limite: item.limite,
          unidade: item.unidade,
          ativo: item.ativo !== 0,
        };
      }
      return proximo;
    });
  }, [slas.data]);

  const guardar = useMutation({
    mutationFn: async () => {
      await Promise.all(FASES.map(({ fase }) => api.put(`/api/sla/${fase}`, {
        limite: Number(form[fase].limite),
        unidade: form[fase].unidade,
        ativo: form[fase].ativo,
      })));
    },
    onSuccess: () => {
      toast.success(t('admin_sla_toast_atualizado'));
      qc.invalidateQueries({ queryKey: ['admin', 'sla'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => toast.error(extrairErro(err, t('admin_sla_erro_guardar'))),
  });

  const notificar = useMutation({
    mutationFn: (item) => api.post(`/api/sla/${item.id_candidatura}/notificar`, {
      mensagem: t('admin_sla_msg_notificar').replace('{id}', item.id_candidatura).replace('{estado}', estadoSla(item, t).label),
    }),
    onSuccess: () => {
      toast.success(t('admin_sla_toast_notificado'));
      qc.invalidateQueries({ queryKey: ['admin', 'sla', 'monitorizacao'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => toast.error(extrairErro(err, t('admin_sla_erro_notificar'))),
  });

  const itens = monitorizacao.data?.dados || [];
  const totalPaginas = Math.max(1, Math.ceil(itens.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = useMemo(() => {
    const inicio = (paginaAtual - 1) * porPagina;
    return itens.slice(inicio, inicio + porPagina);
  }, [itens, paginaAtual]);

  function atualizar(fase, campo, valor) {
    setForm((atual) => ({
      ...atual,
      [fase]: {
        ...atual[fase],
        [campo]: valor,
      },
    }));
  }

  return (
    <div className="mx-auto max-w-[1560px] space-y-8">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t('admin_menu_sla')}</h1>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-secondary" onClick={() => { const { headers, linhas } = dadosSla(itens, t); descarregarCsv('gestao-sla.csv', headers, linhas); }}>
            <Icon nome="download" className="h-4 w-4" /> {t('admin_sla_export_excel')}
          </button>
          <button type="button" className="btn-secondary" onClick={() => { const { headers, linhas } = dadosSla(itens, t); imprimirTabela(t('admin_menu_sla'), headers, linhas); }}>
            <Icon nome="file" className="h-4 w-4" /> {t('admin_sla_export_pdf')}
          </button>
          <button type="button" className="btn-primary" disabled={guardar.isPending} onClick={() => guardar.mutate()}>
            <Icon nome="save" className="h-4 w-4" /> {t('admin_sla_guardar')}
          </button>
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-xl font-bold text-slate-800">{t('admin_sla_config_titulo')}</h2>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {FASES.map((meta) => (
            <CardConfig key={meta.fase} meta={meta} form={form[meta.fase]} onChange={atualizar} t={t} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold text-slate-800">{t('admin_sla_monitor_titulo')}</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1360px] w-full text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-4 text-left">{t('admin_dash_col_consultant')}</th>
                  <th className="px-4 py-4 text-left">{t('admin_dash_col_badge')}</th>
                  <th className="px-4 py-4 text-left">{t('admin_rel_col_area')}</th>
                  <th className="px-4 py-4 text-left">{t('admin_dash_col_service_line')}</th>
                  <th className="px-4 py-4 text-center">{t('admin_sla_col_estado_processo')}</th>
                  <th className="px-4 py-4 text-center">{t('admin_sla_col_tempo_decorrido')}</th>
                  <th className="px-4 py-4 text-center">{t('admin_sla_col_sla_definido')}</th>
                  <th className="px-4 py-4 text-center">{t('admin_sla_col_estado_sla')}</th>
                  <th className="px-4 py-4 text-center">{t('admin_sla_col_acoes')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {monitorizacao.isLoading ? (
                  <tr><td colSpan={9} className="px-5 py-12 text-center text-slate-500">{t('admin_sla_a_carregar_monitor')}</td></tr>
                ) : visiveis.map((item) => {
                  const estado = estadoSla(item, t);
                  return (
                    <tr key={item.id_candidatura} className="text-slate-700">
                      <td className="px-4 py-5 font-semibold text-slate-800">{item.nome_consultor}</td>
                      <td className="px-4 py-5 text-slate-600">{item.titulo_badge}</td>
                      <td className="px-4 py-5 text-slate-500">{item.nome_area}</td>
                      <td className="px-4 py-5 text-slate-500">{item.nome_service_line}</td>
                      <td className="px-4 py-5 text-center text-slate-600">{estadoProcesso(item.estado_atual, t)}</td>
                      <td className="px-4 py-5 text-center font-semibold text-slate-800">{item.horas_em_fase || 0}h</td>
                      <td className="px-4 py-5 text-center text-slate-600">{item.limite_horas ? `${item.limite_horas}h` : t('admin_sla_sem_sla')}</td>
                      <td className="px-4 py-5 text-center">
                        <span className={`badge-pill ${estado.cor}`}>{estado.label}</span>
                      </td>
                      <td className="px-4 py-5">
                        <div className="flex items-center justify-center gap-3">
                          <button type="button" className="rounded-md px-2 py-1 font-medium text-softinsa-700 hover:bg-blue-50" onClick={() => setModal({ id: item.id_candidatura })}>
                            <Icon nome="eye" className="mr-1 inline h-4 w-4" /> {t('admin_sla_ver_processo')}
                          </button>
                          <button type="button" className="rounded-md px-2 py-1 font-medium text-softinsa-700 hover:bg-blue-50" disabled={notificar.isPending} onClick={() => notificar.mutate(item)}>
                            <Icon nome="bell" className="mr-1 inline h-4 w-4" /> {t('admin_sla_notificar')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!monitorizacao.isLoading && visiveis.length === 0 && (
                  <tr><td colSpan={9} className="px-5 py-12 text-center text-slate-500">{t('admin_sla_sem_processos')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Paginacao
            pagina={paginaAtual}
            totalPaginas={totalPaginas}
            total={itens.length}
            porPagina={porPagina}
            itensNaPagina={visiveis.length}
            onMudarPagina={setPagina}
          />
        </div>
      </section>

      {modal?.id && (
        <Modal titulo={t('admin_sla_detalhe_processo')} onFechar={() => setModal(null)} size="xl">
          <DetalheCandidatura id={modal.id} onFechar={() => setModal(null)} />
        </Modal>
      )}
    </div>
  );
}
