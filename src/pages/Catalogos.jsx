import { useState } from 'react';
import { api } from '../api';
import { useDatos } from '../context/Datos';
import { useAvisar } from '../context/Avisos';
import { TIPOS_CATALOGO } from '../config/campos';

export default function Catalogos() {
  const { catalogos, valoresUsados, recargar, opciones } = useDatos();
  const avisar = useAvisar();
  const [tipo, setTipo] = useState('unidad');
  const [nuevo, setNuevo] = useState('');
  const [extraNuevo, setExtraNuevo] = useState('');
  const [editando, setEditando] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const definicion = TIPOS_CATALOGO.find((t) => t.tipo === tipo);
  const items = catalogos.filter((c) => c.tipo === tipo).sort((a, b) => a.orden - b.orden || a.valor.localeCompare(b.valor, 'es'));
  const enCatalogo = new Set(items.map((c) => c.valor));
  const usados = valoresUsados[tipo] ? Array.from(valoresUsados[tipo].entries()) : [];
  const sinCatalogar = usados.filter(([valor]) => !enCatalogo.has(valor)).sort((a, b) => b[1] - a[1]);

  async function ejecutar(accion, mensaje) {
    setOcupado(true);
    try {
      await accion();
      await recargar();
      if (mensaje) avisar(mensaje);
    } catch (e) {
      avisar(e.message, 'error');
    } finally {
      setOcupado(false);
    }
  }

  function agregar(valor, extra) {
    const limpio = valor.trim();
    if (!limpio) return;
    const orden = items.length > 0 ? Math.max(...items.map((c) => c.orden)) + 1 : 1;
    ejecutar(() => api.guardarCatalogo({ tipo, valor: limpio, extra: extra || null, orden }), '«' + limpio + '» agregado.')
      .then(() => { setNuevo(''); setExtraNuevo(''); });
  }

  function mover(item, delta) {
    const indice = items.indexOf(item);
    const otro = items[indice + delta];
    if (!otro) return;
    ejecutar(async () => {
      await api.guardarCatalogo({ ...item, orden: otro.orden === item.orden ? item.orden + delta : otro.orden });
      await api.guardarCatalogo({ ...otro, orden: item.orden });
    });
  }

  return (
    <main className="pagina pagina-angosta">
      <div className="encabezado">
        <div>
          <h1>Catálogos</h1>
          <p>Las opciones de las listas desplegables del formulario y de la hoja «Listas» del Excel exportado.</p>
        </div>
      </div>

      <div className="pestanas" role="tablist">
        {TIPOS_CATALOGO.map((t) => (
          <button key={t.tipo} type="button" role="tab" aria-selected={tipo === t.tipo} className={tipo === t.tipo ? 'activo' : ''}
            onClick={() => { setTipo(t.tipo); setEditando(null); }}>
            {t.titulo}<span>{catalogos.filter((c) => c.tipo === t.tipo).length}</span>
          </button>
        ))}
      </div>

      <div className="caja">
        <form className="fila-agregar" onSubmit={(e) => { e.preventDefault(); agregar(nuevo, extraNuevo); }}>
          <div className="campo">
            <label htmlFor="nuevo-valor">Agregar a {definicion.titulo.toLowerCase()}</label>
            <input id="nuevo-valor" className="entrada" value={nuevo} onChange={(e) => setNuevo(e.target.value)} />
          </div>
          {definicion.extra && (
            <div className="campo" style={{ flex: '0 1 200px' }}>
              <label htmlFor="nuevo-extra">{definicion.extra}</label>
              <select id="nuevo-extra" className="seleccion" value={extraNuevo} onChange={(e) => setExtraNuevo(e.target.value)}>
                <option value="">Sin definir</option>
                {opciones('tipo_area').map((op) => <option key={op} value={op}>{op}</option>)}
              </select>
            </div>
          )}
          <button className="btn btn-primario" type="submit" disabled={ocupado || !nuevo.trim()}>Agregar</button>
        </form>
        {tipo === 'unidad' && <p className="muted" style={{ fontSize: 13, margin: '10px 0 0' }}>El tipo de área se llena solo en el formulario al elegir la unidad.</p>}
      </div>

      {sinCatalogar.length > 0 && (
        <div className="caja">
          <h2>En uso pero fuera del catálogo</h2>
          <p className="muted" style={{ fontSize: 14 }}>Valores que ya tienen equipos registrados. Agréguelos para que aparezcan en la lista, o corrija los equipos si están mal escritos.</p>
          <div className="chips">
            {sinCatalogar.map(([valor, n]) => (
              <button key={valor} type="button" className="chip-agregar" onClick={() => agregar(valor, null)} disabled={ocupado}>
                + {valor} <span className="tenue">({n})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="tabla-caja" style={{ maxHeight: 'none' }}>
        {items.length === 0 ? (
          <div className="vacio"><strong>Catálogo vacío</strong>Agregue el primer valor arriba.</div>
        ) : (
          <table className="tabla">
            <thead>
              <tr>
                <th>Valor</th>
                {definicion.extra && <th>{definicion.extra}</th>}
                <th className="num">Equipos</th>
                <th>Activo</th>
                <th><span className="oculto-visual">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const n = valoresUsados[tipo] ? valoresUsados[tipo].get(item.valor) || 0 : 0;
                const enEdicion = editando && editando.id === item.id;
                return (
                  <tr key={item.id} style={{ cursor: 'default' }}>
                    <td>
                      {enEdicion
                        ? <input className="entrada" value={editando.valor} onChange={(e) => setEditando({ ...editando, valor: e.target.value })} aria-label="Valor" />
                        : item.valor}
                    </td>
                    {definicion.extra && (
                      <td>
                        <select className="seleccion" value={item.extra || ''} aria-label={definicion.extra}
                          onChange={(e) => ejecutar(() => api.guardarCatalogo({ ...item, extra: e.target.value }))}>
                          <option value="">Sin definir</option>
                          {opciones('tipo_area').map((op) => <option key={op} value={op}>{op}</option>)}
                        </select>
                      </td>
                    )}
                    <td className="num">{n}</td>
                    <td>
                      <input type="checkbox" checked={item.activo} aria-label={'Activo: ' + item.valor}
                        onChange={(e) => ejecutar(() => api.guardarCatalogo({ ...item, activo: e.target.checked }))} />
                    </td>
                    <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                      {enEdicion ? (
                        <>
                          <button className="btn btn-chico btn-primario" type="button" disabled={ocupado}
                            onClick={() => ejecutar(() => api.guardarCatalogo({ ...item, valor: editando.valor.trim() }), 'Valor renombrado. Los equipos que usaban el nombre anterior no cambian.').then(() => setEditando(null))}>
                            Guardar
                          </button>{' '}
                          <button className="btn btn-chico" type="button" onClick={() => setEditando(null)}>Cancelar</button>
                        </>
                      ) : (
                        <>
                          <button className="btn btn-chico" type="button" onClick={() => mover(item, -1)} disabled={i === 0 || ocupado} aria-label="Subir">↑</button>{' '}
                          <button className="btn btn-chico" type="button" onClick={() => mover(item, 1)} disabled={i === items.length - 1 || ocupado} aria-label="Bajar">↓</button>{' '}
                          <button className="btn btn-chico" type="button" onClick={() => setEditando({ id: item.id, valor: item.valor })}>Renombrar</button>{' '}
                          <button className="btn btn-chico btn-peligro" type="button" disabled={ocupado}
                            onClick={() => {
                              const aviso = n > 0 ? ' ' + n + ' equipos lo usan; conservarán el valor, pero ya no estará en la lista.' : '';
                              if (window.confirm('¿Quitar «' + item.valor + '» del catálogo?' + aviso)) ejecutar(() => api.eliminarCatalogo(item.id), 'Quitado del catálogo.');
                            }}>
                            Quitar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
