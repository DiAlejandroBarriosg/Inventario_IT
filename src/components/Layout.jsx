import { NavLink, Outlet, Link } from 'react-router-dom';
import { api, esDemo } from '../api';
import { useSesion } from '../context/Sesion';

const NOMBRES_ROL = { admin: 'Administrador', editor: 'Editor', lector: 'Consulta', pendiente: 'Pendiente' };

export default function Layout() {
  const { perfil, esAdmin, puedeEditar } = useSesion();
  const clase = ({ isActive }) => (isActive ? 'activo' : undefined);

  function reiniciar() {
    if (window.confirm('¿Borrar los datos de prueba y volver a los ejemplos iniciales?')) api.reiniciarDemo();
  }

  return (
    <>
      <header className="barra">
        <div className="barra-interna">
          <Link to="/" className="marca">
            <strong>Inventario TI</strong>
            <span>CETA, UFM</span>
          </Link>
          <nav className="nav" aria-label="Principal">
            <NavLink to="/" end className={clase}>Equipos</NavLink>
            <NavLink to="/historial" className={clase}>Historial</NavLink>
            {puedeEditar && <NavLink to="/importar" className={clase}>Importar</NavLink>}
            {esAdmin && <NavLink to="/catalogos" className={clase}>Catálogos</NavLink>}
            {esAdmin && <NavLink to="/usuarios" className={clase}>Usuarios</NavLink>}
          </nav>
          <div className="usuario">
            <span>{perfil ? perfil.nombre : ''}</span>
            {perfil && <span className="rol">{NOMBRES_ROL[perfil.rol]}</span>}
            <button type="button" onClick={() => api.cerrarSesion()}>Salir</button>
          </div>
        </div>
      </header>
      {esDemo && (
        <div className="franja-demo">
          Modo demostración: los datos se guardan solo en este navegador. Configure Supabase para usarlo en equipo.
          <button type="button" onClick={reiniciar}>Reiniciar datos de prueba</button>
        </div>
      )}
      <Outlet />
    </>
  );
}
