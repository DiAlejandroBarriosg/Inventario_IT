import { Link } from 'react-router-dom';
import { ACCIONES, CAMPO_POR_KEY } from '../config/campos';
import { formatoFechaHora } from '../lib/formato';

function Valor({ v }) {
  if (v === null || v === undefined || v === '') return <span className="tenue">vacío</span>;
  return <>{String(v)}</>;
}

export function ListaCambios({ cambios, compacta }) {
  const llaves = Object.keys(cambios || {});
  if (llaves.length === 0) return null;
  const esCreacion = llaves.every((k) => cambios[k].antes === null);
  const esEliminacion = llaves.every((k) => cambios[k].despues === null);

  // En creaciones y eliminaciones solo se resume, para no llenar la pantalla
  if (compacta && (esCreacion || esEliminacion) && llaves.length > 4) {
    return <p className="muted" style={{ margin: '6px 0 0', fontSize: 13 }}>{llaves.length} campos {esCreacion ? 'registrados' : 'eliminados'}.</p>;
  }

  return (
    <dl className="cambios">
      {llaves.map((key) => {
        const campo = CAMPO_POR_KEY[key];
        const { antes, despues } = cambios[key];
        return (
          <div className="c" key={key}>
            <dt>{campo ? campo.label : key}</dt>
            <dd>
              {esCreacion ? <ins><Valor v={despues} /></ins> : (
                <>
                  <del><Valor v={antes} /></del>
                  <span className="flecha" aria-label="cambió a">→</span>
                  <ins><Valor v={despues} /></ins>
                </>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

export function LineaTiempo({ entradas, mostrarEquipo, existentes }) {
  return (
    <ol className="linea-tiempo">
      {entradas.map((h) => (
        <li key={h.id} className={'accion-' + h.accion}>
          <div className="cabecera">
            <span className="accion">{ACCIONES[h.accion] || h.accion}</span>
            {mostrarEquipo && (
              existentes && existentes.has(h.equipo_id)
                ? <Link className="mono" to={'/equipos/' + h.equipo_id}>{h.nombre_equipo || h.numero_serie}</Link>
                : <span className="mono">{h.nombre_equipo || h.numero_serie}</span>
            )}
            <span className="fecha">{formatoFechaHora(h.fecha)}</span>
            <span className="quien">{h.usuario_nombre || 'Sistema'}</span>
          </div>
          {h.motivo && <div className="motivo">{h.motivo}</div>}
          <ListaCambios cambios={h.cambios} compacta />
        </li>
      ))}
    </ol>
  );
}
