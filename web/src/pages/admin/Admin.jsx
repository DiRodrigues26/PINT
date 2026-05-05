import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { AppSidebar, AppTopbar, ShellIcon } from '../../components/AppShell';
import Carregando from '../../components/Carregando';
import { useAuth } from '../../context/AuthContext';
import { estadoCandidatura, formatarData } from '../../lib/formatar';
import AdminAreas from './AdminAreas';
import AdminBadges from './AdminBadges';
import AdminCandidaturas from './AdminCandidaturas';
import AdminEventosEspeciais from './AdminEventosEspeciais';
import AdminLearningPaths from './AdminLearningPaths';
import AdminNiveis from './AdminNiveis';
import AdminRequisitos from './AdminRequisitos';
import AdminServiceLines from './AdminServiceLines';
import AdminSLA from './AdminSLA';
import AdminUtilizadores from './AdminUtilizadores';

const MENU = [
  { chave: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { chave: 'candidaturas', label: 'Pedidos de Badges', icon: 'doc' },
  { chave: 'utilizadores', label: 'Gestão de Utilizadores', icon: 'users' },
  { chave: 'learning-paths', label: 'Gestão de Learning Paths', icon: 'doc' },
  { chave: 'service-lines', label: 'Gestão de Service Lines', icon: 'pulse' },
  { chave: 'areas', label: 'Gestão de Áreas', icon: 'doc' },
  { chave: 'niveis', label: 'Gestão de Níveis', icon: 'trend' },
  { chave: 'badges', label: 'Gestão de Badges', icon: 'badge' },
  { chave: 'requisitos', label: 'Gestão de Requisitos', icon: 'doc' },
  { chave: 'eventos', label: 'Gestão de Eventos Especiais', icon: 'calendar' },
  { chave: 'pontos', label: 'Gestão de Pontos', icon: 'trophy' },
  { chave: 'sla', label: 'Gestão de SLA', icon: 'clock' },
  { chave: 'notificacoes', label: 'Notificações', icon: 'bell' },
  { chave: 'relatorios', label: 'Relatórios e Exportações', icon: 'trend' },
  { chave: 'avisos', label: 'Informações/Avisos', icon: 'info' },
  { chave: 'rgpd', label: 'Configuração RGPD', icon: 'shield' },
  { chave: 'perfil', label: 'Perfil', icon: 'users' },
];

const CORES_NIVEL = ['#3f68a2', '#5d84c0', '#7fa0d5', '#9bb6eb', '#c5d7ff'];

function numero(valor) {
  return new Intl.NumberFormat('pt-PT').format(Number(valor) || 0);
}

function percentagem(parte, total) {
  if (!total) return 0;
  return Math.round((Number(parte) / Number(total)) * 100);
}

function saudacao() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 20) return 'Boa tarde';
  return 'Boa noite';
}

function mesCurto(valor) {
  if (!valor) return '';
  const data = new Date(`${valor}-01T00:00:00`);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleDateString('pt-PT', { month: 'short' }).replace('.', '');
}

function quebrarLabel(texto, max = 16) {
  const palavras = String(texto || '').split(/\s+/).filter(Boolean);
  const linhas = [];
  let atual = '';

  for (const palavra of palavras) {
    const candidato = atual ? `${atual} ${palavra}` : palavra;
    if (candidato.length <= max || !atual) {
      atual = candidato;
    } else {
      linhas.push(atual);
      atual = palavra;
    }
  }

  if (atual) linhas.push(atual);
  return linhas.slice(0, 3);
}

function formatarSlaRestante(candidatura, slas) {
  if (!candidatura?.data_submissao) return '-';
  const estado = candidatura.estado_atual;
  const fase = ['SUBMITTED', 'IN_TALENT_REVIEW'].includes(estado)
    ? 'TALENT_REVIEW'
    : estado === 'IN_SERVICE_LINE_REVIEW'
      ? 'SERVICE_LINE_REVIEW'
      : null;

  if (!fase) return '-';
  const config = slas.find((s) => s.fase === fase && s.ativo !== 0);
  if (!config) return '-';

  const limiteHoras = Number(config.limite || 0) * (config.unidade === 'dias' ? 24 : 1);
  const decorridas = (Date.now() - new Date(candidatura.data_submissao).getTime()) / 36e5;
  const restantes = Math.ceil((limiteHoras - decorridas) / 24);

  if (restantes < 0) return 'Ultrapassado';
  if (restantes === 0) return 'Hoje';
  return `${restantes} dias`;
}

function StatCard({ titulo, valor, variacao, icon, children }) {
  return (
    <section className="min-h-[176px] rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="text-sm font-semibold text-slate-500">{titulo}</div>
        {icon && <ShellIcon nome={icon} className="h-5 w-5 text-softinsa-600" />}
      </div>
      {children || (
        <div className="mt-6 flex items-end justify-between gap-3">
          <div className="text-4xl font-bold tracking-tight text-slate-900">{valor}</div>
          {variacao && <div className="text-sm font-semibold text-emerald-600">{variacao}</div>}
        </div>
      )}
    </section>
  );
}

function Painel({ titulo, children, className = '' }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
      <h2 className="text-base font-bold text-slate-800">{titulo}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function BarChart({ dados }) {
  const [hovered, setHovered] = useState(null);
  const items = (dados || []).slice(0, 6);
  const max = Math.max(...items.map((i) => Number(i.total) || 0), 1);
  const largura = 900;
  const altura = 260;
  const margem = { top: 34, right: 24, bottom: 72, left: 46 };
  const plotW = largura - margem.left - margem.right;
  const plotH = altura - margem.top - margem.bottom;
  const barW = items.length ? Math.max(plotW / items.length - 32, 42) : 0;

  return (
    <div>
      <svg viewBox={`0 0 ${largura} ${altura}`} className="h-[300px] w-full">
      {[0, 0.25, 0.5, 0.75, 1].map((p) => {
        const y = margem.top + plotH - plotH * p;
        return (
          <g key={p}>
            <line x1={margem.left} y1={y} x2={largura - margem.right} y2={y} stroke="#e7ebf0" strokeDasharray="4 4" />
            <text x={margem.left - 10} y={y + 4} textAnchor="end" fontSize="12" fill="#64748b">{Math.round(max * p)}</text>
          </g>
        );
      })}
      <line x1={margem.left} y1={margem.top + plotH} x2={largura - margem.right} y2={margem.top + plotH} stroke="#9ca3af" />
      {items.map((item, idx) => {
        const valor = Number(item.total) || 0;
        const ativo = hovered === idx;
        const x = margem.left + idx * (plotW / items.length) + 16;
        const h = (valor / max) * (plotH - 8);
        const y = margem.top + plotH - h;
        const centro = x + barW / 2;
        return (
          <g
            key={item.id_area || item.id_learning_path || item.nome || idx}
            onMouseEnter={() => setHovered(idx)}
            onMouseLeave={() => setHovered(null)}
            className="cursor-default"
          >
            <rect x={x} y={y} width={barW} height={h} rx="8" fill={ativo ? '#315f9f' : '#3f68a2'} />
            <text
              x={centro}
              y={Math.max(y - 10, 18)}
              textAnchor="middle"
              fontSize="14"
              fontWeight="700"
              fill="#315f9f"
              opacity={ativo ? 1 : 0}
            >
              {numero(valor)} badges
            </text>
            <text x={centro} y={altura - 38} textAnchor="middle" fontSize="12" fill="#64748b">
              {quebrarLabel(item.nome || 'Sem nome', 18).map((linha, linhaIdx) => (
                <tspan key={linha} x={centro} dy={linhaIdx === 0 ? 0 : 15}>
                  {linha}
                </tspan>
              ))}
            </text>
          </g>
        );
      })}
      {items.length === 0 && <text x="50%" y="50%" textAnchor="middle" fill="#94a3b8">Sem dados</text>}
      </svg>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.id_area || item.id_learning_path || item.nome} className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2">
            <span className="truncate">{item.nome || 'Sem nome'}</span>
            <span className="font-bold text-softinsa-700">{numero(item.total)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PieChart({ dados }) {
  const [hovered, setHovered] = useState(null);
  const items = (dados || []).filter((i) => Number(i.total) > 0);
  const total = items.reduce((s, i) => s + Number(i.total || 0), 0);
  let acumulado = 0;
  const r = 84;
  const cx = 128;
  const cy = 108;

  function ponto(angulo) {
    const rad = (angulo - 90) * Math.PI / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  }

  return (
    <div className="grid min-h-[300px] gap-6 lg:grid-cols-[minmax(280px,1fr)_240px]">
      <div className="flex items-center justify-center">
      <svg viewBox="0 0 300 240" className="h-[280px] w-full max-w-md">
        {total === 0 ? (
          <text x="50%" y="50%" textAnchor="middle" fill="#94a3b8">Sem dados</text>
        ) : items.map((item, idx) => {
          const valor = Number(item.total) || 0;
          const ativo = hovered === idx;
          const inicio = (acumulado / total) * 360;
          acumulado += valor;
          const fim = (acumulado / total) * 360;
          const [x1, y1] = ponto(inicio);
          const [x2, y2] = ponto(fim);
          const grande = fim - inicio > 180 ? 1 : 0;
          const cor = CORES_NIVEL[idx % CORES_NIVEL.length];
          return (
            <path
              key={`${item.codigo_nivel}-${idx}`}
              d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${grande} 1 ${x2} ${y2} Z`}
              fill={cor}
              stroke="#fff"
              strokeWidth={ativo ? '4' : '2'}
              opacity={hovered === null || ativo ? 1 : 0.45}
              onMouseEnter={() => setHovered(idx)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-default"
            />
          );
        })}
        {hovered !== null && items[hovered] && (
          <g>
            <rect x="82" y="92" width="92" height="34" rx="17" fill="#ffffff" stroke="#dbe3ef" />
            <text x="128" y="114" textAnchor="middle" fontSize="13" fontWeight="700" fill="#1e293b">
              {items[hovered].codigo_nivel}: {numero(items[hovered].total)}
            </text>
          </g>
        )}
      </svg>
      </div>
      <div className="flex flex-col justify-center gap-2">
        {(dados || []).slice(0, 5).map((item, idx) => {
          const ativo = hovered === idx;
          return (
            <button
              key={item.codigo_nivel || idx}
              type="button"
              onMouseEnter={() => setHovered(idx)}
              onMouseLeave={() => setHovered(null)}
              className={`flex items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${ativo ? 'bg-[#eaf3ff]' : 'bg-slate-50 hover:bg-slate-100'}`}
            >
              <span className="flex items-center gap-2 text-slate-600">
                <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: CORES_NIVEL[idx % CORES_NIVEL.length] }} />
                Nível {item.codigo_nivel}
              </span>
              <span className="font-bold text-softinsa-700">{numero(item.total)} badges</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LineChart({ dados }) {
  const items = (dados || []).slice(-6);
  const max = Math.max(...items.map((i) => Number(i.total) || 0), 1);
  const largura = 980;
  const altura = 230;
  const margem = { top: 12, right: 20, bottom: 32, left: 42 };
  const plotW = largura - margem.left - margem.right;
  const plotH = altura - margem.top - margem.bottom;
  const pontos = items.map((item, idx) => {
    const x = margem.left + (items.length === 1 ? 0 : idx * (plotW / (items.length - 1)));
    const y = margem.top + plotH - ((Number(item.total) || 0) / max) * (plotH - 8);
    return { x, y, item };
  });

  return (
    <svg viewBox={`0 0 ${largura} ${altura}`} className="h-64 w-full">
      {[0, 0.25, 0.5, 0.75, 1].map((p) => {
        const y = margem.top + plotH - plotH * p;
        return (
          <g key={p}>
            <line x1={margem.left} y1={y} x2={largura - margem.right} y2={y} stroke="#e7ebf0" strokeDasharray="4 4" />
            <text x={margem.left - 10} y={y + 4} textAnchor="end" fontSize="12" fill="#64748b">{Math.round(max * p)}</text>
          </g>
        );
      })}
      <line x1={margem.left} y1={margem.top + plotH} x2={largura - margem.right} y2={margem.top + plotH} stroke="#9ca3af" />
      {pontos.length > 0 && (
        <polyline points={pontos.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#315f9f" strokeWidth="2.5" />
      )}
      {pontos.map((p) => (
        <g key={p.item.mes}>
          <circle cx={p.x} cy={p.y} r="4" fill="#fff" stroke="#315f9f" strokeWidth="2" />
          <text x={p.x} y={altura - 10} textAnchor="middle" fontSize="12" fill="#64748b">{mesCurto(p.item.mes)}</text>
        </g>
      ))}
      {pontos.length === 0 && <text x="50%" y="50%" textAnchor="middle" fill="#94a3b8">Sem dados</text>}
    </svg>
  );
}

export default function Admin() {
  const { utilizador, logout } = useAuth();
  const navigate = useNavigate();
  const [vistaAtiva, setVistaAtiva] = useState('dashboard');
  const [mostrarLogout, setMostrarLogout] = useState(false);

  function confirmarLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const estatisticas = useQuery({
    queryKey: ['admin-dashboard', 'estatisticas'],
    queryFn: async () => (await api.get('/api/estatisticas/gestor')).data,
    refetchInterval: 15000,
  });

  const ranking = useQuery({
    queryKey: ['admin-dashboard', 'ranking'],
    queryFn: async () => (await api.get('/api/estatisticas/ranking', { params: { limite: 5 } })).data,
  });

  const candidaturas = useQuery({
    queryKey: ['admin-dashboard', 'candidaturas-recentes'],
    queryFn: async () => (await api.get('/api/candidaturas', { params: { por_pagina: 5 } })).data,
    refetchInterval: 15000,
  });

  const slas = useQuery({
    queryKey: ['admin-dashboard', 'sla'],
    queryFn: async () => (await api.get('/api/sla')).data,
  });

  const foraSla = useQuery({
    queryKey: ['admin-dashboard', 'sla-fora-prazo'],
    queryFn: async () => (await api.get('/api/sla/fora-prazo')).data,
    refetchInterval: 15000,
  });

  const avisos = useQuery({
    queryKey: ['admin-dashboard', 'avisos'],
    queryFn: async () => (await api.get('/api/avisos/todos')).data,
  });

  const carregando = estatisticas.isLoading || ranking.isLoading || candidaturas.isLoading || slas.isLoading || foraSla.isLoading || avisos.isLoading;
  const dados = estatisticas.data || {};
  const listaSlas = slas.data?.dados || [];
  const recentes = candidaturas.data?.dados || [];
  const listaAvisos = avisos.data?.dados || [];

  const kpis = useMemo(() => {
    const totalEstados = (dados.estados_candidatura || []).reduce((s, e) => s + Number(e.total || 0), 0);
    return {
      percentagemAtribuidos: percentagem(dados.total_badges_atribuidos, dados.total_badges_ativos),
      totalEstados,
    };
  }, [dados.estados_candidatura, dados.total_badges_atribuidos, dados.total_badges_ativos]);

  const estadosResumo = useMemo(() => {
    const mapa = new Map((dados.estados_candidatura || []).map((e) => [e.estado_atual, Number(e.total) || 0]));
    return [
      { chave: 'OPEN', total: mapa.get('OPEN') || 0, label: 'Open', cor: 'text-slate-600' },
      { chave: 'SUBMITTED', total: mapa.get('SUBMITTED') || 0, label: 'Submitted', cor: 'text-blue-600' },
      {
        chave: 'EM_VALIDACAO',
        total: (mapa.get('IN_TALENT_REVIEW') || 0) + (mapa.get('IN_SERVICE_LINE_REVIEW') || 0),
        label: 'Em Validação',
        cor: 'text-amber-600',
      },
      {
        chave: 'FECHADO',
        total: (mapa.get('APPROVED') || 0) + (mapa.get('REJECTED') || 0) + (mapa.get('CLOSED') || 0),
        label: 'Fechado',
        cor: 'text-emerald-600',
      },
    ];
  }, [dados.estados_candidatura]);

  const slaTalent = listaSlas.find((s) => s.fase === 'TALENT_REVIEW');
  const slaService = listaSlas.find((s) => s.fase === 'SERVICE_LINE_REVIEW');
  const vista = MENU.find((item) => item.chave === vistaAtiva);
  const subtitulo = vistaAtiva === 'dashboard'
    ? 'Dashboard - Administrador'
    : `${vista?.label || 'Administração'} - Administrador`;

  return (
    <div className="min-h-screen bg-[#f3f6fa] text-slate-900">
      <AppSidebar
        menu={MENU}
        ativo={vistaAtiva}
        onSelect={setVistaAtiva}
        utilizador={utilizador}
        onLogout={() => setMostrarLogout(true)}
      />
      <div className="lg:pl-[260px]">
        <AppTopbar
          titulo={`${saudacao()}, Admin!`}
          subtitulo={subtitulo}
          utilizador={utilizador}
          onLogout={() => setMostrarLogout(true)}
        />
        <main className={`mx-auto pb-28 pt-8 lg:pb-8 ${vistaAtiva === 'utilizadores' ? 'max-w-[1720px] px-5 lg:px-8 xl:px-10' : ['candidaturas', 'learning-paths', 'service-lines', 'areas', 'niveis', 'badges', 'eventos', 'requisitos', 'sla'].includes(vistaAtiva) ? 'max-w-[1560px] px-5 lg:px-10 xl:px-16' : 'max-w-[1760px] px-5 lg:px-8 xl:px-10 2xl:px-12'}`}>
          {vistaAtiva === 'utilizadores' ? (
            <AdminUtilizadores />
          ) : vistaAtiva === 'candidaturas' ? (
            <AdminCandidaturas />
          ) : vistaAtiva === 'learning-paths' ? (
            <AdminLearningPaths />
          ) : vistaAtiva === 'service-lines' ? (
            <AdminServiceLines />
          ) : vistaAtiva === 'areas' ? (
            <AdminAreas />
          ) : vistaAtiva === 'niveis' ? (
            <AdminNiveis />
          ) : vistaAtiva === 'badges' ? (
            <AdminBadges />
          ) : vistaAtiva === 'eventos' ? (
            <AdminEventosEspeciais />
          ) : vistaAtiva === 'requisitos' ? (
            <AdminRequisitos />
          ) : vistaAtiva === 'sla' ? (
            <AdminSLA />
          ) : carregando ? (
            <div className="flex min-h-[60vh] items-center justify-center"><Carregando /></div>
          ) : (
            <div className="space-y-8">
              <section>
                <h2 className="mb-4 text-lg font-bold">KPIs Gerais</h2>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-4">
                  <StatCard titulo="Total Utilizadores" valor={numero(dados.total_utilizadores)} variacao="+0%" icon="users" />
                  <StatCard titulo="Total Badges Atribuídos" valor={numero(dados.total_badges_atribuidos)} variacao="+0%" icon="badge" />
                  <StatCard titulo="% Badges Atribuídos" valor={`${kpis.percentagemAtribuidos}%`} icon="trend" />
                  <StatCard titulo="Candidaturas por Estado">
                    <div className="mt-4 space-y-3">
                      {estadosResumo.map((e) => (
                        <div key={e.chave} className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">{e.label}</span>
                          <span className={`font-bold ${e.cor}`}>{numero(e.total)}</span>
                        </div>
                      ))}
                    </div>
                  </StatCard>
                </div>
              </section>

              <section>
                <h2 className="mb-4 text-lg font-bold">Estatísticas</h2>
                <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1.35fr)_minmax(520px,0.95fr)]">
                  <Painel titulo="Badges por Área" className="min-w-0">
                    <BarChart dados={dados.badges_por_area || dados.badges_por_learning_path} />
                  </Painel>
                  <Painel titulo="Badges por Nível (A-E)" className="min-w-0">
                    <PieChart dados={dados.badges_por_nivel} />
                  </Painel>
                </div>
              </section>

              <Painel titulo="Evolução Mensal">
                <LineChart dados={dados.badges_por_mes} />
              </Painel>

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <Painel titulo="Controlo SLA">
                  <div className="space-y-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">SLA Talent Manager</span>
                      <span className="font-bold text-emerald-600">{slaTalent ? `${slaTalent.limite} ${slaTalent.unidade}` : '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">SLA Service Line</span>
                      <span className="font-bold text-emerald-600">{slaService ? `${slaService.limite} ${slaService.unidade}` : '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Processos SLA ultrapassado</span>
                      <span className="font-bold text-rose-600">{numero(foraSla.data?.dados?.length)}</span>
                    </div>
                    <Link to="/gestao" className="btn-primary mt-6 w-full">Notificar Equipa</Link>
                  </div>
                </Painel>

                <Painel titulo="Gamificação Global">
                  <div className="space-y-3 text-sm">
                    <div className="text-slate-500">Top 5 Consultores</div>
                    {(ranking.data?.dados || []).map((r) => (
                      <div key={r.id_utilizador} className="flex items-center justify-between">
                        <span>{r.nome}</span>
                        <span className="font-bold text-softinsa-600">{numero(r.pontos_totais)} pts</span>
                      </div>
                    ))}
                    {(ranking.data?.dados || []).length === 0 && <div className="text-slate-400">Sem ranking disponível</div>}
                    <div className="my-4 border-t border-slate-200" />
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Badge mais obtido do mês</span>
                      <span className="font-bold text-softinsa-600">{dados.badge_mais_obtido_mes?.titulo || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Melhor Service Line</span>
                      <span className="font-bold text-softinsa-600">{dados.melhor_service_line?.nome || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Conquistas especiais</span>
                      <span className="font-bold text-softinsa-600">{numero(dados.total_conquistas_especiais)}</span>
                    </div>
                  </div>
                </Painel>
              </div>

              <section>
                <h2 className="mb-4 text-lg font-bold">Pedidos Recentes</h2>
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                        <tr>
                          <th className="px-4 py-4 text-left">Consultor</th>
                          <th className="px-4 py-4 text-left">Badge</th>
                          <th className="px-4 py-4 text-left">Service Line</th>
                          <th className="px-4 py-4 text-left">Estado</th>
                          <th className="px-4 py-4 text-left">Data</th>
                          <th className="px-4 py-4 text-left">SLA Restante</th>
                          <th className="px-4 py-4 text-left">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {recentes.map((c) => {
                          const info = estadoCandidatura(c.estado_atual);
                          return (
                            <tr key={c.id_candidatura}>
                              <td className="px-4 py-4 font-medium text-slate-700">{c.nome_consultor}</td>
                              <td className="px-4 py-4 text-slate-700">{c.titulo_badge}</td>
                              <td className="px-4 py-4 text-slate-500">{c.nome_service_line}</td>
                              <td className="px-4 py-4"><span className={`badge-pill ${info.cor}`}>{info.label}</span></td>
                              <td className="px-4 py-4 text-slate-500">{formatarData(c.data_submissao || c.data_abertura)}</td>
                              <td className="px-4 py-4 text-slate-500">{formatarSlaRestante(c, listaSlas)}</td>
                              <td className="px-4 py-4">
                                <Link to={`/candidaturas/${c.id_candidatura}`} className="font-medium text-softinsa-700 hover:underline">Ver Processo</Link>
                              </td>
                            </tr>
                          );
                        })}
                        {recentes.length === 0 && (
                          <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">Sem pedidos recentes.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <Painel titulo="Avisos Ativos">
                  <div className="divide-y divide-slate-200">
                    {listaAvisos.slice(0, 4).map((aviso) => (
                      <div key={aviso.id_aviso} className="flex items-center justify-between gap-4 py-3 first:pt-0">
                        <div>
                          <div className="font-medium text-slate-800">{aviso.titulo}</div>
                          <div className="text-xs text-slate-500">{formatarData(aviso.data_inicio || aviso.created_at)}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`badge-pill ${aviso.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {aviso.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                          <span className="text-sm font-medium text-softinsa-700">Gerir</span>
                        </div>
                      </div>
                    ))}
                    {listaAvisos.length === 0 && <div className="py-8 text-center text-sm text-slate-500">Sem avisos configurados.</div>}
                  </div>
                </Painel>

                <Painel titulo="Auditoria">
                  <div className="rounded-lg bg-slate-50 p-4">
                    <div className="text-xs text-slate-500">Última ação administrativa</div>
                    <div className="mt-2 font-semibold text-slate-800">
                      {recentes[0] ? `Candidatura #${recentes[0].id_candidatura} - ${recentes[0].titulo_badge}` : 'Sem atividade recente'}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Por Admin - {recentes[0] ? formatarData(recentes[0].data_submissao || recentes[0].data_abertura) : '-'}
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-between">
                    <span className="text-slate-500">Total ações registadas</span>
                    <span className="text-2xl font-bold text-softinsa-600">{numero(dados.total_acoes_registadas)}</span>
                  </div>
                  <Link to="/gestao" className="btn-secondary mt-6 w-full bg-slate-100">Ver Histórico Completo</Link>
                </Painel>
              </div>
            </div>
          )}
        </main>
      </div>
      {mostrarLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <section className="w-full max-w-md overflow-hidden rounded-[24px] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <h2 className="text-2xl font-bold text-slate-900">Terminar sessão</h2>
              <button
                type="button"
                onClick={() => setMostrarLogout(false)}
                className="text-slate-400 hover:text-slate-700"
                aria-label="Fechar"
              >
                <ShellIcon nome="x" className="h-7 w-7" />
              </button>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm leading-6 text-slate-600">Pretende terminar a sua sessão?</p>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button type="button" className="btn-secondary" onClick={() => setMostrarLogout(false)}>
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={confirmarLogout}>
                Terminar sessão
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
