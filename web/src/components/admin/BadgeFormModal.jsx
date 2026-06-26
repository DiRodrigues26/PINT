import { useMemo } from 'react';
import toast from 'react-hot-toast';
import { CalendarDays, Search, Plus, FileText } from 'lucide-react';
import UploadImagemAdmin from '../UploadImagemAdmin';
import Paginacao from './Paginacao';
import {
  CODIGOS_NIVEL,
  TIPOS_EVIDENCIA,
  tipoEvidenciaLabel,
  adicionarDias,
  descricaoCurta,
  dificuldade,
} from './BadgeHelpers';

const ICONES = {
  calendar: CalendarDays,
  search: Search,
  plus: Plus,
  file: FileText,
};

function Icon({ nome, className = 'h-5 w-5' }) {
  const Componente = ICONES[nome] || FileText;
  return <Componente className={className} aria-hidden="true" strokeWidth={1.8} />;
}

export default function FormBadge({
  form,
  setForm,
  learningPaths,
  serviceLines,
  areas,
  requisitos,
  niveis,
  filtros,
  badgeAtual,
  modo,
  onSubmit,
  onCancelar,
  loading,
  t,
}) {
  const serviceLinesDoForm = useMemo(() => {
    if (!form.id_learning_path) return serviceLines;
    return serviceLines.filter((sl) => String(sl.id_learning_path) === String(form.id_learning_path));
  }, [form.id_learning_path, serviceLines]);

  const areasDoForm = useMemo(() => {
    if (form.id_service_line) return areas.filter((area) => String(area.id_service_line) === String(form.id_service_line));
    if (form.id_learning_path) return areas.filter((area) => String(area.id_learning_path) === String(form.id_learning_path));
    return areas;
  }, [areas, form.id_learning_path, form.id_service_line]);

  const niveisDoForm = useMemo(() => {
    if (!form.id_area) return [];
    return niveis.filter((nivel) => String(nivel.id_area) === String(form.id_area));
  }, [form.id_area, niveis]);

  const requisitosFiltrados = useMemo(() => {
    const pesquisa = form.pesquisaRequisito.trim().toLowerCase();
    return requisitos.filter((req) => {
      const passaPesquisa = !pesquisa
        || req.titulo?.toLowerCase().includes(pesquisa)
        || req.descricao?.toLowerCase().includes(pesquisa);
      const passaNivel = !form.filtroNivelRequisito || req.codigo_nivel === form.filtroNivelRequisito;
      const passaTipo = !form.filtroTipoRequisito || req.tipo_evidencia === form.filtroTipoRequisito;
      return passaPesquisa && passaNivel && passaTipo;
    });
  }, [form.filtroNivelRequisito, form.filtroTipoRequisito, form.pesquisaRequisito, requisitos]);

  const requisitosPorPagina = 5;
  const totalPaginasRequisitos = Math.max(1, Math.ceil(requisitosFiltrados.length / requisitosPorPagina));
  const paginaRequisitosAtual = Math.min(form.paginaRequisitos || 1, totalPaginasRequisitos);
  const inicioRequisitos = (paginaRequisitosAtual - 1) * requisitosPorPagina;
  const requisitosVisiveis = requisitosFiltrados.slice(inicioRequisitos, inicioRequisitos + requisitosPorPagina);

  function atualizarFiltroRequisitos(campo, valor) {
    setForm((atual) => ({
      ...atual,
      [campo]: valor,
      paginaRequisitos: 1,
    }));
  }

  function mudarPaginaRequisitos(delta) {
    setForm((atual) => {
      const total = Math.max(1, Math.ceil(requisitosFiltrados.length / requisitosPorPagina));
      const proxima = Math.min(Math.max((atual.paginaRequisitos || 1) + delta, 1), total);
      return { ...atual, paginaRequisitos: proxima };
    });
  }

  function escolherNivelDoContexto({ codigo = form.codigo_nivel, idArea, idServiceLine, idLearningPath }) {
    const candidatos = niveis.filter((nivel) => {
      if (idArea) return String(nivel.id_area) === String(idArea);
      if (idServiceLine) return String(nivel.id_service_line) === String(idServiceLine);
      if (idLearningPath) return String(nivel.id_learning_path) === String(idLearningPath);
      return true;
    });
    return candidatos.find((nivel) => nivel.codigo_nivel === codigo) || candidatos[0] || null;
  }

  function atualizarHierarquia(campo, valor) {
    setForm((atual) => {
      const proximo = { ...atual, [campo]: valor };

      if (campo === 'id_learning_path') {
        proximo.id_service_line = '';
        proximo.id_area = '';
        proximo.id_nivel = '';
      }

      if (campo === 'id_service_line') {
        proximo.id_area = '';
        proximo.id_nivel = '';
        const serviceLine = serviceLines.find((sl) => String(sl.id_service_line) === String(valor));
        proximo.id_learning_path = serviceLine?.id_learning_path ? String(serviceLine.id_learning_path) : proximo.id_learning_path;
      }

      if (campo === 'id_area') {
        const area = areas.find((item) => String(item.id_area) === String(valor));
        if (area) {
          proximo.id_learning_path = String(area.id_learning_path);
          proximo.id_service_line = String(area.id_service_line);
        }
        const nivel = escolherNivelDoContexto({
          codigo: atual.codigo_nivel,
          idArea: valor,
          idServiceLine: proximo.id_service_line,
          idLearningPath: proximo.id_learning_path,
        });
        proximo.id_nivel = nivel ? String(nivel.id_nivel) : '';
        proximo.codigo_nivel = nivel?.codigo_nivel || atual.codigo_nivel;
      }

      if (campo === 'id_nivel') {
        const nivel = niveis.find((item) => String(item.id_nivel) === String(valor));
        if (nivel && String(nivel.id_area) === String(proximo.id_area)) {
          proximo.codigo_nivel = nivel.codigo_nivel;
        } else {
          proximo.id_nivel = '';
        }
      }

      return proximo;
    });
  }

  function alternarRequisito(id) {
    setForm((atual) => {
      const existe = atual.requisitos.includes(id);
      return {
        ...atual,
        requisitos: existe
          ? atual.requisitos.filter((item) => item !== id)
          : [...atual.requisitos, id],
      };
    });
  }

  function atualizarNovoRequisito(campo, valor) {
    setForm((atual) => ({
      ...atual,
      novoRequisito: { ...atual.novoRequisito, [campo]: valor },
    }));
  }

  function limparNovoRequisito() {
    setForm((atual) => ({
      ...atual,
      novoRequisito: {
        aberto: false,
        titulo: '',
        descricao: '',
        tipo_evidencia: 'Certificado',
        imagem_url: '',
      },
    }));
  }

  function adicionarNovoRequisito() {
    const novo = form.novoRequisito;
    if (!novo.titulo.trim()) {
      toast.error(t('admin_badges_erro_titulo_requisito'));
      return;
    }

    setForm((atual) => ({
      ...atual,
      requisitosNovos: [
        ...atual.requisitosNovos,
        {
          id_temporario: `novo-${Date.now()}`,
          titulo: novo.titulo.trim(),
          descricao: novo.descricao.trim(),
          tipo_evidencia: novo.tipo_evidencia,
          imagem_url: novo.imagem_url || null,
        },
      ],
      novoRequisito: {
        aberto: false,
        titulo: '',
        descricao: '',
        tipo_evidencia: 'Certificado',
        imagem_url: '',
      },
    }));
  }

  function removerNovoRequisito(idTemporario) {
    setForm((atual) => ({
      ...atual,
      requisitosNovos: atual.requisitosNovos.filter((req) => req.id_temporario !== idTemporario),
    }));
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="max-h-[72vh] space-y-6 overflow-y-auto px-7 py-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">
            {t('admin_badges_titulo_badge')}<span className="text-red-600">*</span>
          </label>
          <input
            className="input"
            required
            placeholder={t('admin_dash_col_badge')}
            value={form.titulo}
            onChange={(e) => setForm((atual) => ({ ...atual, text: e.target.value, titulo: e.target.value }))}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">{t('admin_lp_descricao')}</label>
          <textarea
            className="input min-h-24 resize-y"
            placeholder={t('admin_badges_placeholder_descricao')}
            value={form.descricao}
            onChange={(e) => setForm((atual) => ({ ...atual, descricao: e.target.value }))}
          />
        </div>

        <div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-900">
                {t('admin_rel_col_lp')}<span className="text-red-600">*</span>
              </label>
              <select
                className="input"
                required
                value={form.id_learning_path}
                onChange={(e) => atualizarHierarquia('id_learning_path', e.target.value)}
              >
                <option value="">{t('admin_sl_select_lp')}</option>
                {learningPaths.map((lp) => <option key={lp.id_learning_path} value={lp.id_learning_path}>{lp.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-900">
                {t('admin_dash_col_service_line')}<span className="text-red-600">*</span>
              </label>
              <select
                className="input"
                required
                value={form.id_service_line}
                onChange={(e) => atualizarHierarquia('id_service_line', e.target.value)}
              >
                <option value="">{t('admin_areas_select_sl')}</option>
                {serviceLinesDoForm.map((sl) => <option key={sl.id_service_line} value={sl.id_service_line}>{sl.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-900">
                {t('admin_rel_col_area')}<span className="text-red-600">*</span>
              </label>
              <select
                className="input"
                required
                value={form.id_area}
                onChange={(e) => atualizarHierarquia('id_area', e.target.value)}
              >
                <option value="">{t('admin_niveis_select_area')}</option>
                {areasDoForm.map((area) => <option key={area.id_area} value={area.id_area}>{area.nome}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">
            {t('admin_dash_level')}<span className="text-red-600">*</span>
          </label>
          <select
            className="input"
            required
            disabled={!form.id_area}
            value={form.id_nivel}
            onChange={(e) => atualizarHierarquia('id_nivel', e.target.value)}
          >
            <option value="">{form.id_area ? t('admin_badges_select_nivel_area') : t('admin_badges_select_area_primeiro')}</option>
            {niveisDoForm.map((nivel) => (
              <option key={nivel.id_nivel} value={nivel.id_nivel}>
                {nivel.codigo_nivel} - {nivel.nome_nivel}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">{t('admin_badges_pontos')}</label>
          <input
            type="number"
            min="0"
            className="input"
            value={form.pontos}
            onChange={(e) => setForm((atual) => ({ ...atual, pontos: e.target.value }))}
          />
        </div>

        <div>
          <label className="mb-3 block text-sm font-medium text-slate-900">
            {t('admin_badges_imagem')}<span className="text-red-600">*</span>
          </label>
          <UploadImagemAdmin
            contexto="badges"
            valor={form.imagem_url}
            className="mx-auto h-36 w-[90%]"
            onUpload={(url) => setForm((atual) => ({ ...atual, imagem_url: url }))}
          />
        </div>

        <div>
          <label className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-900">
            <input
              type="checkbox"
              className="h-4 w-4 rounded text-softinsa-600"
              checked={form.tem_expiracao}
              onChange={(e) => setForm((atual) => ({ ...atual, tem_expiracao: e.target.checked }))}
            />
            {t('admin_badges_data_expiracao')}
          </label>
          <div className="grid grid-cols-[140px_1fr] gap-5">
            <select
              className="input"
              disabled={!form.tem_expiracao}
              value={form.tipo_expiracao}
              onChange={(e) => setForm((atual) => ({
                ...atual,
                tipo_expiracao: e.target.value,
                valor_expiracao: atual.valor_expiracao || 30,
                data_expiracao: atual.data_expiracao || adicionarDias(new Date(), atual.valor_expiracao || 30),
              }))}
            >
              <option value="dias">{t('admin_badges_exp_dias')}</option>
              <option value="meses">{t('admin_badges_exp_meses')}</option>
              <option value="anos">{t('admin_badges_exp_anos')}</option>
              <option value="data">{t('admin_badges_exp_data')}</option>
            </select>
            {form.tipo_expiracao === 'data' ? (
              <label className="relative block">
                <Icon nome="calendar" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <input
                  type="date"
                  className="input pl-12"
                  disabled={!form.tem_expiracao}
                  value={form.data_expiracao}
                  onChange={(e) => setForm((atual) => ({ ...atual, data_expiracao: e.target.value }))}
                />
              </label>
            ) : (
              <input
                type="number"
                min="1"
                className="input"
                disabled={!form.tem_expiracao}
                value={form.valor_expiracao}
                onChange={(e) => setForm((atual) => ({
                  ...atual,
                  valor_expiracao: e.target.value,
                  validade_dias: e.target.value,
                }))}
              />
            )}
          </div>
        </div>

        {/* Conquista especial (ex.: certificações pagas) */}
        <div>
          <label className="flex items-start gap-2 text-sm font-medium text-slate-900">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded text-softinsa-600"
              checked={form.is_conquista_especial}
              onChange={(e) => setForm((atual) => ({ ...atual, is_conquista_especial: e.target.checked }))}
            />
            <span>
              {t('admin_badges_conquista_especial')}
              <span className="mt-0.5 block text-xs font-normal text-slate-500">{t('admin_badges_conquista_especial_ajuda')}</span>
            </span>
          </label>
        </div>

        {/* Competências certificadas (visíveis na página do badge) */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">{t('admin_badges_competencias')}</label>
          <textarea
            className="input min-h-[88px]"
            placeholder={t('admin_badges_competencias_ph')}
            value={form.competencias_certificadas}
            onChange={(e) => setForm((atual) => ({ ...atual, competencias_certificadas: e.target.value }))}
          />
        </div>

        {/* Benefícios */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-900">{t('admin_badges_beneficios')}</label>
          <textarea
            className="input min-h-[88px]"
            placeholder={t('admin_badges_beneficios_ph')}
            value={form.beneficios}
            onChange={(e) => setForm((atual) => ({ ...atual, beneficios: e.target.value }))}
          />
        </div>

        <div>
          <label className="mb-3 block text-sm font-medium text-slate-900">
            {t('admin_badges_requisitos')}<span className="text-red-600">*</span>
          </label>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_180px_220px]">
            <label className="relative block">
              <Icon nome="search" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-11"
                placeholder={t('admin_eventos_pesquisar_requisitos')}
                value={form.pesquisaRequisito}
                onChange={(e) => atualizarFiltroRequisitos('pesquisaRequisito', e.target.value)}
              />
            </label>
            <select className="input" value={form.filtroNivelRequisito} onChange={(e) => atualizarFiltroRequisitos('filtroNivelRequisito', e.target.value)}>
              <option value="">{t('admin_req_nivel_todos')}</option>
              {CODIGOS_NIVEL.map((codigo) => <option key={codigo} value={codigo}>{codigo}</option>)}
            </select>
            <select className="input" value={form.filtroTipoRequisito} onChange={(e) => atualizarFiltroRequisitos('filtroTipoRequisito', e.target.value)}>
              <option value="">{t('admin_req_tipo_todos')}</option>
              {TIPOS_EVIDENCIA.map((tipo) => <option key={tipo} value={tipo}>{tipoEvidenciaLabel(tipo, t)}</option>)}
            </select>
          </div>

          <div className="mt-1 overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-16 px-4 py-4 text-center"></th>
                  <th className="px-4 py-4 text-center">{t('admin_rel_col_titulo')}</th>
                  <th className="px-4 py-4 text-center">{t('admin_lp_descricao')}</th>
                  <th className="px-4 py-4 text-center">{t('admin_dash_level')}</th>
                  <th className="px-4 py-4 text-center">{t('admin_req_tipo_evidencia')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {requisitosVisiveis.map((req) => (
                  <tr key={req.id_requisito}>
                    <td className="px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded text-softinsa-600"
                        checked={form.requisitos.includes(req.id_requisito)}
                        onChange={() => alternarRequisito(req.id_requisito)}
                      />
                    </td>
                    <td className="px-4 py-4 text-center font-medium text-slate-800">{req.titulo}</td>
                    <td className="px-4 py-4 text-center text-slate-600" title={req.descricao || ''}>{descricaoCurta(req.descricao)}</td>
                    <td className="px-4 py-4 text-center text-slate-600">{dificuldade(req)}</td>
                    <td className="px-4 py-4 text-center text-slate-600">{tipoEvidenciaLabel(req.tipo_evidencia, t) || '—'}</td>
                  </tr>
                ))}
                {form.requisitosNovos.map((req) => (
                  <tr key={req.id_temporario} className="bg-blue-50/60">
                    <td className="px-4 py-4 text-center">
                      <input type="checkbox" className="h-4 w-4 rounded text-softinsa-600" checked readOnly />
                    </td>
                    <td className="px-4 py-4 text-center font-medium text-slate-800">{req.titulo}</td>
                    <td className="px-4 py-4 text-center text-slate-600" title={req.descricao || ''}>{descricaoCurta(req.descricao)}</td>
                    <td className="px-4 py-4 text-center text-slate-600">{form.codigo_nivel}</td>
                    <td className="px-4 py-4 text-center text-slate-600">
                      <button type="button" className="font-semibold text-red-600 hover:underline" onClick={() => removerNovoRequisito(req.id_temporario)}>
                        {t('admin_badges_remover')}
                      </button>
                    </td>
                  </tr>
                ))}
                {requisitosFiltrados.length === 0 && form.requisitosNovos.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">{t('admin_badges_sem_requisitos')}</td></tr>
                )}
              </tbody>
            </table>
            <Paginacao
              as="div"
              pagina={paginaRequisitosAtual}
              totalPaginas={totalPaginasRequisitos}
              total={requisitosFiltrados.length}
              porPagina={requisitosPorPagina}
              itensNaPagina={requisitosVisiveis.length}
              onMudarPagina={(novaPagina) => mudarPaginaRequisitos(novaPagina - paginaRequisitosAtual)}
              className="gap-3 px-6 py-3"
            >
              <button
                type="button"
                className="btn-primary"
                onClick={() => setForm((atual) => ({ ...atual, novoRequisito: { ...atual.novoRequisito, aberto: true } }))}
              >
                <Icon nome="plus" className="h-4 w-4" /> {t('admin_eventos_criar_requisito')}
              </button>
            </Paginacao>
          </div>

          {form.novoRequisito.aberto && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4 text-sm font-bold text-slate-900">{t('admin_badges_novo_requisito')}</div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">{t('admin_rel_col_titulo')}<span className="text-red-600">*</span></label>
                  <input
                    className="input bg-white"
                    value={form.novoRequisito.titulo}
                    onChange={(e) => atualizarNovoRequisito('titulo', e.target.value)}
                    placeholder={t('admin_req_placeholder_titulo')}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">{t('admin_req_tipo_evidencia')}</label>
                  <select
                    className="input bg-white"
                    value={form.novoRequisito.tipo_evidencia}
                    onChange={(e) => atualizarNovoRequisito('tipo_evidencia', e.target.value)}
                  >
                    {TIPOS_EVIDENCIA.map((tipo) => <option key={tipo} value={tipo}>{tipoEvidenciaLabel(tipo, t)}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-900">{t('admin_lp_descricao')}</label>
                  <textarea
                    className="input min-h-[84px] bg-white py-3"
                    value={form.novoRequisito.descricao}
                    onChange={(e) => atualizarNovoRequisito('descricao', e.target.value)}
                    placeholder={t('admin_badges_placeholder_evidencia')}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-900">{t('admin_req_imagem')}</label>
                  <UploadImagemAdmin
                    contexto="requisitos"
                    valor={form.novoRequisito.imagem_url}
                    onUpload={(url) => atualizarNovoRequisito('imagem_url', url)}
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-3">
                <button type="button" className="btn-secondary" onClick={limparNovoRequisito}>{t('admin_cancel')}</button>
                <button type="button" className="btn-primary" onClick={adicionarNovoRequisito}>{t('admin_badges_adicionar_badge')}</button>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="mb-3 text-sm font-medium text-slate-900">{t('admin_dash_col_state')}</div>
          <div className="flex gap-5 text-base text-slate-700">
            <label className="flex items-center gap-2">
              <input type="radio" className="h-4 w-4 text-softinsa-600" checked={form.ativo} onChange={() => setForm((atual) => ({ ...atual, ativo: true }))} />
              {t('admin_dash_notice_active')}
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" className="h-4 w-4 text-softinsa-600" checked={!form.ativo} onChange={() => setForm((atual) => ({ ...atual, ativo: false }))} />
              {t('admin_dash_notice_inactive')}
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t-4 border-slate-200 px-7 py-5">
        <button type="button" className="btn-secondary px-6" onClick={onCancelar}>{t('admin_cancel')}</button>
        <button type="submit" className="btn-primary min-w-36" disabled={loading}>
          {loading ? t('admin_lp_a_guardar') : modo === 'criar' ? t('admin_eventos_criar_badge') : t('admin_pontos_editar_badge')}
        </button>
      </div>
    </form>
  );
}
