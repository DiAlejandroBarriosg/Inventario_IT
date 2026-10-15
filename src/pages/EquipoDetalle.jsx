import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useDatos } from '../context/Datos';
import { useSesion } from '../context/Sesion';
import { SECCIONES, aplicaCampo, camposDeSeccion, camposFaltantes } from '../config/campos';
import { claseEstado, formatoFechaHora } from '../lib/formato';
import { LineaTiempo } from '../components/Historial';
import { ModalEliminar, ModalEstado, ModalTraslado } from '../components/AccionesEquipo';

export default function EquipoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { equipos, cargando, recargar } = useDatos();
  const { puedeEditar, esAdmin } = useSesion();
  const equipo = equipos.find((e) => e.id === id);

  const [historial, setHistorial] = useState(null);
  const [errorHistorial, setErrorHistorial] = useState('');
  const [clave, setClave] = useState(null);
  const [modal, setModal] = useState(null);

  const version = equipo ? equipo.actualizado_en : null;

  const cargarHistorial = useCallback(async () => {
    try {
      const r = await api.listarHistorial({ equipoId: id, porPagina: 200 });
      setHistorial(r.filas);
      setErrorHistorial('');
    } catch (e) {
      setErrorHistorial(e.message);
    }
  }, [id]);

  useEffect(() => { cargarHistorial(); }, [cargarHistorial, version]);
  useEffect(() => { setClave(null); }, [id, version]);

  async function terminarAccion() {
    setModal(null);
    await recargar();
  }

  async function verClave() {
    try {
      const valor = await api.obtenerSecreto(id);
      setClave(valor || '');
    } catch (e) {
      setClave('Error: ' + e.message);
    }
  }

  if (!equipo) {
    if (cargando) return <main className="pagina"><div className="cargando">Cargando equipo…</div></main>;
    return (
      <main className="pagina pagina-angosta">
        <Link className="volver" to="/">Volver a equipos</Link>
        <div className="caja">
          <h2>Este equipo no existe o fue eliminado</h2>
          <p>Si fue eliminado, su historial sigue disponible.</p>
          <Link className="btn" to={'/historial?equipo=' + id}>Ver historial del equipo</Link>
        </div>
      </main>
    );
  }

  const faltan = camposFaltantes(equipo);
  const lugar = [equipo.oficina_salon, equipo.edificio, equipo.nivel ? 'nivel ' + equipo.nivel : null].filter(Boolean).join(', ');

  return (
    <main className="pagina">
      <Link className="volver" to="/" onClick={(e) => {
        // Si se llegó desde la lista, regresa conservando búsqueda y filtros
        if (window.history.state && window.history.state.idx > 0) { e.preventDefault(); navigate(-1); }
      }}>Volver a equipos</Link>

      <div className="detalle">
        <div>
          <section className="etiqueta-activo" aria-label="Identificación del equipo">
            <div>
              <p className="nombre">{equipo.nombre_equipo || 'Sin nombre'}</p>
              <div className="serie"><span>Serie</span>{equipo.numero_serie}</div>
              <div className="lugar">
                {equipo.unidad || 'Sin unidad'}{equipo.encargado ? ', a cargo de ' + equipo.encargado : ''}
                {lugar && <><br />{lugar}</>}
              </div>
            </div>
            <div className="derecha">
              <span className={claseEstado(equipo.estado)}>{equipo.estado || 'Sin estado'}</span>
              {equipo.tipo_equipo && <span className="tipo">{equipo.tipo_equipo}</span>}
              <span className="tenue" style={{ fontSize: 12.5 }}>Actualizado {formatoFechaHora(equipo.actualizado_en)}</span>
            </div>
          </section>

          {(puedeEditar || esAdmin) && (
            <div className="acciones" style={{ marginBottom: 16 }}>
              <Link className="btn btn-primario" to={'/equipos/' + id + '/editar'}>Editar datos</Link>
              <button className="btn" type="button" onClick={() => setModal('traslado')}>Trasladar</button>
              <button className="btn" type="button" onClick={() => setModal('estado')}>Cambiar estado</button>
              {esAdmin && <button className="btn btn-peligro" type="button" onClick={() => setModal('eliminar')}>Eliminar</button>}
            </div>
          )}

          {faltan.length > 0 && (
            <div className="nota-faltan">
              Faltan {faltan.length} datos obligatorios: {faltan.map((c) => c.label).join(', ')}.
              {puedeEditar && <> <Link to={'/equipos/' + id + '/editar'}>Completarlos</Link></>}
            </div>
          )}

          {SECCIONES.map((seccion, i) => {
            const campos = camposDeSeccion(seccion.id).filter((c) => aplicaCampo(c, equipo) || equipo[c.key]);
            if (campos.length === 0) return null;
            return (
              <section key={seccion.id} className="ficha-seccion">
                <h2 className={i % 2 === 0 ? 'banda-azul' : 'banda-verde'}>{seccion.titulo}</h2>
                <dl>
                  {campos.map((campo) => {
                    if (campo.key === 'clave_windows') {
                      return (
                        <div key={campo.key}>
                          <dt>{campo.label}</dt>
                          <dd>
                            {!puedeEditar && <span className="tenue">Visible solo para editores y administradores</span>}
                            {puedeEditar && clave === null && <button className="btn btn-chico" type="button" onClick={verClave}>Mostrar clave</button>}
                            {puedeEditar && clave !== null && (clave ? <span className="mono">{clave}</span> : <span className="tenue">Sin registrar</span>)}
                          </dd>
                        </div>
                      );
                    }
                    const valor = equipo[campo.key];
                    const falta = !valor && faltan.includes(campo);
                    return (
                      <div key={campo.key}>
                        <dt>{campo.label}</dt>
                        <dd className={(campo.mono ? 'mono ' : '') + (falta ? 'falta' : valor ? '' : 'vacio-dato')}>
                          {valor || (falta ? 'Pendiente' : '—')}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </section>
            );
          })}
        </div>

        <aside className="panel-historial" aria-label="Historial de cambios">
          <h2>Historial de cambios</h2>
          <div className="lista">
            {errorHistorial && <div className="alerta alerta-error" style={{ marginTop: 12 }}>{errorHistorial}</div>}
            {historial === null && !errorHistorial && <p className="muted">Cargando…</p>}
            {historial && historial.length === 0 && <p className="muted">Sin cambios registrados.</p>}
            {historial && historial.length > 0 && <LineaTiempo entradas={historial} />}
          </div>
        </aside>
      </div>

      {modal === 'traslado' && <ModalTraslado equipo={equipo} alCerrar={() => setModal(null)} alTerminar={terminarAccion} />}
      {modal === 'estado' && <ModalEstado equipo={equipo} alCerrar={() => setModal(null)} alTerminar={terminarAccion} />}
      {modal === 'eliminar' && <ModalEliminar equipo={equipo} alCerrar={() => setModal(null)} alTerminar={async () => { setModal(null); await recargar(); navigate('/'); }} />}
    </main>
  );
}
