import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useSesion } from '../context/Sesion';
import { useAvisar } from '../context/Avisos';
import { formatoFecha } from '../lib/formato';

const ROLES = [
  { valor: 'pendiente', titulo: 'Pendiente', descripcion: 'Sin acceso hasta que se le asigne un rol.' },
  { valor: 'lector', titulo: 'Consulta', descripcion: 'Busca, ve el historial y exporta. No ve claves de Windows.' },
  { valor: 'editor', titulo: 'Editor', descripcion: 'Agrega, edita, traslada e importa equipos.' },
  { valor: 'admin', titulo: 'Administrador', descripcion: 'Todo lo anterior, más eliminar equipos, catálogos y usuarios.' },
];

export default function Usuarios() {
  const { perfil } = useSesion();
  const avisar = useAvisar();
  const [perfiles, setPerfiles] = useState(null);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      setPerfiles(await api.listarPerfiles());
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function cambiarRol(usuario, rol) {
    try {
      await api.cambiarRol(usuario.id, rol);
      avisar((usuario.nombre || usuario.correo) + ' ahora es ' + ROLES.find((r) => r.valor === rol).titulo.toLowerCase() + '.');
      cargar();
    } catch (e) {
      avisar(e.message, 'error');
    }
  }

  const pendientes = perfiles ? perfiles.filter((p) => p.rol === 'pendiente').length : 0;

  return (
    <main className="pagina pagina-angosta">
      <div className="encabezado">
        <div>
          <h1>Usuarios</h1>
          <p>Las personas crean su cuenta desde la pantalla de inicio; aquí se les da acceso.</p>
        </div>
      </div>

      {error && <div className="alerta alerta-error">{error}</div>}
      {pendientes > 0 && <div className="alerta alerta-aviso">{pendientes === 1 ? 'Una persona espera' : pendientes + ' personas esperan'} aprobación.</div>}

      <div className="tabla-caja" style={{ maxHeight: 'none' }}>
        <table className="tabla">
          <thead>
            <tr><th>Nombre</th><th>Correo</th><th>Rol</th><th className="ocultar-movil">Desde</th></tr>
          </thead>
          <tbody>
            {(perfiles || []).map((p) => (
              <tr key={p.id} style={{ cursor: 'default' }}>
                <td>{p.nombre}</td>
                <td>{p.correo}</td>
                <td>
                  <select className="seleccion" value={p.rol} aria-label={'Rol de ' + p.nombre}
                    disabled={perfil && p.id === perfil.id}
                    onChange={(e) => cambiarRol(p, e.target.value)}>
                    {ROLES.map((r) => <option key={r.valor} value={r.valor}>{r.titulo}</option>)}
                  </select>
                </td>
                <td className="ocultar-movil muted">{formatoFecha(p.creado_en)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="caja" style={{ marginTop: 16 }}>
        <h2>Qué puede hacer cada rol</h2>
        <dl style={{ margin: 0, display: 'grid', gap: 8 }}>
          {ROLES.map((r) => (
            <div key={r.valor}><dt style={{ fontWeight: 700, display: 'inline' }}>{r.titulo}: </dt><dd style={{ display: 'inline', margin: 0 }}>{r.descripcion}</dd></div>
          ))}
        </dl>
      </div>
    </main>
  );
}
