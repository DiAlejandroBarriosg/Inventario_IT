import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import { LISTAS_BASE } from '../config/campos';

const DatosContexto = createContext(null);

export function DatosProveedor({ children }) {
  const [equipos, setEquipos] = useState([]);
  const [catalogos, setCatalogos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const temporizador = useRef(null);

  const recargar = useCallback(async () => {
    try {
      const [listaEquipos, listaCatalogos] = await Promise.all([api.listarEquipos(), api.listarCatalogos()]);
      setEquipos(listaEquipos);
      setCatalogos(listaCatalogos);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    recargar();
    // Cuando otra persona guarda, se recarga la lista (agrupando cambios seguidos)
    const dejar = api.suscribirCambios(() => {
      clearTimeout(temporizador.current);
      temporizador.current = setTimeout(recargar, 400);
    });
    return () => {
      clearTimeout(temporizador.current);
      dejar();
    };
  }, [recargar]);

  // Valores activos de un catálogo, en orden
  const opciones = useCallback((tipo) => {
    const lista = catalogos
      .filter((c) => c.tipo === tipo && c.activo)
      .sort((a, b) => a.orden - b.orden || a.valor.localeCompare(b.valor, 'es'))
      .map((c) => c.valor);
    if (lista.length === 0 && LISTAS_BASE[tipo]) return LISTAS_BASE[tipo];
    return lista;
  }, [catalogos]);

  // Valores distintos ya usados en el inventario para un campo (para autocompletar)
  const valoresUsados = useMemo(() => {
    const mapa = {};
    for (const equipo of equipos) {
      for (const key of Object.keys(equipo)) {
        const valor = equipo[key];
        if (typeof valor !== 'string' || valor === '') continue;
        if (!mapa[key]) mapa[key] = new Map();
        mapa[key].set(valor, (mapa[key].get(valor) || 0) + 1);
      }
    }
    return mapa;
  }, [equipos]);

  const sugerencias = useCallback((key, filtro) => {
    const conteo = valoresUsados[key];
    if (!conteo) return [];
    let valores = Array.from(conteo.keys());
    if (filtro) {
      valores = valores.filter((valor) => equipos.some((e) => e[key] === valor && e[filtro.key] === filtro.valor));
    }
    return valores.sort((a, b) => a.localeCompare(b, 'es'));
  }, [valoresUsados, equipos]);

  const tipoAreaDeUnidad = useCallback((unidad) => {
    const item = catalogos.find((c) => c.tipo === 'unidad' && c.valor === unidad);
    return item ? item.extra : null;
  }, [catalogos]);

  const valor = { equipos, catalogos, cargando, error, recargar, opciones, sugerencias, tipoAreaDeUnidad, valoresUsados };
  return <DatosContexto.Provider value={valor}>{children}</DatosContexto.Provider>;
}

export function useDatos() {
  return useContext(DatosContexto);
}
