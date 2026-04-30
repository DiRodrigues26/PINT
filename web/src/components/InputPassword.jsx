import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function InputPassword({
  id,
  value,
  onChange,
  placeholder = 'password',
  autoComplete = 'current-password',
  required = true,
  minLength,
  className = '',
}) {
  const [mostrar, setMostrar] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={mostrar ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        className={`input pr-10 ${className}`}
      />
      <button
        type="button"
        onClick={() => setMostrar((m) => !m)}
        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
        aria-label={mostrar ? 'Ocultar password' : 'Mostrar password'}
        tabIndex={-1}
      >
        {mostrar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
