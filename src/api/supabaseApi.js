import { createClient } from '@supabase/supabase-js';

// Traduce los errores de PostgreSQL/Supabase a mensajes claros
function traducirError(error) {
  if (!error) return null;
  const mensaje = error.message || String(error);
  const e = new Error(mensaje);

  if (error.code === '23505' || mensaje.includes('duplicate key')) {
    if (mensaje.includes('numero_serie')) e.message = 'Ya existe un equipo con ese número de serie.';
    else if (mensaje.includes('nombre_equipo')) e.message = 'Ya existe un equipo con ese nombre.';
    else if (mensaje.includes('catalogos')) e.message = 'Ese valor ya está en el catálogo.';
    else e.message = 'Ya existe un registro con ese valor.';
  }
  if (mensaje.startsWith('CONFLICTO')) {
    e.conflicto = true;
    e.message = 'Otra persona guardó cambios en este equipo mientras usted editaba. Recargue el equipo para verlos.';
  }
  if (mensaje === 'Invalid login credentials') e.message = 'Correo o contraseña incorrectos.';
  if (mensaje.includes('Email not confirmed')) e.message = 'Confirme su correo con el enlace que le enviamos antes de entrar.';
  if (mensaje.includes('User already registered')) e.message = 'Ese correo ya tiene una cuenta. Inicie sesión.';
  return e;
}

function revisar({ data, error }) {
  if (error) throw traducirError(error);
  return data;
}

// Quita caracteres que rompen los filtros .or() de PostgREST
function limpiarFiltro(texto) {
  return texto.replace(/[,()*%\\]/g, ' ').trim();
}

async function leerTodo(consultaPorRango) {
  const tamano = 1000;
  let desde = 0;
  const todo = [];
  while (true) {
    const filas = revisar(await consultaPorRango(desde, desde + tamano - 1));
    for (const fila of filas) todo.push(fila);
    if (filas.length < tamano) break;
    desde += tamano;
  }
  return todo;
}

export function crearApiSupabase(url, llave) {
  const supabase = createClient(url, llave);

  return {
    modo: 'supabase',

    // ---------- Sesión ----------
    async sesion() {
      const data = revisar(await supabase.auth.getSession());
      return data.session;
    },
    alCambiarSesion(callback) {
      const { data } = supabase.auth.onAuthStateChange((_evento, sesion) => callback(sesion));
      return () => data.subscription.unsubscribe();
    },
    async iniciarSesion(correo, contrasena) {
      revisar(await supabase.auth.signInWithPassword({ email: correo, password: contrasena }));
    },
    async registrarse(correo, contrasena, nombre) {
      const data = revisar(await supabase.auth.signUp({
        email: correo,
        password: contrasena,
        // El enlace de confirmación regresa a esta misma página (GitHub Pages, local, etc.)
        options: { data: { nombre }, emailRedirectTo: window.location.origin + window.location.pathname },
      }));
      return { necesitaConfirmar: !data.session };
    },
    async cerrarSesion() {
      revisar(await supabase.auth.signOut());
    },
    async miPerfil(usuarioId) {
      return revisar(await supabase.from('perfiles').select('*').eq('id', usuarioId).maybeSingle());
    },

    // ---------- Equipos ----------
    async listarEquipos() {
      return leerTodo((desde, hasta) =>
        supabase.from('equipos').select('*').order('nombre_equipo', { ascending: true, nullsFirst: false })
          .order('id').range(desde, hasta));
    },
    async obtenerEquipo(id) {
      return revisar(await supabase.from('equipos').select('*').eq('id', id).maybeSingle());
    },
    async obtenerSecreto(id) {
      const fila = revisar(await supabase.from('equipo_secretos').select('clave_windows').eq('equipo_id', id).maybeSingle());
      return fila ? fila.clave_windows : null;
    },
    async listarSecretos() {
      const filas = await leerTodo((desde, hasta) =>
        supabase.from('equipo_secretos').select('equipo_id, clave_windows').order('equipo_id').range(desde, hasta));
      const mapa = {};
      for (const fila of filas) mapa[fila.equipo_id] = fila.clave_windows;
      return mapa;
    },
    async crearEquipo(datos, motivo) {
      return revisar(await supabase.rpc('crear_equipo', { p_datos: datos, p_motivo: motivo || null }));
    },
    async actualizarEquipo(id, cambios, opciones = {}) {
      return revisar(await supabase.rpc('actualizar_equipo', {
        p_id: id,
        p_cambios: cambios,
        p_motivo: opciones.motivo || null,
        p_accion: opciones.accion || null,
        p_version: opciones.version || null,
      }));
    },
    async eliminarEquipo(id, motivo) {
      revisar(await supabase.rpc('eliminar_equipo', { p_id: id, p_motivo: motivo || null }));
    },
    async importarEquipos(filas, omitirVacios) {
      return revisar(await supabase.rpc('importar_equipos', { p_filas: filas, p_omitir_vacios: omitirVacios }));
    },
    suscribirCambios(callback) {
      const canal = supabase
        .channel('equipos-cambios')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'equipos' }, () => callback())
        .subscribe();
      return () => { supabase.removeChannel(canal); };
    },

    // ---------- Historial ----------
    async listarHistorial({ equipoId, buscar, accion, desde, hasta, pagina = 1, porPagina = 50 } = {}) {
      let consulta = supabase.from('historial').select('*', { count: 'exact' }).order('fecha', { ascending: false }).order('id', { ascending: false });
      if (equipoId) consulta = consulta.eq('equipo_id', equipoId);
      if (accion) consulta = consulta.eq('accion', accion);
      if (desde) consulta = consulta.gte('fecha', desde);
      if (hasta) consulta = consulta.lte('fecha', hasta + 'T23:59:59.999');
      const texto = limpiarFiltro(buscar || '');
      if (texto) {
        consulta = consulta.or(`numero_serie.ilike.*${texto}*,nombre_equipo.ilike.*${texto}*,usuario_nombre.ilike.*${texto}*,motivo.ilike.*${texto}*`);
      }
      const inicio = (pagina - 1) * porPagina;
      const { data, error, count } = await consulta.range(inicio, inicio + porPagina - 1);
      if (error) throw traducirError(error);
      return { filas: data, total: count || 0 };
    },

    // ---------- Catálogos ----------
    async listarCatalogos() {
      return revisar(await supabase.from('catalogos').select('*').order('tipo').order('orden').order('valor'));
    },
    async guardarCatalogo(item) {
      const datos = { tipo: item.tipo, valor: item.valor, extra: item.extra || null, orden: item.orden || 0, activo: item.activo !== false };
      if (item.id) revisar(await supabase.from('catalogos').update(datos).eq('id', item.id));
      else revisar(await supabase.from('catalogos').insert(datos));
    },
    async eliminarCatalogo(id) {
      revisar(await supabase.from('catalogos').delete().eq('id', id));
    },

    // ---------- Usuarios ----------
    async listarPerfiles() {
      return revisar(await supabase.from('perfiles').select('*').order('creado_en'));
    },
    async cambiarRol(usuarioId, rol) {
      revisar(await supabase.rpc('cambiar_rol', { p_usuario: usuarioId, p_rol: rol }));
    },
  };
}
