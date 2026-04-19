import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Carregando from './Carregando';

export default function RotaProtegida({ children, perfis }) {
  const { utilizador, carregando, temPerfil } = useAuth();
  const location = useLocation();

  if (carregando) return <Carregando />;
  if (!utilizador) return <Navigate to="/login" replace state={{ from: location }} />;
  if (perfis && !temPerfil(...perfis)) {
    return (
      <div className="max-w-xl mx-auto mt-20 card">
        <div className="card-body">
          <h2 className="text-lg font-semibold text-rose-600">Acesso negado</h2>
          <p className="text-sm text-slate-600 mt-2">Não tem permissões para aceder a esta página.</p>
        </div>
      </div>
    );
  }
  return children;
}
