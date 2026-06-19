import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Carregando from './Carregando';

export default function RotaProtegida({ children, perfis }) {
  const { utilizador, carregando, temPerfil } = useAuth();
  const location = useLocation();

  if (carregando) return <Carregando />;
  if (!utilizador) return <Navigate to="/login" replace state={{ from: location }} />;
  if (utilizador.primeiro_login_pendente && location.pathname !== '/alterar-password-inicial') {
    return <Navigate to="/alterar-password-inicial" replace />;
  }
  if (perfis && !temPerfil(...perfis)) {
    return <Navigate to="/" replace />;
  }
  return children;
}
