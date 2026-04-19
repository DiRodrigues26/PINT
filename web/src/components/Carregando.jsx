export default function Carregando({ texto = 'A carregar…' }) {
  return (
    <div className="flex items-center justify-center py-12 text-slate-500">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-softinsa-500 border-t-transparent mr-3" />
      <span className="text-sm">{texto}</span>
    </div>
  );
}
