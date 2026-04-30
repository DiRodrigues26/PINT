import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { AppSidebar, AppTopbar, ShellIcon } from '../../components/AppShell';
import Carregando from '../../components/Carregando';
import { useAuth } from '../../context/AuthContext';
import { estadoCandidatura, formatarData } from '../../lib/formatar';
import AdminLearningPaths from './AdminLearningPaths';
import AdminServiceLines from './AdminServiceLines';
import AdminUtilizadores from './AdminUtilizadores';

const MENU = [
  { chave: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { chave: 'utilizadores', label: 'Gestão de Utilizadores', icon: 'users' },
  { chave: 'learning-paths', label: 'Gestão de Learning Paths', icon: 'doc' },
  { chave: 'service-lines', label: 'Gestão de Service Lines', icon: 'pulse' },
  { chave: 'areas', label: 'Gestão de Áreas', icon: 'doc' },
  { chave: 'niveis', label: 'Gestão de Níveis', icon: 'trend' },
  { chave: 'eventos', label: 'Gestão de Eventos Especiais', icon: 'calendar' },
  { chave: 'requisitos', label: 'Gestão de Requisitos', icon: 'doc' },
  { chave: 'badges', label: 'Gestão de Badges', icon: 'badge' },
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
  const items = (dados || []).slice(0, 6);
  const max = Math.max(...items.map((i) => Number(i.total) || 0), 1);
  const largura = 640;
  const altura = 210;
  const margem = { top: 8, right: 16, bottom: 42, left: 42 };
  const plotW = largura - margem.left - margem.right;
  const plotH = altura - margem.top - margem.bottom;
  const barW = items.length ? plotW / items.length - 24 : 0;

  return (
    <svg viewBox={`0 0 ${largura} ${altura}`} className="h-56 w-full">
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
        const x = margem.left + idx * (plotW / items.length) + 12;
        const h = (valor / max) * (plotH - 8);
        const y = margem.top + plotH - h;
        return (
          <g key={item.id_learning_path || item.nome || idx}>
            <rect x={x} y={y} width={barW} height={h} rx="6" fill="#3f68a2" />
            <text x={x + barW / 2} y={altura - 18} textAnchor="middle" fontSize="12" fill="#64748b">
              {String(item.nome || 'Sem nome').slice(0, 18)}
            </text>
          </g>
        );
      })}
      {items.length === 0 && <text x="50%" y="50%" textAnchor="middle" fill="#94a3b8">Sem dados</text>}
    </svg>
  );
}

function PieChart({ dados }) {
  const items = (dados || []).filter((i) => Number(i.total) > 0);
  const total = items.reduce((s, i) => s + Number(i.total || 0), 0);
  let acumulado = 0;
  const r = 78;
  const cx = 150;
  const cy = 95;

  function ponto(angulo) {
    const rad = (angulo - 90) * Math.PI / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  }

  return (
    <div className="flex min-h-56 items-center justify-center">
      <svg viewBox="0 0 360 210" className="h-56 w-full max-w-md">
        {total === 0 ? (
          <text x="50%" y="50%" textAnchor="middle" fill="#94a3b8">Sem dados</text>
        ) : items.map((item, idx) => {
          const valor = Number(item.total) || 0;
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
              strokeWidth="2"
            />
          );
        })}
        <g transform="translate(84 190)">
          {(dados || []).slice(0, 5).map((item, idx) => (
            <g key={item.codigo_nivel || idx} transform={`translate(${idx * 44} 0)`}>
              <rect width="14" height="14" fill={CORES_NIVEL[idx % CORES_NIVEL.length]} />
              <text x="20" y="12" fontSize="13" fill="#64748b">{item.codigo_nivel}</text>
            </g>
          ))}
        </g>
      </svg>
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
  });

  const ranking = useQuery({
    queryKey: ['admin-dashboard', 'ranking'],
    queryFn: async () => (await api.get('/api/estatisticas/ranking', { params: { limite: 5 } })).data,
  });

  const candidaturas = useQuery({
    queryKey: ['admin-dashboard', 'candidaturas-recentes'],
    queryFn: async () => (await api.get('/api/candidaturas', { params: { por_pagina: 5 } })).data,
  });

  const slas = useQuery({
    queryKey: ['admin-dashboard', 'sla'],
    queryFn: async () => (await api.get('/api/sla')).data,
  });

  const foraSla = useQuery({
    queryKey: ['admin-dashboard', 'sla-fora-prazo'],
    queryFn: async () => (await api.get('/api/sla/fora-prazo')).data,
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
    const aprovadas = (dados.estados_candidatura || []).find((e) => e.estado_atual === 'APPROVED')?.total || 0;
    return {
      percentagemAtribuidos: percentagem(aprovadas, totalEstados),
      totalEstados,
    };
  }, [dados.estados_candidatura]);

  const melhorLinha = useMemo(() => {
    const ordenadas = [...(dados.badges_por_learning_path || [])].sort((a, b) => Number(b.total) - Number(a.total));
    return ordenadas[0]?.nome || '-';
  }, [dados.badges_por_learning_path]);

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
        <AppTopbar titulo={`${saudacao()}, Admin!`} subtitulo={subtitulo} utilizador={utilizador} />
        <main className={`mx-auto py-8 ${vistaAtiva === 'utilizadores' ? 'max-w-[1720px] px-5 lg:px-8 xl:px-10' : ['learning-paths', 'service-lines'].includes(vistaAtiva) ? 'max-w-[1560px] px-5 lg:px-10 xl:px-16' : 'max-w-[1480px] px-5 lg:px-10 xl:px-[120px]'}`}>
          {vistaAtiva === 'utilizadores' ? (
            <AdminUtilizadores />
          ) : vistaAtiva === 'learning-paths' ? (
            <AdminLearningPaths />
          ) : vistaAtiva === 'service-lines' ? (
            <AdminServiceLines />
          ) : carregando ? (
            <div className="flex min-h-[60vh] items-center justify-center"><Carregando /></div>
          ) : (
            <div className="space-y-8">
              <section>
                <h2 className="mb-4 text-lg font-bold">KPIs Gerais</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <StatCard titulo="Total Utilizadores" valor={numero(dados.total_utilizadores)} variacao="+0%" icon="users" />
                  <StatCard titulo="Total Badges Atribuídos" valor={numero(dados.total_badges_atribuidos)} variacao="+0%" icon="badge" />
                  <StatCard titulo="% Badges Atribuídos" valor={`${kpis.percentagemAtribuidos}%`} icon="trend" />
                  <StatCard titulo="Candidaturas por Estado">
                    <div className="mt-4 space-y-3">
                      {(dados.estados_candidatura || []).slice(0, 4).map((e) => {
                        const info = estadoCandidatura(e.estado_atual);
                        return (
                          <div key={e.estado_atual} className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">{info.label}</span>
                            <span className="font-bold text-softinsa-600">{numero(e.total)}</span>
                          </div>
                        );
                      })}
                      {(dados.estados_candidatura || []).length === 0 && <div className="text-sm text-slate-400">Sem candidaturas</div>}
                    </div>
                  </StatCard>
                </div>
              </section>

              <section>
                <h2 className="mb-4 text-lg font-bold">Estatísticas</h2>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <Painel titulo="Badges por Learning Path">
                    <BarChart dados={dados.badges_por_learning_path} />
                  </Painel>
                  <Painel titulo="Badges por Nível (A-E)">
                    <PieChart dados={dados.badges_por_nivel} />
                  </Painel>
                </div>
              </section>

              <Painel titulo="Evolução Mensal">
                <LineChart dados={dados.badges_por_mes} />
              </Painel>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
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
                      <span className="text-slate-500">Learning Path com mais badges</span>
                      <span className="font-bold text-softinsa-600">{melhorLinha}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Badges ativos</span>
                      <span className="font-bold text-softinsa-600">{numero(dados.total_badges_ativos)}</span>
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

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
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
                    <span className="text-2xl font-bold text-softinsa-600">{numero(kpis.totalEstados + Number(dados.total_badges_atribuidos || 0))}</span>
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
