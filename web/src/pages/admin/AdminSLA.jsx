import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Save,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extrairErro } from '../../lib/api';
import { estadoCandidatura } from '../../lib/formatar';
import { DetalheCandidatura, Modal } from './AdminCandidaturas';

const CONFIG_INICIAL = {
  TALENT_REVIEW: { limite: 48, unidade: 'horas', ativo: true },
  SERVICE_LINE_REVIEW: { limite: 72, unidade: 'horas', ativo: true },
};

const FASES = [
  {
    fase: 'TALENT_REVIEW',
    titulo: 'SLA Talent Manager',
    descricao: 'Tempo máximo para validação inicial das evidências submetidas pelos consultores.',
  },
  {
    fase: 'SERVICE_LINE_REVIEW',
    titulo: 'SLA Service Line',
    descricao: 'Tempo máximo para validação final do badge após aprovação do Talent Manager.',
  },
];

const ICONES = {
  bell: Bell,
  download: Download,
  eye: Eye,
  file: FileText,
  left: ChevronLeft,
  right: ChevronRight,
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

function estadoSla(item) {
  if (!item.limite_horas) return { label: 'Sem SLA', cor: 'bg-slate-100 text-slate-600' };
  if (item.estado_sla === 'ULTRAPASSADO') return { label: 'Ultrapassado', cor: 'bg-rose-100 text-rose-700' };
  if (item.estado_sla === 'PROXIMO_LIMITE') return { label: 'Próximo limite', cor: 'bg-orange-100 text-orange-700' };
  return { label: 'Dentro do prazo', cor: 'bg-emerald-100 text-emerald-700' };
}

function estadoProcesso(estado) {
  return estadoCandidatura(estado).label;
}

function csvLinhas(items) {
  const linhas = [
    ['Consultor', 'Badge', 'Area', 'Service Line', 'Estado Processo', 'Tempo Decorrido', 'SLA Definido', 'Estado SLA'],
    ...items.map((item) => [
      item.nome_consultor,
      item.titulo_badge,
      item.nome_area,
      item.nome_service_line,
      estadoProcesso(item.estado_atual),
      `${item.horas_em_fase || 0}h`,
      item.limite_horas ? `${item.limite_horas}h` : 'Sem SLA',
      estadoSla(item).label,
    ]),
  ];
  return linhas.map((linha) => linha.map((valor) => `"${String(valor ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
}

function descarregarCsv(nomeFicheiro, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeFicheiro;
  a.click();
  URL.revokeObjectURL(url);
}

function escaparHtml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function imprimirTabela(items) {
  const linhas = items.map((item) => `
    <tr>
      <td>${escaparHtml(item.nome_consultor)}</td>
      <td>${escaparHtml(item.titulo_badge)}</td>
      <td>${escaparHtml(item.nome_area)}</td>
      <td>${escaparHtml(item.nome_service_line)}</td>
      <td>${escaparHtml(estadoProcesso(item.estado_atual))}</td>
      <td>${escaparHtml(`${item.horas_em_fase || 0}h`)}</td>
      <td>${escaparHtml(item.limite_horas ? `${item.limite_horas}h` : 'Sem SLA')}</td>
      <td>${escaparHtml(estadoSla(item).label)}</td>
    </tr>
  `).join('');

  const janela = window.open('', '_blank');
  if (!janela) return;
  janela.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Gestão de SLA</title>
        <style>
          body { font-family: Arial, sans-serif; color: #1f2937; padding: 24px; }
          h1 { font-size: 22px; margin-bottom: 18px; }
          table { border-collapse: collapse; width: 100%; font-size: 12px; }
          th, td { border: 1px solid #d7dde5; padding: 8px; text-align: left; }
          th { background: #f1f5f9; }
        </style>
      </head>
      <body>
        <h1>Gestão de SLA</h1>
        <table>
          <thead>
            <tr>
              <th>Consultor</th><th>Badge</th><th>Área</th><th>Service Line</th>
              <th>Estado Processo</th><th>Tempo Decorrido</th><th>SLA Definido</th><th>Estado SLA</th>
            </tr>
          </thead>
          <tbody>${linhas || '<tr><td colspan="8">Sem resultados</td></tr>'}</tbody>
        </table>
      </body>
    </html>
  `);
  janela.document.close();
  janela.focus();
  janela.print();
}

function CardConfig({ meta, form, onChange }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-bold text-slate-800">{meta.titulo}</h3>
      <p className="mt-2 text-sm text-slate-500">{meta.descricao}</p>

      <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Tempo máximo</label>
          <input
            type="number"
            min="1"
            className="input"
            value={form.limite}
            onChange={(e) => onChange(meta.fase, 'limite', e.target.value)}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Unidade</label>
          <select className="input" value={form.unidade} onChange={(e) => onChange(meta.fase, 'unidade', e.target.value)}>
            <option value="horas">Horas</option>
            <option value="dias">Dias</option>
          </select>
        </div>
      </div>

      <div className="mt-6 flex gap-5 text-base text-slate-700">
        <label className="flex items-center gap-2">
          <input type="radio" className="h-4 w-4 text-softinsa-600" checked={form.ativo} onChange={() => onChange(meta.fase, 'ativo', true)} />
          Ativo
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" className="h-4 w-4 text-softinsa-600" checked={!form.ativo} onChange={() => onChange(meta.fase, 'ativo', false)} />
          Inativo
        </label>
      </div>
    </section>
  );
}

export default function AdminSLA() {
  const qc = useQueryClient();
  const [form, setForm] = useState(CONFIG_INICIAL);
  const [pagina, setPagina] = useState(1);
  const [modal, setModal] = useState(null);
  const porPagina = 5;

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
      toast.success('SLA atualizado.');
      qc.invalidateQueries({ queryKey: ['admin', 'sla'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => toast.error(extrairErro(err, 'Não foi possível guardar os SLA.')),
  });

  const notificar = useMutation({
    mutationFn: (item) => api.post(`/api/sla/${item.id_candidatura}/notificar`, {
      mensagem: `O processo #${item.id_candidatura} está com estado SLA: ${estadoSla(item).label}.`,
    }),
    onSuccess: () => {
      toast.success('Equipa notificada.');
      qc.invalidateQueries({ queryKey: ['admin', 'sla', 'monitorizacao'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err) => toast.error(extrairErro(err, 'Não foi possível notificar a equipa.')),
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
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Gestão de SLA</h1>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-secondary" onClick={() => descarregarCsv('gestao-sla.csv', csvLinhas(itens))}>
            <Icon nome="download" className="h-4 w-4" /> Exportar Excel
          </button>
          <button type="button" className="btn-secondary" onClick={() => imprimirTabela(itens)}>
            <Icon nome="file" className="h-4 w-4" /> Exportar PDF
          </button>
          <button type="button" className="btn-primary" disabled={guardar.isPending} onClick={() => guardar.mutate()}>
            <Icon nome="save" className="h-4 w-4" /> Guardar Alterações
          </button>
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-xl font-bold text-slate-800">Configuração de SLA</h2>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {FASES.map((meta) => (
            <CardConfig key={meta.fase} meta={meta} form={form[meta.fase]} onChange={atualizar} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold text-slate-800">Monitorização de SLA</h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1360px] w-full text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-4 text-left">Consultor</th>
                  <th className="px-4 py-4 text-left">Badge</th>
                  <th className="px-4 py-4 text-left">Área</th>
                  <th className="px-4 py-4 text-left">Service Line</th>
                  <th className="px-4 py-4 text-center">Estado do Processo</th>
                  <th className="px-4 py-4 text-center">Tempo Decorrido</th>
                  <th className="px-4 py-4 text-center">SLA Definido</th>
                  <th className="px-4 py-4 text-center">Estado SLA</th>
                  <th className="px-4 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {monitorizacao.isLoading ? (
                  <tr><td colSpan={9} className="px-5 py-12 text-center text-slate-500">A carregar monitorização...</td></tr>
                ) : visiveis.map((item) => {
                  const estado = estadoSla(item);
                  return (
                    <tr key={item.id_candidatura} className="text-slate-700">
                      <td className="px-4 py-5 font-semibold text-slate-800">{item.nome_consultor}</td>
                      <td className="px-4 py-5 text-slate-600">{item.titulo_badge}</td>
                      <td className="px-4 py-5 text-slate-500">{item.nome_area}</td>
                      <td className="px-4 py-5 text-slate-500">{item.nome_service_line}</td>
                      <td className="px-4 py-5 text-center text-slate-600">{estadoProcesso(item.estado_atual)}</td>
                      <td className="px-4 py-5 text-center font-semibold text-slate-800">{item.horas_em_fase || 0}h</td>
                      <td className="px-4 py-5 text-center text-slate-600">{item.limite_horas ? `${item.limite_horas}h` : 'Sem SLA'}</td>
                      <td className="px-4 py-5 text-center">
                        <span className={`badge-pill ${estado.cor}`}>{estado.label}</span>
                      </td>
                      <td className="px-4 py-5">
                        <div className="flex items-center justify-center gap-3">
                          <button type="button" className="rounded-md px-2 py-1 font-medium text-softinsa-700 hover:bg-blue-50" onClick={() => setModal({ id: item.id_candidatura })}>
                            <Icon nome="eye" className="mr-1 inline h-4 w-4" /> Ver Processo
                          </button>
                          <button type="button" className="rounded-md px-2 py-1 font-medium text-softinsa-700 hover:bg-blue-50" disabled={notificar.isPending} onClick={() => notificar.mutate(item)}>
                            <Icon nome="bell" className="mr-1 inline h-4 w-4" /> Notificar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!monitorizacao.isLoading && visiveis.length === 0 && (
                  <tr><td colSpan={9} className="px-5 py-12 text-center text-slate-500">Sem processos em monitorização.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <footer className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 px-6 py-4 text-sm text-slate-500 md:flex-row">
            <span>A mostrar {visiveis.length} de {itens.length} resultados</span>
            <div className="flex items-center gap-3">
              <button className="btn-secondary h-10 w-10 px-0 disabled:opacity-40" disabled={paginaAtual <= 1} onClick={() => setPagina((p) => p - 1)} aria-label="Página anterior">
                <Icon nome="left" className="h-5 w-5" />
              </button>
              <span className="font-semibold text-slate-700">Página {paginaAtual} de {totalPaginas}</span>
              <button className="btn-secondary h-10 w-10 px-0 disabled:opacity-40" disabled={paginaAtual >= totalPaginas} onClick={() => setPagina((p) => p + 1)} aria-label="Página seguinte">
                <Icon nome="right" className="h-5 w-5" />
              </button>
            </div>
          </footer>
        </div>
      </section>

      {modal?.id && (
        <Modal titulo="Detalhe do Processo" onFechar={() => setModal(null)} size="xl">
          <DetalheCandidatura id={modal.id} onFechar={() => setModal(null)} />
        </Modal>
      )}
    </div>
  );
}
