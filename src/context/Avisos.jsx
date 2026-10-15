import { createContext, useCallback, useContext, useState } from 'react';

const AvisosContexto = createContext(null);

export function AvisosProveedor({ children }) {
  const [avisos, setAvisos] = useState([]);

  const avisar = useCallback((texto, tipo = 'ok') => {
    const id = Date.now() + Math.random();
    setAvisos((lista) => [...lista, { id, texto, tipo }]);
    setTimeout(() => setAvisos((lista) => lista.filter((a) => a.id !== id)), tipo === 'error' ? 7000 : 3500);
  }, []);

  return (
    <AvisosContexto.Provider value={avisar}>
      {children}
      <div className="avisos" role="status" aria-live="polite">
        {avisos.map((a) => (
          <div key={a.id} className={'aviso aviso-' + a.tipo}>{a.texto}</div>
        ))}
      </div>
    </AvisosContexto.Provider>
  );
}

export function useAvisar() {
  return useContext(AvisosContexto);
}
