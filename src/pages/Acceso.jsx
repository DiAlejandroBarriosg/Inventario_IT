import { useState } from 'react';
import { api, esDemo } from '../api';

export default function Acceso() {
  const [modo, setModo] = useState('entrar');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setError('');
    setMensaje('');
    setEnviando(true);
    try {
      if (modo === 'entrar') {
        await api.iniciarSesion(correo.trim(), contrasena);
      } else {
        if (contrasena.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
        const r = await api.registrarse(correo.trim(), contrasena, nombre.trim());
        if (r.necesitaConfirmar) {
          setMensaje('Cuenta creada. Revise su correo y abra el enlace de confirmación; después un administrador le asignará acceso.');
          setModo('entrar');
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="acceso">
      <section className="acceso-marca">
        <div>
          <div className="bandas" aria-hidden="true">
            {Array.from({ length: 11 }).map((_, i) => <span key={i} />)}
          </div>
          <h1>Inventario de equipos de TI</h1>
          <p>Registro único de computadoras, mini PC y periféricos de la universidad: ubicación, encargado, hardware, red y el historial de cada cambio.</p>
        </div>
        <small>Centro de Tecnologías Avanzadas, Universidad Francisco Marroquín</small>
      </section>

      <section className="acceso-form">
        {esDemo ? (
          <form onSubmit={enviar}>
            <h2>Modo demostración</h2>
            <p className="muted" style={{ margin: 0 }}>
              La aplicación todavía no está conectada a Supabase. Puede probarla con datos de ejemplo que se guardan solo en este navegador.
            </p>
            <button className="btn btn-primario" type="submit">Entrar a la demostración</button>
          </form>
        ) : (
          <form onSubmit={enviar}>
            <h2>{modo === 'entrar' ? 'Iniciar sesión' : 'Crear cuenta'}</h2>
            {error && <div className="alerta alerta-error">{error}</div>}
            {mensaje && <div className="alerta alerta-ok">{mensaje}</div>}
            {modo === 'registro' && (
              <div className="campo">
                <label htmlFor="nombre">Nombre completo</label>
                <input id="nombre" className="entrada" value={nombre} onChange={(e) => setNombre(e.target.value)} required autoComplete="name" />
              </div>
            )}
            <div className="campo">
              <label htmlFor="correo">Correo institucional</label>
              <input id="correo" type="email" className="entrada" value={correo} onChange={(e) => setCorreo(e.target.value)} required autoComplete="email" />
            </div>
            <div className="campo">
              <label htmlFor="contrasena">Contraseña</label>
              <input id="contrasena" type="password" className="entrada" value={contrasena} onChange={(e) => setContrasena(e.target.value)} required
                autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} />
            </div>
            <button className="btn btn-primario" type="submit" disabled={enviando}>
              {enviando ? 'Un momento…' : modo === 'entrar' ? 'Iniciar sesión' : 'Crear cuenta'}
            </button>
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>
              {modo === 'entrar' ? '¿Primera vez? ' : '¿Ya tiene cuenta? '}
              <button type="button" className="btn-link" onClick={() => { setModo(modo === 'entrar' ? 'registro' : 'entrar'); setError(''); }}>
                {modo === 'entrar' ? 'Crear cuenta' : 'Iniciar sesión'}
              </button>
            </p>
          </form>
        )}
      </section>
    </div>
  );
}
