import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Upload } from 'lucide-react';
import { api, extrairErro } from '../lib/api';

export default function UploadImagemAdmin({
  contexto,
  valor,
  onUpload,
  className = 'mx-auto h-36 w-[84%]',
}) {
  const inputRef = useRef(null);
  const [aCarregar, setACarregar] = useState(false);

  async function carregar(e) {
    const ficheiro = e.target.files?.[0];
    if (!ficheiro) return;

    const formData = new FormData();
    formData.append('ficheiro', ficheiro);
    formData.append('contexto', contexto || 'admin');

    setACarregar(true);
    try {
      const { data } = await api.post('/api/ficheiros/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = data.ficheiro?.url || data.ficheiro?.secure_url;
      onUpload?.(url, data.ficheiro);
      toast.success('Imagem carregada.');
    } catch (err) {
      toast.error(extrairErro(err, 'Não foi possível carregar a imagem.'));
    } finally {
      setACarregar(false);
      e.target.value = '';
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/png,image/jpeg,image/jpg,image/webp,video/webm"
        onChange={carregar}
      />
      <button
        type="button"
        className={`${className} flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-center transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70`}
        onClick={() => inputRef.current?.click()}
        disabled={aCarregar}
      >
        {valor ? (
          <img src={valor} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <Upload className="h-9 w-9 text-slate-900" strokeWidth={1.8} />
        )}
        <span className="mt-3 text-sm text-slate-400">PNG, JPEG, JPG, WEBP ou WEBM (máx. 5MB)</span>
        <span className="mt-2 text-sm font-medium text-slate-900">
          {aCarregar ? 'A carregar...' : valor ? 'Trocar imagem' : 'Clique para fazer upload'}
        </span>
      </button>
      {valor && <div className="mx-auto mt-2 max-w-[84%] truncate text-xs text-slate-400">{valor}</div>}
    </div>
  );
}
