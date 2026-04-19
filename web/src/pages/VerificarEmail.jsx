import { Link, useLocation } from 'react-router-dom';
import SplitLayout from '../components/SplitLayout';

export default function VerificarEmail() {
  const location = useLocation();
  const email = location.state?.email;

  return (
    <SplitLayout>
      <div className="space-y-5">
        <div>
          <div className="w-14 h-14 rounded-full bg-softinsa-50 text-softinsa-500 flex items-center justify-center text-2xl">📧</div>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Verifica o teu email</h1>
        <p className="text-sm text-slate-600">
          Enviámos um link de confirmação {email ? <>para <span className="font-semibold">{email}</span></> : null}.
          Clica no link para continuar o registo.
        </p>
        <p className="text-xs text-slate-500">
          Não chegou? Verifica a pasta de spam ou regista-te com outro email.
        </p>
        <div className="pt-2">
          <Link to="/login" className="link text-sm">← Voltar ao login</Link>
        </div>
      </div>
    </SplitLayout>
  );
}
