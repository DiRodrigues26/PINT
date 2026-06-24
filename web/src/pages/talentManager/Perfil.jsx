import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Mail, Pencil, KeyRound, Globe, ShieldCheck, FileCheck, CheckCircle, XCircle,
  Send, Bell, AlertCircle, Copy, FileText, Award, Users,
  ClipboardList, BarChart3, BookOpen, ClipboardCheck, X, LogOut,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extrairErro } from '../../lib/api';
import { TalentManagerSidebar, TalentManagerTopbar } from '../../components/TalentManagerShell';
import { ConfirmarLogoutModal } from '../../components/ConfirmarLogoutModal';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { exportCSV, exportPDF } from '../../lib/exportUtils';
import { useTM } from './i18n';
import AssinaturaEmailPreview from '../../components/AssinaturaEmailPreview';

function formatarDataHora(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* ─── Modais simples ─────────────────────────────────────────────────── */
function ModalBase({ titulo, children, onFechar }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onFechar}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-bold text-slate-900">{titulo}</h3>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export default function TalentPerfil() {
  const tt = useTM();
  const { utilizador, recarregar, logout } = useAuth();
  const { idioma, mudarIdioma, t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const assinaturaRef = useRef(null);
  const [modal, setModal] = useState(null); // 'password' | 'editar'
  const [confirmarLogout, setConfirmarLogout] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const nome = utilizador?.nome || 'Talent Manager';
  const email = utilizador?.email || '';
  const iniciais = nome.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('');

  const { data: atividadeData } = useQuery({
    queryKey: ['tm-atividade'],
    queryFn: async () => { const { data } = await api.get('/api/estatisticas/talent-atividade'); return data; },
    staleTime: 60_000,
  });
  const { data: notifData } = useQuery({
    queryKey: ['tm-notificacoes'],
    queryFn: async () => { const { data } = await api.get('/api/notificacoes?por_pagina=10'); return data; },
    staleTime: 30_000,
  });
  const { data: prefData } = useQuery({
    queryKey: ['preferencias'],
    queryFn: async () => { const { data } = await api.get('/api/preferencias'); return data; },
    staleTime: 60_000,
  });

  const stats = atividadeData?.stats ?? { total: 0, aprovacoes: 0, rejeicoes: 0, tempo_medio_dias: 0, taxa_aprovacao: 0 };
  const atividade = atividadeData?.atividade ?? [];
  const notificacoes = (notifData?.dados ?? []).slice(0, 4);
  const prefs = prefData?.preferencias ?? {};

  const [prefEmail, setPrefEmail] = useState(true);
  const [prefPush, setPrefPush] = useState(true);
  useEffect(() => {
    if (prefData?.preferencias) {
      setPrefEmail(prefData.preferencias.email_aprovacao_badge !== 0);
      setPrefPush(prefData.preferencias.notif_expiracao !== 0);
    }
  }, [prefData]);

  const guardarPref = useMutation({
    mutationFn: (payload) => api.put('/api/preferencias', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['preferencias'] }),
  });

  function togglePref(campo, valor, setter) {
    setter(valor);
    guardarPref.mutate({ ...prefs, [campo]: valor ? 1 : 0 });
  }

  function copiarAssinatura() {
    try {
      const html = assinaturaRef.current.innerHTML;
      navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([`${nome}\nTalent Manager\n${email}`], { type: 'text/plain' }),
      })]);
      toast.success(tt('assinatura_copiada'));
    } catch { toast.error(tt('nao_copiar')); }
  }

  async function exportar(tipo, formato, label) {
    try {
      let headers = [], rows = [];
      if (tipo === 'Candidaturas') {
        const { data } = await api.get('/api/candidaturas?por_pagina=200');
        headers = [tt('col_consultor'), tt('col_badge'), tt('col_area'), tt('col_estado'), tt('col_pontos')];
        rows = (data.dados || []).map(c => [c.nome_consultor, c.titulo_badge, c.nome_area, c.estado_atual, c.pontos]);
      } else if (tipo === 'Badges') {
        const { data } = await api.get('/api/badges?ativo=1&por_pagina=200');
        headers = [tt('col_badge'), tt('col_service_line'), tt('col_area'), tt('nivel'), tt('col_pontos')];
        rows = (data.dados || []).map(b => [b.titulo, b.nome_service_line, b.nome_area, b.codigo_nivel, b.pontos]);
      } else if (tipo === 'Consultores') {
        const { data } = await api.get('/api/estatisticas/ranking?limite=100');
        headers = [tt('col_nome'), tt('col_service_line'), tt('col_area'), tt('aba_badges'), tt('col_pontos')];
        rows = (data.dados || []).map(c => [c.nome, c.nome_service_line, c.nome_area, c.total_badges, c.pontos_totais]);
      } else if (tipo === 'Aprovações' || tipo === 'Rejeições') {
        const { data } = await api.get('/api/estatisticas/talent-atividade?limite=1000');
        const alvo = tipo === 'Aprovações' ? 'CORRETO' : 'INCORRETO';
        headers = [tt('col_consultor'), tt('col_badge'), tt('col_area'), tt('col_service_line'), tt('col_data_sub'), tt('observacoes')];
        rows = (data.atividade || [])
          .filter(a => a.decisao === alvo)
          .map(a => [a.nome_consultor, a.badge_titulo, a.nome_area, a.nome_service_line, formatarDataHora(a.data_avaliacao), a.comentario || '']);
      }

      if (rows.length === 0) { toast.error(`${label}: ${tt('sem_dados_export')}`); return; }

      const stamp = new Date().toISOString().slice(0, 10);
      const NOME_FICHEIRO = {
        Candidaturas: 'candidaturas', Badges: 'badges', Consultores: 'consultores',
        'Aprovações': 'aprovacoes', 'Rejeições': 'rejeicoes',
      };
      const base = NOME_FICHEIRO[tipo] || 'exportacao';
      if (formato === 'pdf') {
        exportPDF(`${base}_${stamp}.pdf`, label, headers, rows);
      } else {
        exportCSV(`${base}_${stamp}.csv`, headers, rows);
      }
      toast.success(`${label} ${tt('exportado_ok')} (${formato === 'pdf' ? 'PDF' : 'Excel'}).`);
    } catch (e) { toast.error(extrairErro(e)); }
  }

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      <TalentManagerSidebar />
      <div className="lg:pl-[240px]">
        <TalentManagerTopbar titulo={tt('perfil_titulo')} subtitulo={tt('perfil_sub')} />

        <main className="px-5 py-8 lg:px-8 pb-24 lg:pb-10 space-y-6">
          {/* Cartão de perfil */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xl font-bold text-slate-500">{iniciais}</div>
              <div className="flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{nome}</h2>
                    <p className="flex items-center gap-1.5 text-sm text-slate-500"><Mail className="h-4 w-4" /> {email}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white">Talent Manager</span>
                      <span className="flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"><CheckCircle className="h-3 w-3" /> {tt('ativo')}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setModal('editar')} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Pencil className="h-4 w-4" /> {tt('editar_perfil')}</button>
                    <button onClick={() => setModal('password')} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><KeyRound className="h-4 w-4" /> {tt('alterar_password')}</button>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3">
                  <Campo label={tt('ambito')} valor={tt('ambito_valor')} />
                  <Campo label={tt('acesso')}><span className="flex flex-wrap gap-1.5">{[tt('candidaturas_n'), tt('aba_badges'), tt('exp_consultores')].map(t => <span key={t} className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{t}</span>)}</span></Campo>
                  <Campo label={tt('ultimo_acesso')} valor={utilizador?.ultimo_login ? formatarDataHora(utilizador.ultimo_login) : tt('sessao_atual')} />
                </div>
              </div>
            </div>
          </section>

          {/* Âmbito de atuação */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">{tt('ambito_atuacao')}</h3>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <AmbitoCard icon={Globe} cor="text-blue-500" tag={tt('amb_global_tag')} tagCor="bg-blue-100 text-blue-700" desc={tt('amb_global_desc')} />
              <AmbitoCard icon={ShieldCheck} cor="text-violet-500" tag={tt('amb_completo_tag')} tagCor="bg-violet-100 text-violet-700" desc={tt('amb_completo_desc')} />
              <AmbitoCard icon={FileCheck} cor="text-emerald-500" tag={tt('amb_evid_tag')} tagCor="bg-emerald-100 text-emerald-700" desc={tt('amb_evid_desc')} />
            </div>
          </section>

          {/* Atividade + Estatísticas */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900">{tt('atividade_recente')}</h3>
              {atividade.length === 0 ? (
                <p className="mt-4 text-sm text-slate-400">{tt('sem_atividade')}</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {atividade.map((a, i) => {
                    const ok = a.decisao === 'CORRETO';
                    return (
                      <div key={i} className="flex items-center gap-3">
                        {ok ? <Send className="h-5 w-5 shrink-0 text-blue-500" /> : <XCircle className="h-5 w-5 shrink-0 text-rose-500" />}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800">{ok ? tt('val_enviada_sl') : tt('devolvida_consultor')}</p>
                          <p className="truncate text-xs text-slate-400">{a.badge_titulo} • {a.nome_consultor}</p>
                          <p className="text-[11px] text-slate-300">{formatarDataHora(a.data_avaliacao)}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${ok ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-600'}`}>{ok ? tt('enviado') : tt('devolvido')}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900">{tt('estat_validacao')}</h3>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <EstatCard icon={ClipboardList} label={tt('total_validacoes')} valor={stats.total} />
                <EstatCard icon={CheckCircle} label={tt('p_aprovacoes')} valor={stats.aprovacoes} cor="text-emerald-600" />
                <EstatCard icon={XCircle} label={tt('p_rejeicoes')} valor={stats.rejeicoes} cor="text-rose-600" />
                <EstatCard icon={Bell} label={tt('tempo_medio')} valor={`${stats.tempo_medio_dias}d`} />
                <EstatCard icon={BarChart3} label={tt('taxa_aprovacao')} valor={`${stats.taxa_aprovacao}%`} destaque />
              </div>
            </section>
          </div>

          {/* Notificações */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">{tt('notif_titulo')}</h3>
              <button onClick={() => navigate('/tm/notificacoes')} className="text-sm font-semibold text-softinsa-600 hover:underline">{tt('ver_todas')}</button>
            </div>
            {notificacoes.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">{tt('sem_notificacoes_p')}</p>
            ) : (
              <div className="mt-4 space-y-2">
                {notificacoes.map(n => (
                  <div key={n.id_notificacao} className="flex items-center gap-3 rounded-lg border border-slate-100 px-4 py-3">
                    {!n.lida ? <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" /> : <Bell className="h-4 w-4 shrink-0 text-slate-300" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-700">{n.titulo}</p>
                      <p className="text-[11px] text-slate-400">{formatarDataHora(n.data_criacao)}</p>
                    </div>
                    {!n.lida && <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">{tt('nova')}</span>}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Definições */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">{tt('definicoes')}</h3>
            <div className="mt-4 divide-y divide-slate-100">
              <LinhaToggle icon={Mail} titulo={tt('notif_email')} desc={tt('notif_email_desc')} ativo={prefEmail} onToggle={() => togglePref('email_aprovacao_badge', !prefEmail, setPrefEmail)} />
              <LinhaToggle icon={Bell} titulo={tt('alertas_sistema')} desc={tt('alertas_sistema_desc')} ativo={prefPush} onToggle={() => togglePref('notif_expiracao', !prefPush, setPrefPush)} />
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-slate-400" />
                  <div><p className="text-sm font-semibold text-slate-800">{tt('idioma')}</p><p className="text-xs text-slate-400">{tt('idioma_desc')}</p></div>
                </div>
                <select value={idioma} onChange={e => mudarIdioma(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-softinsa-400">
                  <option value="pt">Português</option><option value="en">English</option><option value="es">Español</option>
                </select>
              </div>
            </div>
          </section>

          {/* Assinatura de Email */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-900"><Mail className="h-5 w-5 text-slate-500" /> {tt('assinatura_email')}</h3>
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5">
              <AssinaturaEmailPreview
                ref={assinaturaRef}
                nome={nome}
                cargo="Talent Manager · Softinsa"
                email={email}
              />
            </div>
            <button onClick={copiarAssinatura} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-softinsa-600 py-2.5 text-sm font-semibold text-white hover:bg-softinsa-700">
              <Copy className="h-4 w-4" />
              {tt('copiar_assinatura')}
            </button>
          </section>

          {/* Acessos rápidos */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900">{tt('acesso_rapido_export')}</h3>
              <p className="mt-1 text-xs text-slate-400">{tt('export_desc')}</p>
              <div className="mt-4 space-y-2.5">
                {[
                  { id: 'Candidaturas', l: tt('candidaturas_n'), i: FileText },
                  { id: 'Badges', l: tt('aba_badges'), i: Award },
                  { id: 'Consultores', l: tt('exp_consultores'), i: Users },
                  { id: 'Aprovações', l: tt('exp_aprovacoes'), i: CheckCircle },
                  { id: 'Rejeições', l: tt('exp_rejeicoes'), i: XCircle },
                ].map(({ id, l, i: Icon }) => (
                  <div key={id} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Icon className="h-5 w-5 text-softinsa-500" /> {l}
                    </span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => exportar(id, 'excel', l)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
                        Excel
                      </button>
                      <button onClick={() => exportar(id, 'pdf', l)}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100">
                        PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900">{tt('acesso_sistema')}</h3>
              <div className="mt-4 space-y-2">
                <LinhaSistema icon={ClipboardCheck} titulo={tt('sis_candidaturas')} desc={tt('sis_candidaturas_desc')} onClick={() => navigate('/tm/candidaturas')} />
                <LinhaSistema icon={BookOpen} titulo={tt('sis_badges')} desc={tt('sis_badges_desc')} onClick={() => navigate('/tm/badges')} />
                <LinhaSistema icon={BarChart3} titulo={tt('sis_relatorios')} desc={tt('sis_relatorios_desc')} onClick={() => navigate('/tm/relatorios')} />
              </div>
            </section>
          </div>

          {/* Terminar sessão — visível no mobile, onde a sidebar (com logout) está escondida */}
          <button
            type="button"
            onClick={() => setConfirmarLogout(true)}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 lg:hidden"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.8} />
            {t('terminar_sessao')}
          </button>
        </main>
      </div>

      {modal === 'password' && <ModalPassword onFechar={() => setModal(null)} />}
      {modal === 'editar' && <ModalEditar nomeAtual={nome} onFechar={() => setModal(null)} onGuardado={recarregar} />}
      {confirmarLogout && (
        <ConfirmarLogoutModal
          onConfirmar={() => { setConfirmarLogout(false); handleLogout(); }}
          onCancelar={() => setConfirmarLogout(false)}
        />
      )}
    </div>
  );
}

/* ─── Sub-componentes ────────────────────────────────────────────────── */
function Campo({ label, valor, children }) {
  return <div><p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>{children || <p className="mt-0.5 text-sm font-semibold text-slate-800">{valor}</p>}</div>;
}
function AmbitoCard({ icon: Icon, cor, tag, tagCor, desc }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${cor}`} strokeWidth={1.8} />
        <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${tagCor}`}>{tag}</span>
      </div>
      <p className="mt-2 text-xs text-slate-500">{desc}</p>
    </div>
  );
}
function EstatCard({ icon: Icon, label, valor, cor = 'text-slate-900', destaque }) {
  return (
    <div className={`rounded-xl p-3 ${destaque ? 'bg-softinsa-50' : 'bg-slate-50'}`}>
      <div className="flex items-center justify-between"><span className="text-[11px] text-slate-500">{label}</span><Icon className="h-3.5 w-3.5 text-slate-400" /></div>
      <p className={`mt-1 text-xl font-bold ${cor}`}>{valor}</p>
    </div>
  );
}
function LinhaToggle({ icon: Icon, titulo, desc, ativo, onToggle }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-slate-400" />
        <div><p className="text-sm font-semibold text-slate-800">{titulo}</p><p className="text-xs text-slate-400">{desc}</p></div>
      </div>
      <button onClick={onToggle} className={`relative h-6 w-11 rounded-full transition ${ativo ? 'bg-softinsa-600' : 'bg-slate-300'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${ativo ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}
function LinhaSistema({ icon: Icon, titulo, desc, onClick }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:border-softinsa-300 hover:bg-slate-50">
      <Icon className="h-5 w-5 shrink-0 text-softinsa-500" />
      <div><p className="text-sm font-semibold text-slate-800">{titulo}</p><p className="text-xs text-slate-400">{desc}</p></div>
    </button>
  );
}

function ModalPassword({ onFechar }) {
  const tt = useTM();
  const [atual, setAtual] = useState(''); const [nova, setNova] = useState(''); const [conf, setConf] = useState('');
  const m = useMutation({
    mutationFn: () => api.put('/api/utilizadores/eu/password', { password_atual: atual, nova_password: nova }),
    onSuccess: () => { toast.success(tt('pass_alterada')); onFechar(); },
    onError: (err) => toast.error(extrairErro(err)),
  });
  function submeter() {
    if (nova.length < 8) return toast.error(tt('pass_min'));
    if (nova !== conf) return toast.error(tt('pass_nao_coincide'));
    m.mutate();
  }
  return (
    <ModalBase titulo={tt('alterar_password')} onFechar={onFechar}>
      <div className="space-y-3">
        <input type="password" placeholder={tt('password_atual_ph')} value={atual} onChange={e => setAtual(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-softinsa-400" />
        <input type="password" placeholder={tt('nova_password_ph')} value={nova} onChange={e => setNova(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-softinsa-400" />
        <input type="password" placeholder={tt('conf_password_ph')} value={conf} onChange={e => setConf(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-softinsa-400" />
        <button onClick={submeter} disabled={m.isPending} className="w-full rounded-lg bg-softinsa-600 py-2.5 text-sm font-semibold text-white hover:bg-softinsa-700 disabled:opacity-60">{tt('guardar')}</button>
      </div>
    </ModalBase>
  );
}
function ModalEditar({ nomeAtual, onFechar, onGuardado }) {
  const tt = useTM();
  const [nome, setNome] = useState(nomeAtual);
  const m = useMutation({
    mutationFn: () => api.put('/api/utilizadores/eu/perfil', { nome }),
    onSuccess: async () => { toast.success(tt('perfil_atualizado')); await onGuardado?.(); onFechar(); },
    onError: (err) => toast.error(extrairErro(err)),
  });
  return (
    <ModalBase titulo={tt('editar_perfil')} onFechar={onFechar}>
      <label className="mb-1 block text-xs font-medium text-slate-500">{tt('nome_lbl')}</label>
      <input value={nome} onChange={e => setNome(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-softinsa-400" />
      <button onClick={() => m.mutate()} disabled={m.isPending || !nome.trim()} className="mt-4 w-full rounded-lg bg-softinsa-600 py-2.5 text-sm font-semibold text-white hover:bg-softinsa-700 disabled:opacity-60">{tt('guardar')}</button>
    </ModalBase>
  );
}
