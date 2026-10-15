// Modo demostración: funciona sin Supabase, guardando todo en el navegador.
// Sirve para probar la aplicación antes de configurar la base de datos.
// Reproduce las mismas reglas que supabase/schema.sql (historial, unicidad, conflictos).

import { CAMPOS, LISTAS_BASE } from '../config/campos';
import { normalizarMac, normalizarSerie } from '../lib/normalizar';

const LLAVE = 'inventario-ti-demo-v1';
const USUARIO_DEMO = { id: 'demo-admin', email: 'demo@ufm.edu' };
const CAMPOS_EQUIPO = CAMPOS.filter((c) => c.key !== 'clave_windows').map((c) => c.key);

let memoria = null;
const oyentes = new Set();

function ahora() {
  return new Date().toISOString();
}

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function guardar() {
  try {
    localStorage.setItem(LLAVE, JSON.stringify(memoria));
  } catch {
    // Sin almacenamiento disponible: los datos viven solo mientras la pestaña esté abierta
  }
  for (const oyente of oyentes) oyente();
}

function cargar() {
  if (memoria) return memoria;
  try {
    const texto = localStorage.getItem(LLAVE);
    if (texto) memoria = JSON.parse(texto);
  } catch {
    memoria = null;
  }
  if (!memoria) {
    memoria = datosIniciales();
    guardar();
  }
  return memoria;
}

function datosIniciales() {
  const catalogos = [];
  let id = 1;
  for (const tipo of Object.keys(LISTAS_BASE)) {
    LISTAS_BASE[tipo].forEach((valor, i) => catalogos.push({ id: id++, tipo, valor, extra: null, orden: i + 1, activo: true }));
  }
  const unidades = [
    ['Facultad de Medicina', 'Facultad'], ['Facultad de Odontología', 'Facultad'], ['Escuela de Negocios', 'Facultad'],
    ['CETA', 'Administrativa'], ['Atención al Estudiante', 'Administrativa'], ['Registro', 'Administrativa'],
  ];
  unidades.forEach(([valor, extra], i) => catalogos.push({ id: id++, tipo: 'unidad', valor, extra, orden: i + 1, activo: true }));
  ['Edificio Académico', 'Escuela de Negocios', 'Centro Estudiantil', 'Centro Cultural', 'Medicina', 'Odontología', 'Casa 9-20']
    .forEach((valor, i) => catalogos.push({ id: id++, tipo: 'edificio', valor, extra: null, orden: i + 1, activo: true }));

  const ejemplos = [
    { unidad: 'Facultad de Medicina', tipo_area: 'Facultad', oficina: 'Dirección', categoria_uso: 'Administrativas', encargado: 'Juan Pérez', edificio: 'Medicina', nivel: '2', oficina_salon: 'M-204', numero_serie: '5CG1234XYZ', nombre_equipo: 'MED-014', tipo_equipo: 'Notebook', procesador: 'Intel Core i5-1135G7', ram: 'DDR4 16 3200', tarjeta_grafica: 'No tiene', almacenamiento: 'SSD 500', sistema_operativo: 'Windows 11 Pro', mac_lan: 'A4-BB-6D-12-34-56', mac_lan2: 'N/A', mac_wifi: '3C-58-C2-AB-CD-EF', ip: '10.10.20.45', monitores: 'Dell P2422H', ups: 'No', orden_compra: '45123', estado: 'En uso', pendiente: 'No' },
    { unidad: 'Facultad de Medicina', tipo_area: 'Facultad', oficina: 'Laboratorio de anatomía', categoria_uso: 'Laboratorios', encargado: 'Sin asignar', edificio: 'Medicina', nivel: '1', oficina_salon: 'M-110', numero_serie: 'MXL3201ABC', nombre_equipo: 'MED-021', tipo_equipo: 'Mini PC', procesador: 'Intel Core i5-10500T', ram: 'DDR4 8 2666', tarjeta_grafica: 'No tiene', almacenamiento: 'SSD 256', sistema_operativo: 'Windows 10 Education', mac_lan: '9C-7B-EF-01-22-33', mac_lan2: 'N/A', ip: '10.10.21.30', mascara: '255.255.255.0', puerta_enlace: '10.10.21.1', dns_primario: '10.10.1.10', teamviewer_id: '1234567890', monitores: 'HP E24 G5', ups: 'Sí', estado: 'En uso', pendiente: 'Sí, actualizar a Windows 11' },
    { unidad: 'CETA', tipo_area: 'Administrativa', oficina: 'Soporte técnico', categoria_uso: 'Administrativas', encargado: 'Diego Barrios', edificio: 'Escuela de Negocios', nivel: '3', oficina_salon: 'EN-301', numero_serie: 'PF3ABCD1', nombre_equipo: 'CETA-03', tipo_equipo: 'Desktop', procesador: 'Intel Core i7-12700', ram: 'DDR4 32 3200', tarjeta_grafica: 'NVIDIA RTX 3050', almacenamiento: 'SSD 1000', sistema_operativo: 'Windows 11 Pro', mac_lan: '00-1A-2B-3C-4D-5E', mac_lan2: 'N/A', ip: '10.10.5.12', monitores: 'Dell P2422H x2', ups: 'Sí', orden_compra: '45890', estado: 'En uso', pendiente: 'No' },
    { unidad: 'Escuela de Negocios', tipo_area: 'Facultad', oficina: 'Salón Friedman', categoria_uso: 'Salones', encargado: 'Sin asignar', edificio: 'Escuela de Negocios', nivel: '2', oficina_salon: 'EN-FRIEDMAN', numero_serie: 'MXL9988QRS', nombre_equipo: 'EN-007', tipo_equipo: 'AIO', procesador: 'Intel Core i5-8500', ram: 'DDR4 8 2666', tarjeta_grafica: 'No tiene', almacenamiento: 'HDD 500', sistema_operativo: 'Windows 10 Education', mac_lan: '', monitores: 'Integrado', estado: 'En reparación', pendiente: 'Sí, cambiar disco a SSD' },
    { unidad: 'Atención al Estudiante', tipo_area: 'Administrativa', oficina: 'Recepción', categoria_uso: 'Administrativas', encargado: 'María López', edificio: 'Centro Estudiantil', nivel: '1', oficina_salon: 'CE-105', numero_serie: 'C02XK1ABJG5H', nombre_equipo: 'AE-002', tipo_equipo: 'Notebook', procesador: 'Apple Silicon M2', ram: 'LPDDR5 16', tarjeta_grafica: 'No tiene', almacenamiento: 'SSD 512', sistema_operativo: 'macOS 14.5', mac_wifi: 'F0-18-98-AA-BB-CC', mac_lan: 'N/A', mac_lan2: 'N/A', monitores: 'N/A', estado: 'En préstamo' },
    { unidad: 'Facultad de Odontología', tipo_area: 'Facultad', oficina: 'Clínica 1', categoria_uso: 'Clínicas', encargado: 'Sin asignar', edificio: 'Odontología', oficina_salon: 'OD-CL1', numero_serie: 'JTX5521', nombre_equipo: 'OD-010', tipo_equipo: 'Desktop', procesador: 'Intel Core i5-7500', ram: 'DDR4 8 2400', almacenamiento: 'HDD 1000', sistema_operativo: 'Windows 10 Pro', estado: 'Pendiente de formateo' },
    { unidad: 'Registro', tipo_area: 'Administrativa', categoria_uso: 'Administrativas', numero_serie: 'HZ88123', nombre_equipo: 'REG-001', tipo_equipo: 'Desktop', procesador: 'Intel Core 2 Duo E8400', ram: 'DDR2 4', almacenamiento: 'HDD 250', sistema_operativo: 'Windows 7 Professional', estado: 'Para desecho', observaciones: 'Equipo retirado del puesto; espera evaluación final.' },
  ];

  const equipos = [];
  const historial = [];
  const secretos = {};
  let idHistorial = 1;
  ejemplos.forEach((ejemplo, i) => {
    const fecha = new Date(Date.now() - (ejemplos.length - i) * 86400000).toISOString();
    const equipo = { id: uuid(), creado_en: fecha, creado_por: USUARIO_DEMO.id, actualizado_en: fecha, actualizado_por: USUARIO_DEMO.id };
    for (const key of CAMPOS_EQUIPO) equipo[key] = ejemplo[key] ? ejemplo[key] : null;
    equipos.push(equipo);
    const cambios = {};
    for (const key of CAMPOS_EQUIPO) if (equipo[key]) cambios[key] = { antes: null, despues: equipo[key] };
    historial.push({ id: idHistorial++, equipo_id: equipo.id, numero_serie: equipo.numero_serie, nombre_equipo: equipo.nombre_equipo, accion: 'CREADO', cambios, motivo: 'Datos de ejemplo', usuario_id: USUARIO_DEMO.id, usuario_nombre: 'Usuario demo', fecha });
  });
  secretos[equipos[0].id] = 'XXXXX-XXXXX-XXXXX-XXXXX-DEMO1';

  return {
    sesionActiva: true,
    perfiles: [{ id: USUARIO_DEMO.id, correo: USUARIO_DEMO.email, nombre: 'Usuario demo', rol: 'admin', creado_en: ahora() }],
    catalogos,
    siguienteCatalogo: id,
    equipos,
    secretos,
    historial,
    siguienteHistorial: idHistorial,
  };
}

function copia(objeto) {
  return JSON.parse(JSON.stringify(objeto));
}

function normalizarFila(fila) {
  fila.numero_serie = normalizarSerie(fila.numero_serie);
  fila.nombre_equipo = fila.nombre_equipo ? String(fila.nombre_equipo).trim().toUpperCase() || null : null;
  for (const key of ['mac_lan', 'mac_lan2', 'mac_wifi']) fila[key] = fila[key] ? normalizarMac(fila[key]) || null : null;
}

function revisarUnicos(db, fila, idPropio) {
  if (!fila.numero_serie) throw new Error('El número de serie es obligatorio.');
  for (const otro of db.equipos) {
    if (otro.id === idPropio) continue;
    if (otro.numero_serie.toUpperCase() === fila.numero_serie.toUpperCase()) throw new Error('Ya existe un equipo con ese número de serie.');
    if (fila.nombre_equipo && otro.nombre_equipo && otro.nombre_equipo.toUpperCase() === fila.nombre_equipo.toUpperCase()) {
      throw new Error('Ya existe un equipo con ese nombre.');
    }
  }
}

function registrar(db, equipo, accion, cambios, motivo) {
  db.historial.push({
    id: db.siguienteHistorial++,
    equipo_id: equipo.id,
    numero_serie: equipo.numero_serie,
    nombre_equipo: equipo.nombre_equipo,
    accion,
    cambios,
    motivo: motivo || null,
    usuario_id: USUARIO_DEMO.id,
    usuario_nombre: 'Usuario demo',
    fecha: ahora(),
  });
}

function crear(db, datos, motivo, accion) {
  const fila = { id: uuid() };
  for (const key of CAMPOS_EQUIPO) fila[key] = datos[key] === undefined || datos[key] === '' ? null : datos[key];
  if (!fila.estado) fila.estado = 'En uso';
  normalizarFila(fila);
  revisarUnicos(db, fila, null);
  fila.creado_en = ahora();
  fila.actualizado_en = fila.creado_en;
  fila.creado_por = USUARIO_DEMO.id;
  fila.actualizado_por = USUARIO_DEMO.id;
  db.equipos.push(fila);

  const cambios = {};
  for (const key of CAMPOS_EQUIPO) if (fila[key]) cambios[key] = { antes: null, despues: fila[key] };
  if (datos.clave_windows) {
    db.secretos[fila.id] = datos.clave_windows;
    cambios.clave_windows = { antes: null, despues: '(oculta)' };
  }
  registrar(db, fila, accion || 'CREADO', cambios, motivo);
  return fila.id;
}

function actualizar(db, id, cambiosEntrada, { motivo, accion, version } = {}) {
  const equipo = db.equipos.find((e) => e.id === id);
  if (!equipo) throw new Error('El equipo ya no existe.');
  if (version && version !== equipo.actualizado_en) {
    const error = new Error('Otra persona guardó cambios en este equipo mientras usted editaba. Recargue el equipo para verlos.');
    error.conflicto = true;
    throw error;
  }

  const nueva = { ...equipo };
  for (const key of CAMPOS_EQUIPO) {
    if (key in cambiosEntrada) nueva[key] = cambiosEntrada[key] === '' ? null : cambiosEntrada[key];
  }
  normalizarFila(nueva);
  revisarUnicos(db, nueva, id);

  const cambios = {};
  for (const key of CAMPOS_EQUIPO) {
    if ((equipo[key] || null) !== (nueva[key] || null)) cambios[key] = { antes: equipo[key] || null, despues: nueva[key] || null };
  }
  if ('clave_windows' in cambiosEntrada) {
    const antes = db.secretos[id] || null;
    const despues = cambiosEntrada.clave_windows || null;
    if (antes !== despues) {
      cambios.clave_windows = { antes: antes ? '(oculta)' : null, despues: despues ? '(oculta)' : null };
      if (despues) db.secretos[id] = despues;
      else delete db.secretos[id];
    }
  }
  if (Object.keys(cambios).length === 0) return equipo.actualizado_en;

  Object.assign(equipo, nueva);
  equipo.actualizado_en = ahora();
  equipo.actualizado_por = USUARIO_DEMO.id;

  let accionFinal = accion;
  if (!accionFinal) {
    const llaves = Object.keys(cambios);
    accionFinal = llaves.length === 1 && llaves[0] === 'estado' ? 'CAMBIO_ESTADO' : 'EDITADO';
  }
  registrar(db, equipo, accionFinal, cambios, motivo);
  return equipo.actualizado_en;
}

function esperar() {
  return new Promise((resolver) => setTimeout(resolver, 120));
}

export function crearApiDemo() {
  return {
    modo: 'demo',

    async sesion() {
      const db = cargar();
      return db.sesionActiva ? { user: USUARIO_DEMO } : null;
    },
    alCambiarSesion(callback) {
      const oyente = () => callback(memoria && memoria.sesionActiva ? { user: USUARIO_DEMO } : null);
      oyentes.add(oyente);
      return () => oyentes.delete(oyente);
    },
    async iniciarSesion() {
      cargar().sesionActiva = true;
      guardar();
    },
    async registrarse() {
      cargar().sesionActiva = true;
      guardar();
      return { necesitaConfirmar: false };
    },
    async cerrarSesion() {
      cargar().sesionActiva = false;
      guardar();
    },
    async miPerfil() {
      return copia(cargar().perfiles[0]);
    },

    async listarEquipos() {
      await esperar();
      return copia(cargar().equipos);
    },
    async obtenerEquipo(id) {
      const equipo = cargar().equipos.find((e) => e.id === id);
      return equipo ? copia(equipo) : null;
    },
    async obtenerSecreto(id) {
      return cargar().secretos[id] || null;
    },
    async listarSecretos() {
      return copia(cargar().secretos);
    },
    async crearEquipo(datos, motivo) {
      const db = cargar();
      const id = crear(db, datos, motivo);
      guardar();
      return id;
    },
    async actualizarEquipo(id, cambios, opciones) {
      const db = cargar();
      const version = actualizar(db, id, cambios, opciones);
      guardar();
      return version;
    },
    async eliminarEquipo(id, motivo) {
      const db = cargar();
      const equipo = db.equipos.find((e) => e.id === id);
      if (!equipo) return;
      const cambios = {};
      for (const key of CAMPOS_EQUIPO) if (equipo[key]) cambios[key] = { antes: equipo[key], despues: null };
      registrar(db, equipo, 'ELIMINADO', cambios, motivo);
      db.equipos = db.equipos.filter((e) => e.id !== id);
      delete db.secretos[id];
      guardar();
    },
    async importarEquipos(filas, omitirVacios) {
      const db = cargar();
      let creados = 0;
      let actualizados = 0;
      const errores = [];
      for (const fila of filas) {
        const serie = normalizarSerie(fila.numero_serie);
        if (!serie) continue;
        const datos = {};
        for (const key of Object.keys(fila)) {
          if (omitirVacios && (fila[key] === null || fila[key] === '')) continue;
          datos[key] = fila[key];
        }
        try {
          const existente = db.equipos.find((e) => e.numero_serie.toUpperCase() === serie);
          if (existente) {
            delete datos.numero_serie;
            actualizar(db, existente.id, datos, { motivo: 'Importado desde Excel', accion: 'IMPORTADO' });
            actualizados++;
          } else {
            crear(db, datos, 'Importado desde Excel', 'IMPORTADO');
            creados++;
          }
        } catch (error) {
          errores.push({ numero_serie: serie, error: error.message });
        }
      }
      guardar();
      return { creados, actualizados, errores };
    },
    suscribirCambios(callback) {
      oyentes.add(callback);
      return () => oyentes.delete(callback);
    },

    async listarHistorial({ equipoId, buscar, accion, desde, hasta, pagina = 1, porPagina = 50 } = {}) {
      await esperar();
      let filas = cargar().historial.slice().reverse();
      if (equipoId) filas = filas.filter((h) => h.equipo_id === equipoId);
      if (accion) filas = filas.filter((h) => h.accion === accion);
      if (desde) filas = filas.filter((h) => h.fecha >= desde);
      if (hasta) filas = filas.filter((h) => h.fecha <= hasta + 'T23:59:59.999Z');
      const texto = (buscar || '').trim().toLowerCase();
      if (texto) {
        filas = filas.filter((h) => [h.numero_serie, h.nombre_equipo, h.usuario_nombre, h.motivo]
          .some((v) => v && v.toLowerCase().includes(texto)));
      }
      const inicio = (pagina - 1) * porPagina;
      return { filas: copia(filas.slice(inicio, inicio + porPagina)), total: filas.length };
    },

    async listarCatalogos() {
      return copia(cargar().catalogos);
    },
    async guardarCatalogo(item) {
      const db = cargar();
      const duplicado = db.catalogos.find((c) => c.tipo === item.tipo && c.valor === item.valor && c.id !== item.id);
      if (duplicado) throw new Error('Ese valor ya está en el catálogo.');
      if (item.id) {
        const actual = db.catalogos.find((c) => c.id === item.id);
        Object.assign(actual, { valor: item.valor, extra: item.extra || null, orden: item.orden || 0, activo: item.activo !== false });
      } else {
        db.catalogos.push({ id: db.siguienteCatalogo++, tipo: item.tipo, valor: item.valor, extra: item.extra || null, orden: item.orden || 0, activo: true });
      }
      guardar();
    },
    async eliminarCatalogo(id) {
      const db = cargar();
      db.catalogos = db.catalogos.filter((c) => c.id !== id);
      guardar();
    },

    async listarPerfiles() {
      return copia(cargar().perfiles);
    },
    async cambiarRol() {
      throw new Error('En el modo demostración solo existe el usuario demo.');
    },

    reiniciarDemo() {
      memoria = datosIniciales();
      guardar();
    },
  };
}
