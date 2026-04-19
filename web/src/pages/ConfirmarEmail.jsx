import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, extrairErro } from '../lib/api';
import SplitLayout from '../components/SplitLayout';

export default function ConfirmarEmail() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [estado, setEstado] = useState('a-validar');
  const [erro, setErro] = useState('');

  useEffect(() => {
    async function validar() {
      try {
        const { data } = await api.post('/api/auth/confirmar-email', { token });
        if (data.requer_perfil) {
          navigate(`/completar-perfil/${token}`, { replace: true });
        } else {
          setEstado('ok');
          setTimeout(() => navigate('/login'), 1500);
        }
      } catch (err) {
        setErro(extrairErro(err, 'Não foi possível confirmar o email.'));
        setEstado('erro');
      }
    }
    if (token) validar();
  }, [token, navigate]);

  return (
    <SplitLayout>
      <div className="space-y-5">
        {estado === 'a-validar' && (
          <>
            <div className="h-10 w-10 rounded-full border-4 border-softinsa-500 border-t-transparent animate-spin" />
            <h1 className="text-2xl font-bold">A confirmar o teu email…</h1>
            <p className="text-sm text-slate-600">Aguarda um momento.</p>
          </>
        )}
        {estado === 'ok' && (
          <>
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl">✓</div>
            <h1 className="text-2xl font-bold">Email confirmado!</h1>
            <p className="text-sm text-slate-600">A redirecionar para o login…</p>
          </>
        )}
        {estado === 'erro' && (
          <>
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-2xl">✕</div>
            <h1 className="text-2xl font-bold">Ups!</h1>
            <p className="text-sm text-slate-600">{erro}</p>
            <Link to="/login" className="link text-sm">← Voltar ao login</Link>
          </>
        )}
      </div>
    </SplitLayout>
  );
}
