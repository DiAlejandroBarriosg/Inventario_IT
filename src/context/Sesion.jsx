import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api';

const SesionContexto = createContext(null);

export function SesionProveedor({ children }) {
  const [sesion, setSesion] = useState(undefined); // undefined = todavía cargando
  const [perfil, setPerfil] = useState(null);

  const cargarPerfil = useCallback(async (sesionActual) => {
    if (!sesionActual) {
      setPerfil(null);
      return;
    }
    try {
      setPerfil(await api.miPerfil(sesionActual.user.id));
    } catch {
      setPerfil(null);
    }
  }, []);

  useEffect(() => {
    let activo = true;
    api.sesion().then(async (s) => {
      if (!activo) return;
      await cargarPerfil(s);
      setSesion(s || null);
    });
    const dejar = api.alCambiarSesion(async (s) => {
      await cargarPerfil(s);
      setSesion(s || null);
    });
    return () => {
      activo = false;
      dejar();
    };
  }, [cargarPerfil]);

  const rol = perfil ? perfil.rol : null;
  const valor = {
    sesion,
    perfil,
    rol,
    puedeLeer: rol === 'lector' || rol === 'editor' || rol === 'admin',
    puedeEditar: rol === 'editor' || rol === 'admin',
    esAdmin: rol === 'admin',
    recargarPerfil: () => cargarPerfil(sesion),
  };

  return <SesionContexto.Provider value={valor}>{children}</SesionContexto.Provider>;
}

export function useSesion() {
  return useContext(SesionContexto);
}
