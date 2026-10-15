import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useSesion } from './context/Sesion';
import { DatosProveedor } from './context/Datos';
import Layout from './components/Layout';
import Acceso from './pages/Acceso';
import Pendiente from './pages/Pendiente';
import Inventario from './pages/Inventario';
import EquipoDetalle from './pages/EquipoDetalle';
import EquipoForm from './pages/EquipoForm';
import Historial from './pages/Historial';
import Importar from './pages/Importar';
import Catalogos from './pages/Catalogos';
import Usuarios from './pages/Usuarios';

export default function App() {
  const { sesion, perfil, puedeLeer, puedeEditar, esAdmin } = useSesion();

  if (sesion === undefined) return <div className="cargando">Cargando…</div>;
  if (!sesion) return <Acceso />;
  if (!perfil || !puedeLeer) return <Pendiente />;

  return (
    <DatosProveedor>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Inventario />} />
            <Route path="equipos/nuevo" element={puedeEditar ? <EquipoForm /> : <Navigate to="/" />} />
            <Route path="equipos/:id" element={<EquipoDetalle />} />
            <Route path="equipos/:id/editar" element={puedeEditar ? <EquipoForm /> : <Navigate to="/" />} />
            <Route path="historial" element={<Historial />} />
            <Route path="importar" element={puedeEditar ? <Importar /> : <Navigate to="/" />} />
            <Route path="catalogos" element={esAdmin ? <Catalogos /> : <Navigate to="/" />} />
            <Route path="usuarios" element={esAdmin ? <Usuarios /> : <Navigate to="/" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Route>
        </Routes>
      </HashRouter>
    </DatosProveedor>
  );
}
