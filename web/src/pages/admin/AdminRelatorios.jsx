import { useState } from 'react';
import {
  Activity,
  Award,
  BadgeCheck,
  Bell,
  CalendarDays,
  Clock,
  FileSpreadsheet,
  FileText,
  FolderTree,
  Layers,
  Printer,
  TrendingUp,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extrairErro } from '../../lib/api';
import { formatarData } from '../../lib/formatar';
import { descarregarCsv, imprimirTabela } from '../../lib/exportar';

const estado = (v) => (v ? 'Ativo' : 'Inativo');
const simNao = (v) => (v ? 'Sim' : 'Não');
const perfisTxt = (p) => (Array.isArray(p) ? p.join(', ') : (p || ''));

const ESTADOS_CANDIDATURA = {
  OPEN: 'Em preparação', SUBMITTED: 'Submetida', IN_TALENT_REVIEW: 'Em análise (Talent)',
  IN_SERVICE_LINE_REVIEW: 'Em análise (SL)', SENT_BACK: 'Devolvida', APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada', CLOSED: 'Fechada',
};

/* Definição declarativa de cada relatório */
const RELATORIOS = [
  {
    chave: 'utilizadores', label: 'Utilizadores', icon: Users, endpoint: '/api/utilizadores',
    colunas: [
      { titulo: 'Nome', valor: (u) => u.nome },
      { titulo: 'Email', valor: (u) => u.email },
      { titulo: 'Perfis', valor: (u) => perfisTxt(u.perfis) },
      { titulo: 'Service Line', valor: (u) => u.nome_service_line || '—' },
      { titulo: 'Área', valor: (u) => u.nome_area || '—' },
      { titulo: 'Estado', valor: (u) => estado(u.ativo) },
    ],
  },
  {
    chave: 'learning-paths', label: 'Learning Paths', icon: FileText, endpoint: '/api/learning-paths',
    colunas: [
      { titulo: 'Nome', valor: (x) => x.nome },
      { titulo: 'Nº Service Lines', valor: (x) => x.total_service_lines || 0 },
      { titulo: 'Nº Badges', valor: (x) => x.total_badges || 0 },
      { titulo: 'Estado', valor: (x) => estado(x.ativo) },
      { titulo: 'Criado', valor: (x) => formatarData(x.created_at) },
    ],
  },
  {
    chave: 'service-lines', label: 'Service Lines', icon: Activity, endpoint: '/api/service-lines',
    colunas: [
      { titulo: 'Nome', valor: (x) => x.nome },
      { titulo: 'Learning Path', valor: (x) => x.nome_learning_path || '—' },
      { titulo: 'Nº Áreas', valor: (x) => x.total_areas || 0 },
      { titulo: 'Nº Badges', valor: (x) => x.total_badges || 0 },
      { titulo: 'Estado', valor: (x) => estado(x.ativo) },
    ],
  },
  {
    chave: 'areas', label: 'Áreas', icon: FolderTree, endpoint: '/api/areas',
    colunas: [
      { titulo: 'Nome', valor: (x) => x.nome },
      { titulo: 'Service Line', valor: (x) => x.nome_service_line || '—' },
      { titulo: 'Learning Path', valor: (x) => x.nome_learning_path || '—' },
      { titulo: 'Nº Níveis', valor: (x) => x.total_niveis || 0 },
      { titulo: 'Estado', valor: (x) => estado(x.ativo) },
    ],
  },
  {
    chave: 'niveis', label: 'Níveis', icon: Layers, endpoint: '/api/niveis',
    colunas: [
      { titulo: 'Código', valor: (x) => x.codigo_nivel },
      { titulo: 'Nome', valor: (x) => x.nome_nivel },
      { titulo: 'Área', valor: (x) => x.nome_area || '—' },
      { titulo: 'Nº Requisitos', valor: (x) => x.total_requisitos || 0 },
      { titulo: 'Estado', valor: (x) => estado(x.ativo) },
    ],
  },
  {
    chave: 'badges', label: 'Badges', icon: Award, endpoint: '/api/badges',
    colunas: [
      { titulo: 'Título', valor: (x) => x.titulo },
      { titulo: 'Nível', valor: (x) => x.nome_nivel || '—' },
      { titulo: 'Área', valor: (x) => x.nome_area || '—' },
      { titulo: 'Pontos', valor: (x) => x.pontos || 0 },
      { titulo: 'Estado', valor: (x) => estado(x.ativo) },
    ],
  },
  {
    chave: 'requisitos', label: 'Requisitos', icon: BadgeCheck, endpoint: '/api/requisitos',
    colunas: [
      { titulo: 'Código', valor: (x) => x.codigo_requisito },
      { titulo: 'Título', valor: (x) => x.titulo },
      { titulo: 'Nível', valor: (x) => x.nome_nivel || '—' },
      { titulo: 'Obrigatório', valor: (x) => simNao(x.obrigatorio) },
      { titulo: 'Estado', valor: (x) => estado(x.ativo) },
    ],
  },
  {
    chave: 'eventos', label: 'Eventos Especiais', icon: CalendarDays, endpoint: '/api/eventos',
    colunas: [
      { titulo: 'Título', valor: (x) => x.titulo },
      { titulo: 'Badge', valor: (x) => x.titulo_badge || '—' },
      { titulo: 'Nível', valor: (x) => x.nome_nivel || '—' },
      { titulo: 'Data Limite', valor: (x) => formatarData(x.data_limite) },
      { titulo: 'Estado', valor: (x) => estado(x.ativo) },
    ],
  },
  {
    chave: 'avisos', label: 'Informações/Avisos', icon: Bell, endpoint: '/api/avisos/todos', semPaginacao: true,
    colunas: [
      { titulo: 'Título', valor: (x) => x.titulo },
      { titulo: 'Tipo', valor: (x) => x.tipo },
      { titulo: 'Criador', valor: (x) => x.nome_criador || '—' },
      { titulo: 'Estado', valor: (x) => estado(x.ativo) },
      { titulo: 'Criado', valor: (x) => formatarData(x.created_at) },
    ],
  },
  {
    chave: 'sla', label: 'SLA', icon: Clock, endpoint: '/api/sla', semPaginacao: true,
    colunas: [
      { titulo: 'Fase', valor: (x) => x.fase },
      { titulo: 'Limite', valor: (x) => `${x.limite} ${x.unidade || ''}`.trim() },
      { titulo: 'Estado', valor: (x) => estado(x.ativo) },
    ],
  },
  {
    chave: 'candidaturas', label: 'Pedidos / Candidaturas', icon: TrendingUp, endpoint: '/api/candidaturas',
    colunas: [
      { titulo: 'Badge', valor: (x) => x.titulo_badge },
      { titulo: 'Consultor', valor: (x) => x.nome_consultor || '—' },
      { titulo: 'Service Line', valor: (x) => x.nome_service_line || '—' },
      { titulo: 'Estado', valor: (x) => ESTADOS_CANDIDATURA[x.estado_atual] || x.estado_atual },
      { titulo: 'Submissão', valor: (x) => formatarData(x.data_submissao || x.data_abertura) },
    ],
  },
];

async function obterTudo(rel) {
  if (rel.semPaginacao) {
    return (await api.get(rel.endpoint)).data.dados || [];
  }
  const base = { por_pagina: 100 };
  const primeira = (await api.get(rel.endpoint, { params: { ...base, pagina: 1 } })).data;
  const dados = [...(primeira.dados || [])];
  const total = primeira.total || dados.length;
  const porPag = primeira.por_pagina || 100;
  const nPaginas = Math.max(1, Math.ceil(total / porPag));
  for (let p = 2; p <= nPaginas; p += 1) {
    const r = (await api.get(rel.endpoint, { params: { ...base, pagina: p } })).data;
    dados.push(...(r.dados || []));
  }
  return dados;
}

function construirLinhas(rel, dados) {
  const headers = rel.colunas.map((c) => c.titulo);
  const linhas = dados.map((item) => rel.colunas.map((c) => c.valor(item)));
  return { headers, linhas };
}

export default function AdminRelatorios() {
  const [ocupado, setOcupado] = useState(null); // `${chave}:${formato}`

  async function exportar(rel, formato) {
    setOcupado(`${rel.chave}:${formato}`);
    try {
      const dados = await obterTudo(rel);
      const { headers, linhas } = construirLinhas(rel, dados);
      if (formato === 'csv') {
        descarregarCsv(`${rel.chave}.csv`, headers, linhas);
      } else {
        imprimirTabela(rel.label, headers, linhas);
      }
      toast.success(`${rel.label}: ${dados.length} registo(s) exportado(s).`);
    } catch (err) {
      toast.error(extrairErro(err, 'Não foi possível exportar.'));
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Relatórios e Exportações</h1>
        <p className="mt-1 text-sm text-slate-500">Exporte os dados de cada módulo em Excel (CSV) ou PDF.</p>
      </header>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {RELATORIOS.map((rel) => {
          const Icon = rel.icon;
          const csvBusy = ocupado === `${rel.chave}:csv`;
          const pdfBusy = ocupado === `${rel.chave}:pdf`;
          const algumBusy = csvBusy || pdfBusy;
          return (
            <section key={rel.chave} className="flex flex-col rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-softinsa-100 text-softinsa-700">
                  <Icon className="h-6 w-6" strokeWidth={1.8} />
                </div>
                <h2 className="text-base font-bold text-slate-900">{rel.label}</h2>
              </div>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  disabled={algumBusy}
                  onClick={() => exportar(rel, 'csv')}
                >
                  <FileSpreadsheet className="h-4 w-4" /> {csvBusy ? 'A exportar...' : 'Excel'}
                </button>
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  disabled={algumBusy}
                  onClick={() => exportar(rel, 'pdf')}
                >
                  <Printer className="h-4 w-4" /> {pdfBusy ? 'A preparar...' : 'PDF'}
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
