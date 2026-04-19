import { useState } from 'react';

export default function InputPassword({ id, value, onChange, placeholder = 'password', autoComplete = 'current-password', required = true, minLength }) {
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
        className="input pr-10"
      />
      <button
        type="button"
        onClick={() => setMostrar((m) => !m)}
        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
        aria-label={mostrar ? 'Ocultar password' : 'Mostrar password'}
        tabIndex={-1}
      >
        {mostrar ? (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17.94 17.94A10.06 10.06 0 0 1 12 20c-7 0-11-8-11-8a19.77 19.77 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a19.65 19.65 0 0 1-3.22 4.19M14.12 14.12a3 3 0 1 1-4.24-4.24" />
            <path d="M1 1l22 22" />
          </svg>
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
