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
import { useLanguage } from '../../context/LanguageContext';

const perfisTxt = (p) => (Array.isArray(p) ? p.join(', ') : (p || ''));

function construirRelatorios(t) {
  const estado = (v) => (v ? t('admin_dash_notice_active') : t('admin_dash_notice_inactive'));
  const simNao = (v) => (v ? t('admin_rel_sim') : t('admin_rel_nao'));
  const ESTADOS_CANDIDATURA = {
    OPEN: t('admin_dash_state_open'), SUBMITTED: t('admin_rel_est_submitted'), IN_TALENT_REVIEW: t('admin_rel_est_talent_review'),
    IN_SERVICE_LINE_REVIEW: t('admin_rel_est_sl_review'), SENT_BACK: t('admin_dash_state_sent_back'), APPROVED: t('admin_dash_state_approved'),
    REJECTED: t('admin_dash_state_rejected'), CLOSED: t('admin_rel_est_closed'),
  };

  return [
    {
      chave: 'utilizadores', label: t('admin_short_utilizadores'), icon: Users, endpoint: '/api/utilizadores',
      colunas: [
        { titulo: t('admin_rel_col_nome'), valor: (u) => u.nome },
        { titulo: t('admin_rel_col_email'), valor: (u) => u.email },
        { titulo: t('admin_rel_col_perfis'), valor: (u) => perfisTxt(u.perfis) },
        { titulo: t('admin_dash_col_service_line'), valor: (u) => u.nome_service_line || '—' },
        { titulo: t('admin_rel_col_area'), valor: (u) => u.nome_area || '—' },
        { titulo: t('admin_dash_col_state'), valor: (u) => estado(u.ativo) },
      ],
    },
    {
      chave: 'learning-paths', label: t('admin_short_learning_paths'), icon: FileText, endpoint: '/api/learning-paths',
      colunas: [
        { titulo: t('admin_rel_col_nome'), valor: (x) => x.nome },
        { titulo: t('admin_rel_col_nr_sl'), valor: (x) => x.total_service_lines || 0 },
        { titulo: t('admin_rel_col_nr_badges'), valor: (x) => x.total_badges || 0 },
        { titulo: t('admin_dash_col_state'), valor: (x) => estado(x.ativo) },
        { titulo: t('admin_rel_col_criado'), valor: (x) => formatarData(x.created_at) },
      ],
    },
    {
      chave: 'service-lines', label: t('admin_short_service_lines'), icon: Activity, endpoint: '/api/service-lines',
      colunas: [
        { titulo: t('admin_rel_col_nome'), valor: (x) => x.nome },
        { titulo: t('admin_rel_col_lp'), valor: (x) => x.nome_learning_path || '—' },
        { titulo: t('admin_rel_col_nr_areas'), valor: (x) => x.total_areas || 0 },
        { titulo: t('admin_rel_col_nr_badges'), valor: (x) => x.total_badges || 0 },
        { titulo: t('admin_dash_col_state'), valor: (x) => estado(x.ativo) },
      ],
    },
    {
      chave: 'areas', label: t('admin_short_areas'), icon: FolderTree, endpoint: '/api/areas',
      colunas: [
        { titulo: t('admin_rel_col_nome'), valor: (x) => x.nome },
        { titulo: t('admin_dash_col_service_line'), valor: (x) => x.nome_service_line || '—' },
        { titulo: t('admin_rel_col_lp'), valor: (x) => x.nome_learning_path || '—' },
        { titulo: t('admin_rel_col_nr_niveis'), valor: (x) => x.total_niveis || 0 },
        { titulo: t('admin_dash_col_state'), valor: (x) => estado(x.ativo) },
      ],
    },
    {
      chave: 'niveis', label: t('admin_short_niveis'), icon: Layers, endpoint: '/api/niveis',
      colunas: [
        { titulo: t('admin_rel_col_codigo'), valor: (x) => x.codigo_nivel },
        { titulo: t('admin_rel_col_nome'), valor: (x) => x.nome_nivel },
        { titulo: t('admin_rel_col_area'), valor: (x) => x.nome_area || '—' },
        { titulo: t('admin_rel_col_nr_req'), valor: (x) => x.total_requisitos || 0 },
        { titulo: t('admin_dash_col_state'), valor: (x) => estado(x.ativo) },
      ],
    },
    {
      chave: 'badges', label: t('admin_short_badges'), icon: Award, endpoint: '/api/badges',
      colunas: [
        { titulo: t('admin_rel_col_titulo'), valor: (x) => x.titulo },
        { titulo: t('admin_dash_level'), valor: (x) => x.nome_nivel || '—' },
        { titulo: t('admin_rel_col_area'), valor: (x) => x.nome_area || '—' },
        { titulo: t('admin_short_pontos'), valor: (x) => x.pontos || 0 },
        { titulo: t('admin_dash_col_state'), valor: (x) => estado(x.ativo) },
      ],
    },
    {
      chave: 'requisitos', label: t('admin_short_requisitos'), icon: BadgeCheck, endpoint: '/api/requisitos',
      colunas: [
        { titulo: t('admin_rel_col_codigo'), valor: (x) => x.codigo_requisito },
        { titulo: t('admin_rel_col_titulo'), valor: (x) => x.titulo },
        { titulo: t('admin_dash_level'), valor: (x) => x.nome_nivel || '—' },
        { titulo: t('admin_rel_col_obrigatorio'), valor: (x) => simNao(x.obrigatorio) },
        { titulo: t('admin_dash_col_state'), valor: (x) => estado(x.ativo) },
      ],
    },
    {
      chave: 'eventos', label: t('admin_rel_lbl_eventos'), icon: CalendarDays, endpoint: '/api/eventos',
      colunas: [
        { titulo: t('admin_rel_col_titulo'), valor: (x) => x.titulo },
        { titulo: t('admin_dash_col_badge'), valor: (x) => x.titulo_badge || '—' },
        { titulo: t('admin_dash_level'), valor: (x) => x.nome_nivel || '—' },
        { titulo: t('admin_rel_col_data_limite'), valor: (x) => formatarData(x.data_limite) },
        { titulo: t('admin_dash_col_state'), valor: (x) => estado(x.ativo) },
      ],
    },
    {
      chave: 'avisos', label: t('admin_menu_avisos'), icon: Bell, endpoint: '/api/avisos/todos', semPaginacao: true,
      colunas: [
        { titulo: t('admin_rel_col_titulo'), valor: (x) => x.titulo },
        { titulo: t('admin_rel_col_tipo'), valor: (x) => x.tipo },
        { titulo: t('admin_rel_col_criador'), valor: (x) => x.nome_criador || '—' },
        { titulo: t('admin_dash_col_state'), valor: (x) => estado(x.ativo) },
        { titulo: t('admin_rel_col_criado'), valor: (x) => formatarData(x.created_at) },
      ],
    },
    {
      chave: 'sla', label: t('admin_short_sla'), icon: Clock, endpoint: '/api/sla', semPaginacao: true,
      colunas: [
        { titulo: t('admin_rel_col_fase'), valor: (x) => x.fase },
        { titulo: t('admin_rel_col_limite'), valor: (x) => `${x.limite} ${x.unidade || ''}`.trim() },
        { titulo: t('admin_dash_col_state'), valor: (x) => estado(x.ativo) },
      ],
    },
    {
      chave: 'candidaturas', label: t('admin_rel_lbl_candidaturas'), icon: TrendingUp, endpoint: '/api/candidaturas',
      colunas: [
        { titulo: t('admin_dash_col_badge'), valor: (x) => x.titulo_badge },
        { titulo: t('admin_dash_col_consultant'), valor: (x) => x.nome_consultor || '—' },
        { titulo: t('admin_dash_col_service_line'), valor: (x) => x.nome_service_line || '—' },
        { titulo: t('admin_dash_col_state'), valor: (x) => ESTADOS_CANDIDATURA[x.estado_atual] || x.estado_atual },
        { titulo: t('admin_rel_col_submissao'), valor: (x) => formatarData(x.data_submissao || x.data_abertura) },
      ],
    },
  ];
}

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
  const { t } = useLanguage();
  const [ocupado, setOcupado] = useState(null); // `${chave}:${formato}`
  const RELATORIOS = construirRelatorios(t);

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
      toast.success(`${rel.label}: ${dados.length} ${t('admin_rel_registos_exportados')}`);
    } catch (err) {
      toast.error(extrairErro(err, t('admin_rel_erro_exportar')));
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t('admin_menu_relatorios')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('admin_rel_sub')}</p>
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
                  <FileSpreadsheet className="h-4 w-4" /> {csvBusy ? t('admin_rel_exportando') : t('admin_rel_excel')}
                </button>
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  disabled={algumBusy}
                  onClick={() => exportar(rel, 'pdf')}
                >
                  <Printer className="h-4 w-4" /> {pdfBusy ? t('admin_rel_preparando') : t('admin_rel_pdf')}
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
