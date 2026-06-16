import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Eye,
  FileText,
  KeyRound,
  Pencil,
  Power,
  Search,
  TriangleAlert,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api, extrairErro } from '../../lib/api';
import { descarregarCsv, imprimirTabela } from '../../lib/exportar';
import { formatarData, formatarDataHora } from '../../lib/formatar';

const PERFIS = ['Consultor', 'Talent Manager', 'Service Line', 'Administrador'];
const ESTADO_INICIAL = {
  nome: '',
  email: '',
  password: 'Temp12345',
  perfil: '',
  id_service_line: '',
  id_area: '',
  ativo: true,
  forcar_alteracao_password: true,
  enviar_email_confirmacao: true,
};

const ICONES = {
  search: Search,
  file: FileText,
  x: X,
  eye: Eye,
  edit: Pencil,
  power: Power,
  key: KeyRound,
  warning: TriangleAlert,
};

function Icon({ nome, className = 'h-5 w-5' }) {
  const Componente = ICONES[nome] || FileText;
  return <Componente className={className} aria-hidden="true" strokeWidth={1.8} />;
}

function perfisComoTexto(perfis) {
  if (Array.isArray(perfis)) return perfis.join(', ');
  return perfis || '—';
}

function perfilPrincipal(perfis) {
  return Array.isArray(perfis) && perfis.length > 0 ? perfis[0] : '';
}

function normalizarForm(utilizador) {
  const perfil = perfilPrincipal(utilizador?.perfis) || 'Consultor';
  return {
    nome: utilizador?.nome || '',
    email: utilizador?.email || '',
    password: '',
    perfil,
    id_service_line: utilizador?.id_service_line ? String(utilizador.id_service_line) : '',
    id_area: utilizador?.id_area ? String(utilizador.id_area) : '',
    ativo: utilizador?.ativo !== 0,
    forcar_alteracao_password: true,
    enviar_email_confirmacao: true,
  };
}

function prepararPayload(form, incluirPassword = false) {
  const payload = {
    nome: form.nome.trim(),
    email: form.email.trim(),
    perfis: [form.perfil],
    ativo: form.ativo,
    id_area: form.perfil === 'Consultor' && form.id_area ? Number(form.id_area) : null,
    id_service_line: form.perfil === 'Service Line' && form.id_service_line ? Number(form.id_service_line) : null,
    primeiro_login_pendente: form.forcar_alteracao_password,
    enviar_email_confirmacao: form.enviar_email_confirmacao,
  };

  if (incluirPassword) payload.password = form.password;
  return payload;
}

function dadosUtilizadores(utilizadores) {
  const headers = ['Nome', 'Email', 'Perfil', 'Service Line', 'Área', 'Data Registo', 'Estado', 'Último Login'];
  const linhas = utilizadores.map((u) => [
    u.nome,
    u.email,
    perfisComoTexto(u.perfis),
    u.nome_service_line || '',
    u.nome_area || '',
    formatarData(u.created_at),
    u.ativo ? 'Ativo' : 'Inativo',
    formatarDataHora(u.ultimo_login),
  ]);
  return { headers, linhas };
}

function Modal({ titulo, children, onFechar, icon, iconTone = 'blue', size = 'md' }) {
  const sizeClass = size === 'sm' ? 'max-w-xl' : 'max-w-2xl';
  const iconClass = {
    amber: 'bg-amber-100 text-amber-600',
    rose: 'bg-rose-100 text-red-600',
    blue: 'bg-softinsa-100 text-softinsa-700',
  }[iconTone];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
      <div className={`w-full ${sizeClass} overflow-hidden rounded-[28px] bg-white shadow-xl`}>
        <div className="flex items-center justify-between border-b-4 border-slate-200 px-7 py-5">
          <div className="flex items-center gap-4">
            {icon && (
              <div className={`flex h-14 w-14 items-center justify-center rounded-full ${iconClass}`}>
                <Icon nome={icon} className="h-8 w-8" />
              </div>
            )}
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">{titulo}</h2>
          </div>
          <button type="button" onClick={onFechar} className="rounded-md p-2 text-slate-500 hover:bg-slate-100">
            <Icon nome="x" className="h-9 w-9" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormUtilizador({ form, setForm, serviceLines, areas, modo, onSubmit, onCancelar, loading }) {
  const areasFiltradas = useMemo(() => {
    if (!form.id_service_line) return areas;
    return areas.filter((a) => String(a.id_service_line) === String(form.id_service_line));
  }, [areas, form.id_service_line]);

  function atualizar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="space-y-5 px-7 py-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">Nome completo<span className="text-red-600">*</span></label>
          <input className="input" required placeholder="Digite o nome completo" value={form.nome} onChange={(e) => atualizar('nome', e.target.value)} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">Email<span className="text-red-600">*</span></label>
          <input className="input" type="email" required placeholder="email@softinsa.pt" value={form.email} onChange={(e) => atualizar('email', e.target.value)} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">Perfil<span className="text-red-600">*</span></label>
          <select className="input" required value={form.perfil} onChange={(e) => setForm((atual) => ({ ...atual, perfil: e.target.value, id_area: '', id_service_line: '' }))}>
            <option value="">Selecione um perfil</option>
            {PERFIS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        {(form.perfil === 'Consultor' || form.perfil === 'Service Line') && (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">Sevice Line<span className="text-red-600">*</span></label>
            <select className="input" value={form.id_service_line} onChange={(e) => setForm((atual) => ({ ...atual, id_service_line: e.target.value, id_area: '' }))}>
              <option value="">Selecionar</option>
              {serviceLines.map((sl) => <option key={sl.id_service_line} value={sl.id_service_line}>{sl.nome}</option>)}
            </select>
          </div>
        )}
        {form.perfil === 'Consultor' && (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">Área<span className="text-red-600">*</span></label>
            <select className="input" value={form.id_area} onChange={(e) => atualizar('id_area', e.target.value)}>
              <option value="">Selecionar</option>
              {areasFiltradas.map((area) => <option key={area.id_area} value={area.id_area}>{area.nome}</option>)}
            </select>
          </div>
        )}
        <div>
          <div className="mb-3 text-sm font-medium text-slate-900">Estado</div>
          <div className="flex gap-4 text-base text-slate-700">
            <label className="flex items-center gap-2">
              <input type="radio" className="h-4 w-4 text-softinsa-600" checked={form.ativo} onChange={() => atualizar('ativo', true)} />
              Ativo
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" className="h-4 w-4 text-softinsa-600" checked={!form.ativo} onChange={() => atualizar('ativo', false)} />
              Inativo
            </label>
          </div>
        </div>
      </div>
      {modo === 'criar' && (
        <div className="space-y-2 border-t-4 border-slate-200 px-7 py-4">
          <label className="flex items-start gap-2 text-sm font-semibold text-slate-900">
            <input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300 text-softinsa-600" checked={form.forcar_alteracao_password} onChange={(e) => atualizar('forcar_alteracao_password', e.target.checked)} />
            <span>
              Forçar alteração password no primeiro login
              <span className="block text-xs font-normal text-slate-500">O utilizador será obrigado a alterar a password no primeiro acesso</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm font-semibold text-slate-900">
            <input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300 text-softinsa-600" checked={form.enviar_email_confirmacao} onChange={(e) => atualizar('enviar_email_confirmacao', e.target.checked)} />
            <span>
              Enviar email automático de confirmação
              <span className="block text-xs font-normal text-slate-500">Será enviado um email com as credenciais de acesso</span>
            </span>
          </label>
        </div>
      )}
      <div className="flex justify-end gap-3 border-t-4 border-slate-200 px-7 py-5">
        <button type="button" className="btn-secondary" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="btn-primary min-w-44" disabled={loading}>
          {loading ? 'A guardar...' : modo === 'criar' ? 'Criar Utilizador' : 'Atualizar Utilizador'}
        </button>
      </div>
    </form>
  );
}

export default function AdminUtilizadores() {
  const qc = useQueryClient();
  const [filtros, setFiltros] = useState({ pesquisa: '', perfil: '', id_service_line: '', ativo: '' });
  const [pagina, setPagina] = useState(1);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(ESTADO_INICIAL);

  const utilizadores = useQuery({
    queryKey: ['admin', 'utilizadores', filtros, pagina],
    queryFn: async () => (await api.get('/api/utilizadores', {
      params: {
        pagina,
        por_pagina: 5,
        pesquisa: filtros.pesquisa || undefined,
        perfil: filtros.perfil || undefined,
        id_service_line: filtros.id_service_line || undefined,
        ativo: filtros.ativo || undefined,
      },
    })).data,
  });

  const serviceLines = useQuery({
    queryKey: ['admin', 'service-lines'],
    queryFn: async () => (await api.get('/api/service-lines')).data,
  });

  const areas = useQuery({
    queryKey: ['admin', 'areas'],
    queryFn: async () => (await api.get('/api/areas')).data,
  });

  const criar = useMutation({
    mutationFn: async () => (await api.post('/api/utilizadores', prepararPayload(form, true))).data,
    onSuccess: () => {
      toast.success('Utilizador criado.');
      setModal(null);
      qc.invalidateQueries({ queryKey: ['admin', 'utilizadores'] });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const atualizar = useMutation({
    mutationFn: async () => (await api.put(`/api/utilizadores/${modal.utilizador.id_utilizador}`, prepararPayload(form))).data,
    onSuccess: () => {
      toast.success('Utilizador atualizado.');
      setModal(null);
      qc.invalidateQueries({ queryKey: ['admin', 'utilizadores'] });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const alternarEstado = useMutation({
    mutationFn: async (u) => (await api.put(`/api/utilizadores/${u.id_utilizador}`, { ativo: !u.ativo })).data,
    onSuccess: () => {
      toast.success('Estado atualizado.');
      qc.invalidateQueries({ queryKey: ['admin', 'utilizadores'] });
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const reporPassword = useMutation({
    mutationFn: async () => (await api.post(`/api/utilizadores/${modal.utilizador.id_utilizador}/repor-password`)).data,
    onSuccess: () => {
      toast.success('Password reposta. Email de instruções preparado.');
      setModal(null);
    },
    onError: (err) => toast.error(extrairErro(err)),
  });

  const lista = utilizadores.data?.dados || [];
  const total = utilizadores.data?.total || 0;
  const porPagina = utilizadores.data?.por_pagina || 5;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const linhasMostradas = lista.length;

  function abrirCriacao() {
    setForm(ESTADO_INICIAL);
    setModal({ tipo: 'criar' });
  }

  function abrirEdicao(utilizador) {
    setForm(normalizarForm(utilizador));
    setModal({ tipo: 'editar', utilizador });
  }

  function limparFiltros() {
    setFiltros({ pesquisa: '', perfil: '', id_service_line: '', ativo: '' });
    setPagina(1);
  }

  const carregando = utilizadores.isLoading || serviceLines.isLoading || areas.isLoading;
  const sls = serviceLines.data?.dados || [];
  const listaAreas = areas.data?.dados || [];

  async function obterTodosFiltrados() {
    const paramsBase = {
      pesquisa: filtros.pesquisa || undefined,
      perfil: filtros.perfil || undefined,
      id_service_line: filtros.id_service_line || undefined,
      ativo: filtros.ativo || undefined,
      por_pagina: 100,
    };
    const primeira = (await api.get('/api/utilizadores', { params: { ...paramsBase, pagina: 1 } })).data;
    const todos = [...(primeira.dados || [])];
    const totalPaginasExport = Math.ceil((primeira.total || 0) / (primeira.por_pagina || 100));

    for (let p = 2; p <= totalPaginasExport; p += 1) {
      const resposta = (await api.get('/api/utilizadores', { params: { ...paramsBase, pagina: p } })).data;
      todos.push(...(resposta.dados || []));
    }

    return todos;
  }

  async function exportarExcel() {
    try {
      const todos = await obterTodosFiltrados();
      const { headers, linhas } = dadosUtilizadores(todos);
      descarregarCsv('utilizadores.csv', headers, linhas);
    } catch (err) {
      toast.error(extrairErro(err, 'Não foi possível exportar os utilizadores.'));
    }
  }

  async function exportarPdf() {
    try {
      const todos = await obterTodosFiltrados();
      const { headers, linhas } = dadosUtilizadores(todos);
      imprimirTabela('Gestão de Utilizadores', headers, linhas);
    } catch (err) {
      toast.error(extrairErro(err, 'Não foi possível preparar o PDF.'));
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <h1 className="text-2xl font-bold text-slate-900">Gestão de Utilizadores</h1>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-secondary" onClick={exportarExcel}>
            <Icon nome="file" className="h-4 w-4" /> Exportar Excel
          </button>
          <button type="button" className="btn-secondary" onClick={exportarPdf}>
            <Icon nome="file" className="h-4 w-4" /> Exportar PDF
          </button>
          <button type="button" className="btn-primary" onClick={abrirCriacao}>Criar Utilizador</button>
        </div>
      </header>

      <section className="rounded-lg bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_200px_220px_200px_200px]">
          <label className="relative block">
            <Icon nome="search" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-10"
              placeholder="Pesquisar utilizador"
              value={filtros.pesquisa}
              onChange={(e) => { setFiltros((f) => ({ ...f, pesquisa: e.target.value })); setPagina(1); }}
            />
          </label>
          <select className="input" value={filtros.perfil} onChange={(e) => { setFiltros((f) => ({ ...f, perfil: e.target.value })); setPagina(1); }}>
            <option value="">Perfil (Todos)</option>
            {PERFIS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className="input" value={filtros.id_service_line} onChange={(e) => { setFiltros((f) => ({ ...f, id_service_line: e.target.value })); setPagina(1); }}>
            <option value="">Service line (Todas)</option>
            {sls.map((sl) => <option key={sl.id_service_line} value={sl.id_service_line}>{sl.nome}</option>)}
          </select>
          <select className="input" value={filtros.ativo} onChange={(e) => { setFiltros((f) => ({ ...f, ativo: e.target.value })); setPagina(1); }}>
            <option value="">Estado (Todos)</option>
            <option value="1">Ativo</option>
            <option value="0">Inativo</option>
          </select>
          <button type="button" className="btn-secondary border-softinsa-600 text-softinsa-700" onClick={limparFiltros}>
            <Icon nome="x" className="h-4 w-4" /> Limpar Filtros
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1320px] w-full text-sm">
            <thead className="bg-slate-50 text-xs font-bold text-slate-600">
              <tr>
                <th className="px-5 py-4 text-left">Nome</th>
                <th className="px-5 py-4 text-left">Email</th>
                <th className="px-5 py-4 text-left">Perfil</th>
                <th className="px-5 py-4 text-left">Service Line</th>
                <th className="px-5 py-4 text-left">Área</th>
                <th className="px-5 py-4 text-left">Data Registo</th>
                <th className="px-5 py-4 text-left">Estado</th>
                <th className="px-5 py-4 text-left">Último Login</th>
                <th className="px-5 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {carregando ? (
                <tr><td colSpan={9} className="px-5 py-12 text-center text-slate-500">A carregar utilizadores...</td></tr>
              ) : lista.map((u) => (
                <tr key={u.id_utilizador} className="text-slate-700">
                  <td className="px-5 py-4 font-medium text-slate-800">{u.nome}</td>
                  <td className="px-5 py-4 text-slate-500">{u.email}</td>
                  <td className="px-5 py-4">{perfisComoTexto(u.perfis)}</td>
                  <td className="px-5 py-4 text-slate-500">{u.nome_service_line || '—'}</td>
                  <td className="px-5 py-4 text-slate-500">{u.nome_area || '—'}</td>
                  <td className="px-5 py-4 text-slate-500">{formatarData(u.created_at)}</td>
                  <td className="px-5 py-4">
                    <span className={`badge-pill ${u.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-500">{formatarDataHora(u.ultimo_login)}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-4 text-softinsa-700">
                      <button type="button" className="rounded-md p-1 hover:bg-blue-50" title="Ver" onClick={() => setModal({ tipo: 'ver', utilizador: u })}><Icon nome="eye" className="h-5 w-5" /></button>
                      <button type="button" className="rounded-md p-1 hover:bg-blue-50" title="Editar" onClick={() => abrirEdicao(u)}><Icon nome="edit" className="h-5 w-5" /></button>
                      <button type="button" className="rounded-md p-1 hover:bg-blue-50" title={u.ativo ? 'Desativar' : 'Ativar'} onClick={() => u.ativo ? setModal({ tipo: 'desativar', utilizador: u }) : alternarEstado.mutate(u)}><Icon nome="power" className="h-5 w-5" /></button>
                      <button type="button" className="rounded-md p-1 hover:bg-blue-50" title="Repor password" onClick={() => setModal({ tipo: 'password', utilizador: u })}><Icon nome="key" className="h-5 w-5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!carregando && lista.length === 0 && (
                <tr><td colSpan={9} className="px-5 py-12 text-center text-slate-500">Nenhum utilizador encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 px-5 py-4 text-sm text-slate-500 md:flex-row">
          <span>Mostrando {linhasMostradas ? ((pagina - 1) * porPagina) + 1 : 0} a {Math.min(pagina * porPagina, total)} de {total} utilizadores</span>
          <div className="flex items-center gap-2">
            <button className="btn-secondary disabled:opacity-50" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>Anterior</button>
            <span className="rounded-md bg-softinsa-600 px-4 py-2 font-semibold text-white">{pagina}</span>
            <button className="btn-secondary disabled:opacity-50" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>Próxima</button>
          </div>
        </footer>
      </section>

      {modal?.tipo === 'criar' && (
        <Modal titulo="Criar Utilizador" onFechar={() => setModal(null)}>
          <FormUtilizador
            form={form}
            setForm={setForm}
            serviceLines={sls}
            areas={listaAreas}
            modo="criar"
            onSubmit={(e) => { e.preventDefault(); criar.mutate(); }}
            onCancelar={() => setModal(null)}
            loading={criar.isPending}
          />
        </Modal>
      )}

      {modal?.tipo === 'editar' && (
        <Modal titulo="Editar Utilizador" onFechar={() => setModal(null)}>
          <FormUtilizador
            form={form}
            setForm={setForm}
            serviceLines={sls}
            areas={listaAreas}
            modo="editar"
            onSubmit={(e) => { e.preventDefault(); atualizar.mutate(); }}
            onCancelar={() => setModal(null)}
            loading={atualizar.isPending}
          />
        </Modal>
      )}

      {modal?.tipo === 'ver' && (
        <Modal titulo="Detalhe do Utilizador" onFechar={() => setModal(null)}>
          <div className="grid grid-cols-1 gap-4 px-6 py-5 text-sm md:grid-cols-2">
            <div><div className="text-slate-500">Nome</div><div className="font-semibold">{modal.utilizador.nome}</div></div>
            <div><div className="text-slate-500">Email</div><div className="font-semibold">{modal.utilizador.email}</div></div>
            <div><div className="text-slate-500">Perfil</div><div className="font-semibold">{perfisComoTexto(modal.utilizador.perfis)}</div></div>
            <div><div className="text-slate-500">Service Line</div><div className="font-semibold">{modal.utilizador.nome_service_line || '—'}</div></div>
            <div><div className="text-slate-500">Área</div><div className="font-semibold">{modal.utilizador.nome_area || '—'}</div></div>
            <div><div className="text-slate-500">Data Registo</div><div className="font-semibold">{formatarData(modal.utilizador.created_at)}</div></div>
            <div><div className="text-slate-500">Último Login</div><div className="font-semibold">{formatarDataHora(modal.utilizador.ultimo_login)}</div></div>
            <div><div className="text-slate-500">Estado</div><div className="font-semibold">{modal.utilizador.ativo ? 'Ativo' : 'Inativo'}</div></div>
          </div>
        </Modal>
      )}

      {modal?.tipo === 'password' && (
        <Modal titulo="Reset Password" icon="warning" iconTone="amber" size="sm" onFechar={() => setModal(null)}>
          <div className="px-7 py-6">
            <p className="text-base leading-7 text-slate-600">
              Tem a certeza de que pretende fazer o reset da password do utilizador “{modal.utilizador.nome}”? Será enviado um email com as instruções.
            </p>
          </div>
          <div className="flex justify-end gap-3 px-7 pb-6">
            <button type="button" className="btn-secondary px-6" onClick={() => setModal(null)}>Cancelar</button>
            <button type="button" className="btn bg-orange-500 px-7 text-white hover:bg-orange-600" disabled={reporPassword.isPending} onClick={() => reporPassword.mutate()}>
              {reporPassword.isPending ? 'A confirmar...' : 'Confirmar'}
            </button>
          </div>
        </Modal>
      )}

      {modal?.tipo === 'desativar' && (
        <Modal titulo="Desativar Utilizador" icon="warning" iconTone="rose" size="sm" onFechar={() => setModal(null)}>
          <div className="px-7 py-6">
            <p className="text-base leading-7 text-slate-600">
              Tem a certeza que pretende desativar o utilizador “{modal.utilizador.nome}”?
            </p>
          </div>
          <div className="flex justify-end gap-3 px-7 pb-6">
            <button type="button" className="btn-secondary px-6" onClick={() => setModal(null)}>Cancelar</button>
            <button
              type="button"
              className="btn bg-red-600 px-7 text-white hover:bg-red-700"
              disabled={alternarEstado.isPending}
              onClick={() => {
                alternarEstado.mutate(modal.utilizador, { onSuccess: () => setModal(null) });
              }}
            >
              {alternarEstado.isPending ? 'A eliminar...' : 'Eliminar'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
