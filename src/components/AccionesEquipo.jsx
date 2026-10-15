import { useState } from 'react';
import Modal from './Modal';
import CampoEntrada from './CampoEntrada';
import { api } from '../api';
import { useDatos } from '../context/Datos';
import { useAvisar } from '../context/Avisos';
import { CAMPO_POR_KEY, CAMPOS_TRASLADO } from '../config/campos';
import { diferencias, normalizarEquipo } from '../lib/normalizar';

const ESTADOS_CON_MOTIVO = ['De baja', 'Para desecho', 'No localizado', 'En reparación'];

function Motivo({ valor, alCambiar, requerido, ayuda }) {
  return (
    <div className="campo ancho-total" style={{ marginTop: 14 }}>
      <label htmlFor="motivo">Motivo{requerido && <span className="req">*</span>}</label>
      <textarea id="motivo" className="area" style={{ minHeight: 64 }} value={valor} onChange={(e) => alCambiar(e.target.value)} />
      <span className="ayuda">{ayuda || 'Queda guardado en el historial del equipo.'}</span>
    </div>
  );
}

function manejarError(e, avisar, setError) {
  setError(e.message);
  if (!e.conflicto) avisar(e.message, 'error');
}

// ---------------- Trasladar ----------------
export function ModalTraslado({ equipo, alCerrar, alTerminar }) {
  const { opciones, sugerencias, tipoAreaDeUnidad } = useDatos();
  const avisar = useAvisar();
  const inicial = {};
  for (const key of CAMPOS_TRASLADO) inicial[key] = equipo[key] || '';
  const [valores, setValores] = useState(inicial);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  function cambiar(key, valor) {
    const nuevos = { ...valores, [key]: valor };
    if (key === 'unidad') {
      const area = tipoAreaDeUnidad(valor);
      if (area) nuevos.tipo_area = area;
    }
    setValores(nuevos);
  }

  const cambios = diferencias(normalizarEquipo(equipo), normalizarEquipo(valores));
  const llaves = Object.keys(cambios);

  async function guardar() {
    if (llaves.length === 0) { setError('No cambió ningún dato de ubicación o asignación.'); return; }
    if (motivo.trim() === '') { setError('Escriba el motivo del traslado.'); return; }
    setGuardando(true);
    setError('');
    try {
      await api.actualizarEquipo(equipo.id, cambios, { accion: 'TRASLADO', motivo: motivo.trim(), version: equipo.actualizado_en });
      avisar('Traslado registrado.');
      alTerminar();
    } catch (e) {
      manejarError(e, avisar, setError);
      setGuardando(false);
    }
  }

  return (
    <Modal
      ancho
      titulo={'Trasladar ' + (equipo.nombre_equipo || equipo.numero_serie)}
      descripcion="Cambie la unidad, el encargado o la ubicación. El traslado queda en el historial con su motivo."
      alCerrar={alCerrar}
      pie={<>
        <button className="btn" type="button" onClick={alCerrar}>Cancelar</button>
        <button className="btn btn-primario" type="button" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Registrar traslado'}</button>
      </>}
    >
      {error && <div className="alerta alerta-error">{error}</div>}
      <div className="rejilla">
        {CAMPOS_TRASLADO.map((key) => {
          const campo = CAMPO_POR_KEY[key];
          const filtro = key === 'oficina_salon' && valores.edificio ? { key: 'edificio', valor: valores.edificio } : null;
          return (
            <CampoEntrada
              key={key}
              campo={campo}
              valor={valores[key]}
              alCambiar={(v) => cambiar(key, v)}
              opciones={campo.lista ? opciones(campo.lista) : null}
              sugerencias={campo.sugerencias || campo.libre ? sugerencias(key, filtro) : null}
              mostrarAyuda={false}
            />
          );
        })}
      </div>
      <Motivo valor={motivo} alCambiar={setMotivo} requerido ayuda="Por ejemplo: reasignado a nuevo catedrático, cambio de oficina, préstamo temporal." />
      {llaves.length > 0 && (
        <div className="vista-previa">
          <h3>Se registrará este cambio</h3>
          {llaves.map((key) => (
            <div key={key}>
              {CAMPO_POR_KEY[key].label}: <del className="tenue">{equipo[key] || 'vacío'}</del> → <b>{cambios[key] || 'vacío'}</b>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ---------------- Cambiar estado ----------------
export function ModalEstado({ equipo, alCerrar, alTerminar }) {
  const { opciones } = useDatos();
  const avisar = useAvisar();
  const [estado, setEstado] = useState(equipo.estado || '');
  const [pendiente, setPendiente] = useState(equipo.pendiente || '');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const motivoRequerido = ESTADOS_CON_MOTIVO.includes(estado);

  async function guardar() {
    const cambios = diferencias(normalizarEquipo(equipo), normalizarEquipo({ estado, pendiente }));
    if (Object.keys(cambios).length === 0) { setError('Elija un estado distinto o cambie el pendiente.'); return; }
    if (motivoRequerido && motivo.trim() === '') { setError('Para «' + estado + '» escriba el motivo.'); return; }
    setGuardando(true);
    setError('');
    try {
      await api.actualizarEquipo(equipo.id, cambios, { accion: 'CAMBIO_ESTADO', motivo: motivo.trim(), version: equipo.actualizado_en });
      avisar('Estado actualizado a «' + estado + '».');
      alTerminar();
    } catch (e) {
      manejarError(e, avisar, setError);
      setGuardando(false);
    }
  }

  return (
    <Modal
      titulo="Cambiar estado"
      descripcion={'Estado actual: ' + (equipo.estado || 'sin estado')}
      alCerrar={alCerrar}
      pie={<>
        <button className="btn" type="button" onClick={alCerrar}>Cancelar</button>
        <button className="btn btn-primario" type="button" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar estado'}</button>
      </>}
    >
      {error && <div className="alerta alerta-error">{error}</div>}
      <div className="rejilla">
        <CampoEntrada campo={CAMPO_POR_KEY.estado} valor={estado} alCambiar={setEstado} opciones={opciones('estado')} />
        <CampoEntrada campo={CAMPO_POR_KEY.pendiente} valor={pendiente} alCambiar={setPendiente} />
      </div>
      <Motivo valor={motivo} alCambiar={setMotivo} requerido={motivoRequerido} />
    </Modal>
  );
}

// ---------------- Eliminar ----------------
export function ModalEliminar({ equipo, alCerrar, alTerminar }) {
  const avisar = useAvisar();
  const [confirmacion, setConfirmacion] = useState('');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const coincide = confirmacion.trim().toUpperCase() === equipo.numero_serie;

  async function eliminar() {
    if (motivo.trim() === '') { setError('Escriba el motivo de la eliminación.'); return; }
    setGuardando(true);
    try {
      await api.eliminarEquipo(equipo.id, motivo.trim());
      avisar('Equipo ' + equipo.numero_serie + ' eliminado.');
      alTerminar();
    } catch (e) {
      manejarError(e, avisar, setError);
      setGuardando(false);
    }
  }

  return (
    <Modal
      titulo="Eliminar equipo"
      descripcion="El registro sale del inventario, pero su historial se conserva. Si el equipo solo dejó de usarse, cambie su estado a «De baja» en lugar de eliminarlo."
      alCerrar={alCerrar}
      pie={<>
        <button className="btn" type="button" onClick={alCerrar}>Cancelar</button>
        <button className="btn btn-peligro-lleno" type="button" onClick={eliminar} disabled={!coincide || guardando}>{guardando ? 'Eliminando…' : 'Eliminar equipo'}</button>
      </>}
    >
      {error && <div className="alerta alerta-error">{error}</div>}
      <div className="campo">
        <label htmlFor="confirmar-serie">Escriba el número de serie <span className="mono">{equipo.numero_serie}</span> para confirmar</label>
        <input id="confirmar-serie" className="entrada mono" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} autoComplete="off" />
      </div>
      <Motivo valor={motivo} alCambiar={setMotivo} requerido ayuda="Por ejemplo: registro duplicado, ingresado por error." />
    </Modal>
  );
}
