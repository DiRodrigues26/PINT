import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Paginacao({
  pagina = 1,
  totalPaginas = 1,
  total = 0,
  porPagina = 0,
  itensNaPagina = 0,
  onMudarPagina,
  rotulo = 'resultados',
  className = '',
  as: Elemento = 'footer',
  comBorda = true,
  children = null,
}) {
  const totalSeguro = Math.max(0, Number(total) || 0);
  const totalPaginasSeguro = Math.max(1, Number(totalPaginas) || 1);
  const paginaAtual = Math.min(Math.max(Number(pagina) || 1, 1), totalPaginasSeguro);
  const quantidadeAtual = Math.max(0, Number(itensNaPagina) || 0);
  const totalParaMostrar = Math.max(totalSeguro, quantidadeAtual);
  const porPaginaSeguro = Math.max(1, Number(porPagina) || quantidadeAtual || 1);
  const inicio = quantidadeAtual > 0 ? ((paginaAtual - 1) * porPaginaSeguro) + 1 : 0;
  const fim = quantidadeAtual > 0 ? Math.min(inicio + quantidadeAtual - 1, totalParaMostrar) : 0;

  function mudarPagina(novaPagina) {
    if (!onMudarPagina) return;
    onMudarPagina(Math.min(Math.max(novaPagina, 1), totalPaginasSeguro));
  }

  return (
    <Elemento className={`flex flex-col items-center justify-between gap-4 ${comBorda ? 'border-t border-slate-200' : ''} px-6 py-4 text-sm text-slate-500 md:flex-row ${className}`.trim()}>
      <span>A mostrar {inicio} a {fim} de {totalParaMostrar} {rotulo}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="btn-secondary h-10 w-10 px-0 disabled:opacity-40"
          disabled={paginaAtual <= 1}
          onClick={() => mudarPagina(paginaAtual - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" strokeWidth={1.8} />
        </button>
        <span className="font-semibold text-slate-700">Página {paginaAtual} de {totalPaginasSeguro}</span>
        <button
          type="button"
          className="btn-secondary h-10 w-10 px-0 disabled:opacity-40"
          disabled={paginaAtual >= totalPaginasSeguro}
          onClick={() => mudarPagina(paginaAtual + 1)}
          aria-label="Página seguinte"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" strokeWidth={1.8} />
        </button>
      </div>
      {children}
    </Elemento>
  );
}
