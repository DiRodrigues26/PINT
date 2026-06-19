import { useMemo, useRef, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Award, Check, Copy, Mail } from 'lucide-react';
import { api } from '../../lib/api';
import { ConsultorSidebar, ConsultorTopbar } from '../../components/ConsultorShell';
import Carregando from '../../components/Carregando';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import toast from 'react-hot-toast';
import AssinaturaEmailPreview from '../../components/AssinaturaEmailPreview';

const ORIGIN = window.location.origin;

export default function AssinaturaEmail() {
  const { t } = useLanguage();
  const { utilizador } = useAuth();
  const previewRef = useRef(null);
  const [nome, setNome] = useState(utilizador?.nome || '');
  const [cargo, setCargo] = useState('Consultor · Softinsa');
  const [emailContacto, setEmailContacto] = useState(utilizador?.email || '');
  const [selecionados, setSelecionados] = useState(() => new Set());
  const [copiado, setCopiado] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['meus-badges'],
    queryFn: async () => { const { data } = await api.get('/api/badge-atribuido/meus'); return data; },
    staleTime: 60_000,
  });

  const badges = useMemo(() => {
    const lista = data?.dados ?? [];
    // só badges válidos (não expirados) podem ser destacados
    return lista.filter(b => !b.data_expiracao || new Date(b.data_expiracao) >= new Date());
  }, [data]);

  // Por defeito seleciona os primeiros 4 badges
  useEffect(() => {
    if (badges.length && selecionados.size === 0) {
      setSelecionados(new Set(badges.slice(0, 4).map(b => b.id_badge_atribuido)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [badges]);

  function toggle(id) {
    setSelecionados(prev => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id); else novo.add(id);
      return novo;
    });
  }

  const escolhidos = badges.filter(b => selecionados.has(b.id_badge_atribuido));

  async function copiarAssinatura() {
    try {
      const html = previewRef.current.innerHTML;
      const texto = `${nome}\n${cargo}\n${emailContacto}`;
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([texto], { type: 'text/plain' }),
        }),
      ]);
      setCopiado(true);
      toast.success('Assinatura copiada! Cola no teu cliente de email.');
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      toast.error('O navegador não permitiu copiar. Seleciona e copia manualmente.');
    }
  }

  return (
    <div className="min-h-screen bg-[#f3f6fa]">
      <ConsultorSidebar />
      <div className="lg:pl-[260px]">
        <ConsultorTopbar subtitulo={t('sub_assinatura')} />

        <main className="px-5 py-8 lg:px-10 pb-24 lg:pb-10">
          <h2 className="text-2xl font-bold text-slate-900">Assinatura de email com badges</h2>
          <p className="mt-1 text-sm text-slate-500">
            Cria uma assinatura profissional com os teus badges. Cada badge liga à sua página pública de verificação.
          </p>

          {isLoading ? (
            <div className="flex min-h-[40vh] items-center justify-center"><Carregando /></div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Configuração */}
              <div className="space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900">Dados</h3>
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Nome</label>
                      <input value={nome} onChange={e => setNome(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-softinsa-400" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Cargo</label>
                      <input value={cargo} onChange={e => setCargo(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-softinsa-400" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Email de contacto</label>
                      <input value={emailContacto} onChange={e => setEmailContacto(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-softinsa-400" />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900">Badges a incluir ({escolhidos.length})</h3>
                  {badges.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-400">Ainda não tens badges válidos para incluir.</p>
                  ) : (
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {badges.map(b => {
                        const ativo = selecionados.has(b.id_badge_atribuido);
                        return (
                          <button key={b.id_badge_atribuido} type="button" onClick={() => toggle(b.id_badge_atribuido)}
                            className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                              ativo ? 'border-softinsa-400 bg-softinsa-50' : 'border-slate-200 hover:border-slate-300'
                            }`}>
                            {b.imagem_url ? (
                              <img src={b.imagem_url} alt={b.titulo} className="h-10 w-10 rounded-full object-cover" />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-softinsa-100">
                                <Award className="h-5 w-5 text-softinsa-500" />
                              </div>
                            )}
                            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">{b.titulo}</span>
                            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                              ativo ? 'border-softinsa-500 bg-softinsa-500 text-white' : 'border-slate-300'
                            }`}>
                              {ativo && <Check className="h-3 w-3" strokeWidth={3} />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Pré-visualização */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Pré-visualização</h3>
                    <button type="button" onClick={copiarAssinatura}
                      className="flex items-center gap-2 rounded-lg bg-softinsa-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-softinsa-700">
                      {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copiado ? 'Copiado' : 'Copiar assinatura'}
                    </button>
                  </div>

                  {/* Bloco que será copiado (HTML inline para compatibilidade com clientes de email) */}
                  <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
                    <AssinaturaEmailPreview
                      ref={previewRef}
                      nome={nome}
                      cargo={cargo}
                      email={emailContacto}
                      badges={escolhidos}
                      origin={ORIGIN}
                    />
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs text-blue-800">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Clica em <strong>Copiar assinatura</strong> e cola (Ctrl+V) na configuração de assinatura do
                    Outlook ou Gmail. As imagens dos badges ficam clicáveis e abrem a página pública de verificação.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
