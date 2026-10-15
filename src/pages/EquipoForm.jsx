import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useDatos } from '../context/Datos';
import { useAvisar } from '../context/Avisos';
import { CAMPOS, SECCIONES, aplicaCampo, camposDeSeccion } from '../config/campos';
import { diferencias, normalizarEquipo, normalizarSerie, validarEquipo } from '../lib/normalizar';
import CampoEntrada from '../components/CampoEntrada';

function valoresVacios() {
  const valores = {};
  for (const campo of CAMPOS) valores[campo.key] = '';
  valores.estado = 'En uso';
  return valores;
}

export default function EquipoForm() {
  const { id } = useParams();
  const esNuevo = !id;
  const navigate = useNavigate();
  const avisar = useAvisar();
  const { equipos, cargando, recargar, opciones, sugerencias, tipoAreaDeUnidad } = useDatos();
  const original = esNuevo ? null : equipos.find((e) => e.id === id);

  const [valores, setValores] = useState(null);
  const [claveOriginal, setClaveOriginal] = useState('');
  const [motivo, setMotivo] = useState('');
  const [intentoGuardar, setIntentoGuardar] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState('');
  const [conflicto, setConflicto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [version, setVersion] = useState(null);

  // Carga inicial del formulario (una sola vez, para no pisar lo que el usuario escribe)
  useEffect(() => {
    if (valores) return;
    if (esNuevo) {
      setValores(valoresVacios());
      return;
    }
    if (!original) return;
    const inicial = valoresVacios();
    for (const campo of CAMPOS) inicial[campo.key] = original[campo.key] || '';
    setVersion(original.actualizado_en);
    api.obtenerSecreto(id).then((clave) => {
      inicial.clave_windows = clave || '';
      setClaveOriginal(clave || '');
      setValores(inicial);
    }).catch(() => setValores(inicial));
  }, [esNuevo, original, id, valores]);

  // Avisar antes de salir con cambios sin guardar
  const sucio = useMemo(() => {
    if (!valores) return false;
    if (esNuevo) return CAMPOS.some((c) => c.key !== 'estado' && valores[c.key] !== '');
    if (!original) return false;
    const base = { ...original, clave_windows: claveOriginal };
    return Object.keys(diferencias(normalizarEquipo(base), normalizarEquipo(valores))).length > 0;
  }, [valores, original, esNuevo, claveOriginal]);

  useEffect(() => {
    function antesDeSalir(e) {
      if (!sucio || guardando) return;
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', antesDeSalir);
    return () => window.removeEventListener('beforeunload', antesDeSalir);
  }, [sucio, guardando]);

  const { errores, avisos } = useMemo(() => {
    if (!valores) return { errores: {}, avisos: {} };
    const r = validarEquipo(valores);
    // Número de serie y nombre únicos
    const serie = normalizarSerie(valores.numero_serie);
    const nombre = (valores.nombre_equipo || '').trim().toUpperCase();
    for (const otro of equipos) {
      if (otro.id === id) continue;
      if (serie && otro.numero_serie === serie) r.errores.numero_serie = 'Ya existe: ' + (otro.nombre_equipo || otro.numero_serie) + '.';
      if (nombre && otro.nombre_equipo === nombre) r.errores.nombre_equipo = 'Ese nombre ya lo usa el equipo con serie ' + otro.numero_serie + '.';
    }
    return r;
  }, [valores, equipos, id]);

  if (!esNuevo && !original) {
    if (cargando) return <main className="pagina"><div className="cargando">Cargando equipo…</div></main>;
    return <main className="pagina pagina-angosta"><div className="caja"><h2>Este equipo no existe o fue eliminado</h2><Link to="/">Volver a equipos</Link></div></main>;
  }
  if (!valores) return <main className="pagina"><div className="cargando">Cargando…</div></main>;

  function cambiar(key, valor) {
    const nuevos = { ...valores, [key]: valor };
    // El tipo de área se hereda de la unidad si el catálogo lo tiene
    if (key === 'unidad') {
      const area = tipoAreaDeUnidad(valor);
      if (area) nuevos.tipo_area = area;
    }
    setValores(nuevos);
  }

  const numErrores = Object.keys(errores).length;
  const numAvisosObligatorios = Object.values(avisos).filter((a) => a.startsWith('Campo obligatorio')).length;

  async function guardar(e) {
    e.preventDefault();
    setIntentoGuardar(true);
    setErrorGeneral('');
    if (numErrores > 0) {
      const primero = document.querySelector('.con-error input, .con-error select, .con-error textarea');
      if (primero) primero.focus();
      return;
    }
    setGuardando(true);
    try {
      if (esNuevo) {
        const datos = normalizarEquipo(valores);
        const nuevoId = await api.crearEquipo(datos, motivo.trim());
        await recargar();
        avisar('Equipo ' + datos.numero_serie + ' agregado.');
        navigate('/equipos/' + nuevoId, { replace: true });
      } else {
        const base = { ...original, clave_windows: claveOriginal };
        const cambios = diferencias(normalizarEquipo(base), normalizarEquipo(valores));
        if (Object.keys(cambios).length === 0) {
          avisar('No hay cambios que guardar.');
          setGuardando(false);
          return;
        }
        await api.actualizarEquipo(id, cambios, { motivo: motivo.trim(), version });
        await recargar();
        avisar('Cambios guardados.');
        navigate('/equipos/' + id, { replace: true });
      }
    } catch (err) {
      setErrorGeneral(err.message);
      setConflicto(Boolean(err.conflicto));
      setGuardando(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async function recargarDesdeServidor() {
    await recargar();
    setValores(null);
    setConflicto(false);
    setErrorGeneral('');
  }

  const esMiniPC = valores.tipo_equipo === 'Mini PC';

  return (
    <main className="pagina pagina-angosta">
      <Link className="volver" to={esNuevo ? '/' : '/equipos/' + id}>{esNuevo ? 'Volver a equipos' : 'Volver al equipo'}</Link>
      <div className="encabezado">
        <div>
          <h1>{esNuevo ? 'Agregar equipo' : 'Editar ' + (original.nombre_equipo || original.numero_serie)}</h1>
          <p>Solo el número de serie es indispensable para guardar; los demás campos obligatorios se pueden completar después.</p>
        </div>
      </div>

      {errorGeneral && (
        <div className="alerta alerta-error">
          {errorGeneral}
          {conflicto && <> <button type="button" className="btn-link" onClick={recargarDesdeServidor}>Recargar el equipo</button> (perderá lo que escribió).</>}
        </div>
      )}

      <form onSubmit={guardar} noValidate>
        {SECCIONES.map((seccion, i) => {
          const campos = camposDeSeccion(seccion.id).filter((c) => !c.soloMiniPC || esMiniPC || valores[c.key]);
          return (
            <section key={seccion.id} className="seccion-form">
              <h2 className={i % 2 === 0 ? 'banda-azul' : 'banda-verde'}>{seccion.titulo}</h2>
              <div className="cuerpo">
                <div className="rejilla">
                  {campos.map((campo) => {
                    const filtro = campo.key === 'oficina_salon' && valores.edificio ? { key: 'edificio', valor: valores.edificio } : null;
                    return (
                      <CampoEntrada
                        key={campo.key}
                        campo={campo}
                        valor={valores[campo.key]}
                        alCambiar={(v) => cambiar(campo.key, v)}
                        opciones={campo.lista ? opciones(campo.lista) : null}
                        sugerencias={campo.sugerencias || campo.libre ? sugerencias(campo.key, filtro) : null}
                        requerido={campo.obligatorio === 'Sí' && aplicaCampo(campo, valores)}
                        error={errores[campo.key] && (intentoGuardar || valores[campo.key] !== '') ? errores[campo.key] : null}
                        aviso={intentoGuardar ? avisos[campo.key] : (avisos[campo.key] && !avisos[campo.key].startsWith('Campo obligatorio') ? avisos[campo.key] : null)}
                      />
                    );
                  })}
                </div>
                {seccion.id === 'red' && !esMiniPC && (
                  <p className="ayuda tenue" style={{ margin: '12px 0 0', fontSize: 12.5 }}>
                    Máscara, puerta de enlace, DNS y TeamViewer aparecen cuando el tipo de equipo es Mini PC.
                  </p>
                )}
              </div>
            </section>
          );
        })}

        {!esNuevo && (
          <div className="seccion-form">
            <div className="cuerpo">
              <div className="campo">
                <label htmlFor="motivo-edicion">Comentario para el historial (opcional)</label>
                <input id="motivo-edicion" className="entrada" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej.: revisión física en el salón, cambio de disco" />
              </div>
            </div>
          </div>
        )}

        <div className="pie-form">
          <span className="resumen">
            {numErrores > 0 && intentoGuardar
              ? 'Corrija ' + (numErrores === 1 ? 'el campo marcado en rojo' : 'los ' + numErrores + ' campos marcados en rojo') + ' para guardar.'
              : numAvisosObligatorios > 0
                ? 'Faltan ' + numAvisosObligatorios + ' campos obligatorios; puede guardar y completarlos después.'
                : 'Todos los campos obligatorios están llenos.'}
          </span>
          <div className="acciones">
            <Link className="btn" to={esNuevo ? '/' : '/equipos/' + id}>Cancelar</Link>
            <button className="btn btn-primario" type="submit" disabled={guardando}>
              {guardando ? 'Guardando…' : esNuevo ? 'Agregar equipo' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}
