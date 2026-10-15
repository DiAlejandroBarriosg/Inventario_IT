import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useDatos } from '../context/Datos';
import { useSesion } from '../context/Sesion';
import { useAvisar } from '../context/Avisos';
import { CAMPOS, SECCIONES, camposFaltantes } from '../config/campos';
import { sinAcentos, textoBusqueda, textoBusquedaCompacto } from '../lib/normalizar';
import { claseEstado, hace, plural } from '../lib/formato';
import { descargarBlob, generarExcel, nombreArchivoExport } from '../lib/excel';

const POR_PAGINA = 100;

const COLUMNAS_RESUMEN = [
  { key: 'nombre_equipo', titulo: 'Equipo' },
  { key: 'tipo_equipo', titulo: 'Tipo' },
  { key: 'unidad', titulo: 'Unidad' },
  { key: 'encargado', titulo: 'Encargado' },
  { key: 'oficina_salon', titulo: 'Ubicación' },
  { key: 'estado', titulo: 'Estado' },
  { key: 'faltantes', titulo: 'Datos' },
  { key: 'actualizado_en', titulo: 'Actualizado' },
];

const FILTROS = [
  { param: 'unidad', key: 'unidad', titulo: 'Unidad', lista: 'unidad' },
  { param: 'edificio', key: 'edificio', titulo: 'Edificio', lista: 'edificio' },
  { param: 'tipo', key: 'tipo_equipo', titulo: 'Tipo', lista: 'tipo_equipo' },
  { param: 'categoria', key: 'categoria_uso', titulo: 'Categoría', lista: 'categoria_uso' },
];

function IconoBuscar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export default function Inventario() {
  const { equipos, cargando, error, opciones, valoresUsados } = useDatos();
  const { puedeEditar } = useSesion();
  const avisar = useAvisar();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [exportando, setExportando] = useState(false);

  const q = params.get('q') || '';
  const estadoFiltro = params.get('estado') || '';
  const completitud = params.get('datos') || '';
  const orden = params.get('orden') || 'nombre_equipo';
  const dir = params.get('dir') || 'asc';
  const vista = params.get('vista') || 'resumen';
  const pagina = Number(params.get('pag') || 1);

  function cambiar(nombre, valor) {
    const nuevos = new URLSearchParams(params);
    if (valor) nuevos.set(nombre, valor);
    else nuevos.delete(nombre);
    if (nombre !== 'pag') nuevos.delete('pag');
    setParams(nuevos, { replace: true });
  }

  // Índice de búsqueda: se arma una sola vez por cada recarga de datos
  const indice = useMemo(() => equipos.map((e) => {
    const texto = textoBusqueda(e);
    return { e, texto, compacto: textoBusquedaCompacto(texto), faltan: camposFaltantes(e).length };
  }), [equipos]);

  const filtradosSinEstado = useMemo(() => {
    const palabras = sinAcentos(q.toLowerCase()).split(/\s+/).filter(Boolean);
    return indice.filter(({ e, texto, compacto, faltan }) => {
      for (const filtro of FILTROS) {
        const valor = params.get(filtro.param);
        if (valor && (e[filtro.key] || '') !== (valor === '(vacío)' ? '' : valor)) return false;
      }
      if (completitud === 'incompletos' && faltan === 0) return false;
      if (completitud === 'completos' && faltan > 0) return false;
      for (const palabra of palabras) {
        if (texto.includes(palabra)) continue;
        const compacta = textoBusquedaCompacto(palabra);
        if (compacta.length >= 4 && compacto.includes(compacta)) continue;
        return false;
      }
      return true;
    });
  }, [indice, q, params, completitud]);

  const conteoEstados = useMemo(() => {
    const conteo = {};
    for (const { e } of filtradosSinEstado) {
      const estado = e.estado || '(sin estado)';
      conteo[estado] = (conteo[estado] || 0) + 1;
    }
    return conteo;
  }, [filtradosSinEstado]);

  const resultados = useMemo(() => {
    const lista = estadoFiltro ? filtradosSinEstado.filter(({ e }) => (e.estado || '(sin estado)') === estadoFiltro) : filtradosSinEstado.slice();
    const signo = dir === 'desc' ? -1 : 1;
    lista.sort((a, b) => {
      let va;
      let vb;
      if (orden === 'faltantes') {
        va = a.faltan;
        vb = b.faltan;
        return (va - vb) * signo;
      }
      va = a.e[orden] || '';
      vb = b.e[orden] || '';
      if (va === '' && vb !== '') return 1;
      if (vb === '' && va !== '') return -1;
      return String(va).localeCompare(String(vb), 'es', { numeric: true }) * signo;
    });
    return lista;
  }, [filtradosSinEstado, estadoFiltro, orden, dir]);

  const totalPaginas = Math.max(1, Math.ceil(resultados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = resultados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);
  const hayFiltros = q || estadoFiltro || completitud || FILTROS.some((f) => params.get(f.param));

  function ordenarPor(key) {
    const nuevos = new URLSearchParams(params);
    if (orden === key) nuevos.set('dir', dir === 'asc' ? 'desc' : 'asc');
    else {
      nuevos.set('orden', key);
      nuevos.set('dir', key === 'actualizado_en' || key === 'faltantes' ? 'desc' : 'asc');
    }
    setParams(nuevos, { replace: true });
  }

  function opcionesFiltro(filtro) {
    const valores = new Set(opciones(filtro.lista));
    const usados = valoresUsados[filtro.key];
    if (usados) for (const v of usados.keys()) valores.add(v);
    return Array.from(valores).sort((a, b) => a.localeCompare(b, 'es'));
  }

  async function exportar(todos) {
    setExportando(true);
    try {
      const lista = todos
        ? equipos.slice().sort((a, b) => (a.nombre_equipo || '~').localeCompare(b.nombre_equipo || '~', 'es', { numeric: true }))
        : resultados.map((r) => r.e);
      const secretos = puedeEditar ? await api.listarSecretos() : null;
      const blob = await generarExcel(lista, secretos, opciones);
      descargarBlob(blob, nombreArchivoExport());
      avisar('Excel exportado con ' + plural(lista.length, 'equipo', 'equipos') + '.');
    } catch (e) {
      avisar('No se pudo exportar: ' + e.message, 'error');
    } finally {
      setExportando(false);
    }
  }

  function flecha(key) {
    if (orden !== key) return null;
    return <span aria-hidden="true">{dir === 'asc' ? '↑' : '↓'}</span>;
  }

  return (
    <main className="pagina">
      <div className="encabezado">
        <div>
          <h1>Equipos</h1>
          <p>{cargando ? 'Cargando inventario…' : plural(equipos.length, 'equipo registrado', 'equipos registrados')}</p>
        </div>
        <div className="acciones">
          {hayFiltros && (
            <button className="btn" type="button" onClick={() => exportar(false)} disabled={exportando || resultados.length === 0}>
              Exportar {plural(resultados.length, 'resultado', 'resultados')}
            </button>
          )}
          <button className="btn" type="button" onClick={() => exportar(true)} disabled={exportando || equipos.length === 0}>
            {exportando ? 'Generando Excel…' : 'Exportar todo a Excel'}
          </button>
          {puedeEditar && <Link className="btn btn-primario" to="/equipos/nuevo">Agregar equipo</Link>}
        </div>
      </div>

      {error && <div className="alerta alerta-error">No se pudo cargar el inventario: {error}</div>}

      <div className="herramientas">
        <div className="buscador">
          <IconoBuscar />
          <label className="oculto-visual" htmlFor="buscar">Buscar</label>
          <input
            id="buscar"
            className="entrada"
            type="search"
            placeholder="Buscar por nombre, serie, MAC, IP, encargado, TeamViewer…"
            value={q}
            onChange={(e) => cambiar('q', e.target.value)}
            autoFocus
          />
        </div>
        {FILTROS.map((filtro) => (
          <div key={filtro.param}>
            <label className="oculto-visual" htmlFor={'f-' + filtro.param}>{filtro.titulo}</label>
            <select id={'f-' + filtro.param} className="seleccion" value={params.get(filtro.param) || ''} onChange={(e) => cambiar(filtro.param, e.target.value)}>
              <option value="">{filtro.titulo}: {filtro.param === 'tipo' || filtro.param === 'edificio' ? 'todos' : 'todas'}</option>
              {opcionesFiltro(filtro).map((op) => <option key={op} value={op}>{op}</option>)}
              <option value="(vacío)">Sin {filtro.titulo.toLowerCase()}</option>
            </select>
          </div>
        ))}
        <div>
          <label className="oculto-visual" htmlFor="f-datos">Datos</label>
          <select id="f-datos" className="seleccion" value={completitud} onChange={(e) => cambiar('datos', e.target.value)}>
            <option value="">Datos: todos</option>
            <option value="incompletos">Con datos pendientes</option>
            <option value="completos">Completos</option>
          </select>
        </div>
      </div>

      <div className="estados" role="group" aria-label="Filtrar por estado">
        <button type="button" className={'ficha' + (estadoFiltro === '' ? ' activa' : '')} onClick={() => cambiar('estado', '')}>
          Todos <b>{filtradosSinEstado.length}</b>
        </button>
        {Object.keys(conteoEstados).sort((a, b) => conteoEstados[b] - conteoEstados[a]).map((estado) => (
          <button key={estado} type="button" className={'ficha' + (estadoFiltro === estado ? ' activa' : '')} onClick={() => cambiar('estado', estadoFiltro === estado ? '' : estado)}>
            {estado} <b>{conteoEstados[estado]}</b>
          </button>
        ))}
        {hayFiltros && <button type="button" className="btn-link" style={{ marginLeft: 6, fontSize: 13 }} onClick={() => setParams({}, { replace: true })}>Quitar filtros</button>}
      </div>

      <div className="info-lista">
        <span>{plural(resultados.length, 'resultado', 'resultados')}</span>
        <div className="conmutador" role="group" aria-label="Vista">
          <button type="button" className={vista === 'resumen' ? 'activo' : ''} onClick={() => cambiar('vista', '')}>Resumen</button>
          <button type="button" className={vista === 'completa' ? 'activo' : ''} onClick={() => cambiar('vista', 'completa')}>Todas las columnas</button>
        </div>
      </div>

      <div className="tabla-caja">
        {!cargando && resultados.length === 0 ? (
          <div className="vacio">
            {equipos.length === 0 ? (
              <>
                <strong>Todavía no hay equipos</strong>
                {puedeEditar ? <>Agregue el primero o <Link to="/importar">importe el Excel actual</Link>.</> : 'Cuando el equipo de TI registre equipos aparecerán aquí.'}
              </>
            ) : (
              <>
                <strong>Ningún equipo coincide</strong>
                Revise la búsqueda o <button type="button" className="btn-link" onClick={() => setParams({}, { replace: true })}>quite los filtros</button>.
              </>
            )}
          </div>
        ) : vista === 'completa' ? (
          <TablaCompleta filas={visibles} alAbrir={(id) => navigate('/equipos/' + id)} />
        ) : (
          <table className="tabla">
            <thead>
              <tr>
                {COLUMNAS_RESUMEN.map((c) => (
                  <th key={c.key} aria-sort={orden === c.key ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={c.key === 'actualizado_en' || c.key === 'encargado' ? 'ocultar-movil' : undefined}>
                    <button type="button" onClick={() => ordenarPor(c.key)}>{c.titulo} {flecha(c.key)}</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibles.map(({ e, faltan }) => (
                <tr key={e.id} onClick={() => navigate('/equipos/' + e.id)}>
                  <td>
                    <Link to={'/equipos/' + e.id} className="mono" onClick={(ev) => ev.stopPropagation()}>{e.nombre_equipo || 'Sin nombre'}</Link>
                    <span className="sub mono">{e.numero_serie}</span>
                  </td>
                  <td>{e.tipo_equipo || <span className="tenue">—</span>}</td>
                  <td>{e.unidad || <span className="tenue">—</span>}<span className="sub">{e.oficina}</span></td>
                  <td className="ocultar-movil">{e.encargado || <span className="tenue">—</span>}</td>
                  <td>{e.oficina_salon || <span className="tenue">—</span>}<span className="sub">{e.edificio}{e.nivel ? ', nivel ' + e.nivel : ''}</span></td>
                  <td><span className={claseEstado(e.estado)}>{e.estado || 'Sin estado'}</span></td>
                  <td>{faltan > 0 ? <span className="faltan">Faltan {faltan}</span> : <span className="completo">Completo</span>}</td>
                  <td className="ocultar-movil muted" title={e.actualizado_en}>{hace(e.actualizado_en)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPaginas > 1 && (
        <div className="paginacion">
          <span>Página {paginaActual} de {totalPaginas}</span>
          <button className="btn btn-chico" type="button" disabled={paginaActual <= 1} onClick={() => cambiar('pag', String(paginaActual - 1))}>Anterior</button>
          <button className="btn btn-chico" type="button" disabled={paginaActual >= totalPaginas} onClick={() => cambiar('pag', String(paginaActual + 1))}>Siguiente</button>
        </div>
      )}
    </main>
  );
}

// Las 31 columnas del Excel (sin la clave de Windows) con las mismas bandas de sección
function TablaCompleta({ filas, alAbrir }) {
  const columnas = CAMPOS.filter((c) => c.key !== 'clave_windows');
  return (
    <table className="tabla tabla-completa">
      <thead>
        <tr className="secciones">
          {SECCIONES.map((s) => {
            const n = columnas.filter((c) => c.seccion === s.id).length;
            return <th key={s.id} colSpan={n} style={{ background: '#' + s.relleno }}>{s.titulo}</th>;
          })}
        </tr>
        <tr className="columnas">
          {columnas.map((c, i) => <th key={c.key} className={i === 0 ? 'fija' : undefined} style={i === 0 ? { background: 'var(--tinta)' } : undefined}>{c.label}</th>)}
        </tr>
      </thead>
      <tbody>
        {filas.map(({ e }) => (
          <tr key={e.id} onClick={() => alAbrir(e.id)}>
            {columnas.map((c, i) => (
              <td key={c.key} className={(i === 0 ? 'fija ' : '') + (c.mono ? 'mono' : '')} title={e[c.key] || ''}>
                {c.key === 'estado' ? <span className={claseEstado(e.estado)}>{e.estado || ''}</span> : e[c.key] || ''}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
