import { api } from '../api';
import { useSesion } from '../context/Sesion';

export default function Pendiente() {
  const { perfil, recargarPerfil } = useSesion();
  return (
    <div className="pagina pagina-angosta">
      <div className="caja" style={{ marginTop: '10vh' }}>
        <h2>Su cuenta espera aprobación</h2>
        <p>
          {perfil ? <>Entró como <b>{perfil.correo}</b>. </> : null}
          Un administrador del inventario debe asignarle un rol antes de que pueda ver los equipos.
        </p>
        <div className="acciones">
          <button className="btn btn-primario" type="button" onClick={recargarPerfil}>Ya me dieron acceso</button>
          <button className="btn" type="button" onClick={() => api.cerrarSesion()}>Salir</button>
        </div>
      </div>
    </div>
  );
}
