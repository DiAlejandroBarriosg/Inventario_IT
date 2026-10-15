import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useDatos } from '../context/Datos';
import { ACCIONES } from '../config/campos';
import { LineaTiempo } from '../components/Historial';
import { plural } from '../lib/formato';

const POR_PAGINA = 50;

export default function Historial() {
  const { equipos } = useDatos();
  const [params, setParams] = useSearchParams();
  const [texto, setTexto] = useState(params.get('q') || '');
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');

  const equipoId = params.get('equipo') || '';
  const buscar = params.get('q') || '';
  const accion = params.get('accion') || '';
  const desde = params.get('desde') || '';
  const hasta = params.get('hasta') || '';
  const pagina = Number(params.get('pag') || 1);

  const existentes = useMemo(() => new Set(equipos.map((e) => e.id)), [equipos]);

  function cambiar(nombre, valor) {
    const nuevos = new URLSearchParams(params);
    if (valor) nuevos.set(nombre, valor);
    else nuevos.delete(nombre);
    if (nombre !== 'pag') nuevos.delete('pag');
    setParams(nuevos, { replace: true });
  }

  // Espera a que deje de escribir antes de consultar
  useEffect(() => {
    const t = setTimeout(() => { if (texto.trim() !== buscar) cambiar('q', texto.trim()); }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  useEffect(() => {
    let vigente = true;
    setDatos(null);
    api.listarHistorial({ equipoId, buscar, accion, desde, hasta, pagina, porPagina: POR_PAGINA })
      .then((r) => { if (vigente) { setDatos(r); setError(''); } })
      .catch((e) => { if (vigente) setError(e.message); });
    return () => { vigente = false; };
  }, [equipoId, buscar, accion, desde, hasta, pagina]);

  const totalPaginas = datos ? Math.max(1, Math.ceil(datos.total / POR_PAGINA)) : 1;

  return (
    <main className="pagina pagina-angosta">
      <div className="encabezado">
        <div>
          <h1>Historial de cambios</h1>
          <p>Cada alta, edición, traslado, cambio de estado, importación y eliminación, con quién la hizo y cuándo.</p>
        </div>
      </div>

      {equipoId && (
        <div className="alerta alerta-info">
          Mostrando solo un equipo. <button type="button" className="btn-link" onClick={() => cambiar('equipo', '')}>Ver todo el historial</button>
        </div>
      )}

      <div className="herramientas" style={{ gridTemplateColumns: 'minmax(220px, 2fr) repeat(3, minmax(140px, 1fr))' }}>
        <div>
          <label className="oculto-visual" htmlFor="h-buscar">Buscar</label>
          <input id="h-buscar" type="search" className="entrada" placeholder="Serie, nombre, usuario o motivo" value={texto} onChange={(e) => setTexto(e.target.value)} />
        </div>
        <div>
          <label className="oculto-visual" htmlFor="h-accion">Acción</label>
          <select id="h-accion" className="seleccion" value={accion} onChange={(e) => cambiar('accion', e.target.value)}>
            <option value="">Todas las acciones</option>
            {Object.keys(ACCIONES).map((a) => <option key={a} value={a}>{ACCIONES[a]}</option>)}
          </select>
        </div>
        <div>
          <label className="oculto-visual" htmlFor="h-desde">Desde</label>
          <input id="h-desde" type="date" className="entrada" value={desde} onChange={(e) => cambiar('desde', e.target.value)} title="Desde" />
        </div>
        <div>
          <label className="oculto-visual" htmlFor="h-hasta">Hasta</label>
          <input id="h-hasta" type="date" className="entrada" value={hasta} onChange={(e) => cambiar('hasta', e.target.value)} title="Hasta" />
        </div>
      </div>

      {error && <div className="alerta alerta-error">{error}</div>}

      <div className="caja">
        {!datos && !error && <p className="muted">Cargando…</p>}
        {datos && datos.filas.length === 0 && <div className="vacio"><strong>Sin movimientos</strong>No hay cambios con esos filtros.</div>}
        {datos && datos.filas.length > 0 && (
          <>
            <p className="muted" style={{ fontSize: 13.5 }}>{plural(datos.total, 'movimiento', 'movimientos')}</p>
            <LineaTiempo entradas={datos.filas} mostrarEquipo existentes={existentes} />
          </>
        )}
      </div>

      {totalPaginas > 1 && (
        <div className="paginacion">
          <span>Página {pagina} de {totalPaginas}</span>
          <button className="btn btn-chico" type="button" disabled={pagina <= 1} onClick={() => cambiar('pag', String(pagina - 1))}>Anterior</button>
          <button className="btn btn-chico" type="button" disabled={pagina >= totalPaginas} onClick={() => cambiar('pag', String(pagina + 1))}>Siguiente</button>
        </div>
      )}
    </main>
  );
}
