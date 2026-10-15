// Definición de las 32 columnas de la hoja "Inventario" de la plantilla de Excel.
// Es la única fuente de verdad: el formulario, la tabla, la importación y la
// exportación salen de aquí. Si la plantilla cambia, se ajusta este archivo.
//
//   key          nombre de la columna en la base de datos
//   col          letra de la columna en el Excel
//   tipo         texto | lista | mac | ip | numero | textarea | secreto
//   lista        catálogo que alimenta la lista desplegable
//   obligatorio  'Sí' | 'No' | 'Opc.' (igual que la hoja "Campos")
//   soloMiniPC   el campo solo aplica (y solo es obligatorio) en equipos Mini PC

export const SECCIONES = [
  { id: 'asignacion', titulo: 'Asignación y clasificación', desde: 'A', hasta: 'E', relleno: 'D9E2F3' },
  { id: 'ubicacion', titulo: 'Ubicación', desde: 'F', hasta: 'H', relleno: 'E2EFDA' },
  { id: 'identificacion', titulo: 'Identificación', desde: 'I', hasta: 'K', relleno: 'D9E2F3' },
  { id: 'hardware', titulo: 'Hardware', desde: 'L', hasta: 'O', relleno: 'E2EFDA' },
  { id: 'so', titulo: 'SO, licencia y seguridad', desde: 'P', hasta: 'Q', relleno: 'D9E2F3' },
  { id: 'red', titulo: 'Red y acceso remoto', desde: 'R', hasta: 'Y', relleno: 'E2EFDA' },
  { id: 'software', titulo: 'Software y telefonía', desde: 'Z', hasta: 'Z', relleno: 'D9E2F3' },
  { id: 'monitores', titulo: 'Monitores', desde: 'AA', hasta: 'AA', relleno: 'E2EFDA' },
  { id: 'perifericos', titulo: 'Periféricos', desde: 'AB', hasta: 'AB', relleno: 'D9E2F3' },
  { id: 'compra', titulo: 'Compra y garantía', desde: 'AC', hasta: 'AC', relleno: 'E2EFDA' },
  { id: 'estado', titulo: 'Estado y ciclo de vida', desde: 'AD', hasta: 'AF', relleno: 'D9E2F3' },
];

export const CAMPOS = [
  { key: 'unidad', col: 'A', label: 'Unidad', seccion: 'asignacion', tipo: 'lista', lista: 'unidad', libre: true, formato: 'Catálogo (59 unidades)', obligatorio: 'Sí', ejemplo: 'Facultad de Medicina', ancho: 14 },
  { key: 'tipo_area', col: 'B', label: 'Tipo de área', seccion: 'asignacion', tipo: 'lista', lista: 'tipo_area', formato: 'Facultad / Administrativa (heredado de la unidad)', obligatorio: 'Sí', ejemplo: 'Facultad', ancho: 16 },
  { key: 'oficina', col: 'C', label: 'Oficina', seccion: 'asignacion', tipo: 'texto', sugerencias: true, formato: 'Texto o catálogo', obligatorio: 'Sí', ejemplo: 'Dirección', ancho: 14 },
  { key: 'categoria_uso', col: 'D', label: 'Categoría de uso', seccion: 'asignacion', tipo: 'lista', lista: 'categoria_uso', formato: 'Lista: Administrativas, Catedráticos, Laboratorios, Salones, Clínicas', obligatorio: 'Sí', ejemplo: 'Administrativas', ancho: 20 },
  { key: 'encargado', col: 'E', label: 'Encargado', seccion: 'asignacion', tipo: 'texto', sugerencias: true, formato: 'Persona del directorio; se permite «Sin asignar»', obligatorio: 'Sí', ejemplo: 'Juan Pérez', ancho: 14 },

  { key: 'edificio', col: 'F', label: 'Edificio', seccion: 'ubicacion', tipo: 'lista', lista: 'edificio', libre: true, formato: 'Catálogo normalizado', obligatorio: 'Sí', ejemplo: 'Edificio D', ancho: 14 },
  { key: 'nivel', col: 'G', label: 'Nivel', seccion: 'ubicacion', tipo: 'texto', formato: 'Número o lista', obligatorio: 'No', ejemplo: '6', ancho: 14 },
  { key: 'oficina_salon', col: 'H', label: 'Oficina o Salón', seccion: 'ubicacion', tipo: 'texto', sugerencias: true, formato: 'Catálogo dependiente del edificio (D-611, EN-…)', obligatorio: 'Sí', ejemplo: 'D-611', ancho: 19 },

  { key: 'numero_serie', col: 'I', label: 'Número de serie', seccion: 'identificacion', tipo: 'texto', mono: true, formato: 'Texto en mayúsculas, sin espacios; único', obligatorio: 'Sí', ejemplo: '5CG1234XYZ', ancho: 19 },
  { key: 'nombre_equipo', col: 'J', label: 'Nombre del equipo', seccion: 'identificacion', tipo: 'texto', mono: true, formato: 'Texto único con formato PREFIJO-NN', obligatorio: 'Sí', ejemplo: 'MED-014', ancho: 21 },
  { key: 'tipo_equipo', col: 'K', label: 'Tipo de equipo', seccion: 'identificacion', tipo: 'lista', lista: 'tipo_equipo', formato: 'Lista: Desktop, AIO, Notebook, Mini PC, Tablet, Workstation', obligatorio: 'Sí', ejemplo: 'Notebook', ancho: 18 },

  { key: 'procesador', col: 'L', label: 'Procesador', seccion: 'hardware', tipo: 'texto', sugerencias: true, formato: 'Ej.: Intel Core i5-10720HX · AMD Ryzen 7 8800 · Apple Silicon M#', obligatorio: 'Sí', ejemplo: 'Intel Core i5-1135G7', ancho: 14 },
  { key: 'ram', col: 'M', label: 'RAM (GB)', seccion: 'hardware', tipo: 'texto', sugerencias: true, formato: 'Ej.: DDR4 16 2666', obligatorio: 'Sí', ejemplo: 'DDR4 16 2666', ancho: 14 },
  { key: 'tarjeta_grafica', col: 'N', label: 'Tarjeta gráfica dedicada', seccion: 'hardware', tipo: 'texto', sugerencias: true, formato: 'Texto', obligatorio: 'Sí', ejemplo: 'NVIDIA RTX 3050', ancho: 28 },
  { key: 'almacenamiento', col: 'O', label: 'Tipo de almacenamiento', seccion: 'hardware', tipo: 'texto', sugerencias: true, formato: 'Ej.: SSD 500, HDD 500', obligatorio: 'Sí', ejemplo: 'SSD 500', ancho: 26 },

  { key: 'sistema_operativo', col: 'P', label: 'Sistema operativo', seccion: 'so', tipo: 'texto', sugerencias: true, formato: 'Windows ## Education/Pro · macOS ##.## · Linux versión', obligatorio: 'Sí', ejemplo: 'Windows 11 Pro', ancho: 21 },
  { key: 'clave_windows', col: 'Q', label: 'Clave de Windows', seccion: 'so', tipo: 'secreto', mono: true, formato: 'Texto; visible solo para roles autorizados', obligatorio: 'No', ejemplo: '', ancho: 20 },

  { key: 'mac_lan', col: 'R', label: 'MAC LAN', seccion: 'red', tipo: 'mac', mono: true, formato: 'XX-XX-XX-XX-XX-XX', obligatorio: 'Sí', ejemplo: 'A4-BB-6D-12-34-56', ancho: 14 },
  { key: 'mac_lan2', col: 'S', label: 'MAC LAN 2', seccion: 'red', tipo: 'mac', mono: true, formato: 'XX-XX-XX-XX-XX-XX', obligatorio: 'Sí', ejemplo: '', ancho: 14 },
  { key: 'mac_wifi', col: 'T', label: 'MAC WiFi', seccion: 'red', tipo: 'mac', mono: true, formato: 'XX-XX-XX-XX-XX-XX', obligatorio: 'Opc.', ejemplo: '3C-58-C2-AB-CD-EF', ancho: 14 },
  { key: 'ip', col: 'U', label: 'Dirección IP', seccion: 'red', tipo: 'ip', mono: true, formato: 'IPv4 válida', obligatorio: 'Opc.', ejemplo: '10.10.20.45', ancho: 16 },
  { key: 'mascara', col: 'V', label: 'Máscara de subred (mini PC)', seccion: 'red', tipo: 'ip', mono: true, soloMiniPC: true, formato: 'IPv4', obligatorio: 'No', ejemplo: '', ancho: 31 },
  { key: 'puerta_enlace', col: 'W', label: 'Puerta de enlace (mini PC)', seccion: 'red', tipo: 'ip', mono: true, soloMiniPC: true, formato: 'IPv4', obligatorio: 'No', ejemplo: '', ancho: 30 },
  { key: 'dns_primario', col: 'X', label: 'DNS primario (mini PC)', seccion: 'red', tipo: 'ip', mono: true, soloMiniPC: true, formato: 'IPv4', obligatorio: 'No', ejemplo: '', ancho: 26 },
  { key: 'teamviewer_id', col: 'Y', label: 'ID de TeamViewer (mini PC)', seccion: 'red', tipo: 'numero', mono: true, soloMiniPC: true, formato: 'Número', obligatorio: 'Sí', ejemplo: '', ancho: 30 },

  { key: 'extension', col: 'Z', label: 'Extensión telefónica', seccion: 'software', tipo: 'numero', formato: 'Número', obligatorio: 'No', ejemplo: '2345', ancho: 24 },
  { key: 'monitores', col: 'AA', label: 'Monitores', seccion: 'monitores', tipo: 'texto', sugerencias: true, formato: 'Marca + Modelo', obligatorio: 'Sí', ejemplo: 'Dell P2422H', ancho: 14 },
  { key: 'ups', col: 'AB', label: 'UPS', seccion: 'perifericos', tipo: 'lista', lista: 'ups', formato: 'Sí / No', obligatorio: 'No', ejemplo: 'No', ancho: 14 },
  { key: 'orden_compra', col: 'AC', label: 'Orden de compra (OC)', seccion: 'compra', tipo: 'numero', formato: 'Número', obligatorio: 'No', ejemplo: '45123', ancho: 24 },

  { key: 'estado', col: 'AD', label: 'Estado', seccion: 'estado', tipo: 'lista', lista: 'estado', formato: 'Lista: En uso, En stock, En préstamo, En reparación, Pendiente de formateo, Para desecho, De baja, No localizado', obligatorio: 'Sí', ejemplo: 'En uso', ancho: 14 },
  { key: 'pendiente', col: 'AE', label: 'Pendiente', seccion: 'estado', tipo: 'texto', formato: 'Sí / No + descripción', obligatorio: 'No', ejemplo: 'No', ancho: 14 },
  { key: 'observaciones', col: 'AF', label: 'Observaciones', seccion: 'estado', tipo: 'textarea', formato: 'Texto largo', obligatorio: 'No', ejemplo: '', ancho: 40 },
];

export const CAMPO_POR_KEY = {};
for (const campo of CAMPOS) CAMPO_POR_KEY[campo.key] = campo;

export function camposDeSeccion(seccionId) {
  return CAMPOS.filter((c) => c.seccion === seccionId);
}

// Campos que se cambian con la acción "Trasladar"
export const CAMPOS_TRASLADO = ['unidad', 'tipo_area', 'oficina', 'categoria_uso', 'encargado', 'edificio', 'nivel', 'oficina_salon'];

// Listas fijas de la hoja "Listas" (también se cargan como catálogos en la base de datos)
export const LISTAS_BASE = {
  tipo_area: ['Facultad', 'Administrativa'],
  categoria_uso: ['Administrativas', 'Catedráticos', 'Laboratorios', 'Salones', 'Clínicas'],
  tipo_equipo: ['Desktop', 'AIO', 'Notebook', 'Mini PC', 'Tablet', 'Workstation'],
  ups: ['Sí', 'No'],
  estado: ['En uso', 'En stock', 'En préstamo', 'En reparación', 'Pendiente de formateo', 'Para desecho', 'De baja', 'No localizado'],
};

export const TIPOS_CATALOGO = [
  { tipo: 'unidad', titulo: 'Unidades', extra: 'Tipo de área' },
  { tipo: 'edificio', titulo: 'Edificios' },
  { tipo: 'tipo_area', titulo: 'Tipos de área' },
  { tipo: 'categoria_uso', titulo: 'Categorías de uso' },
  { tipo: 'tipo_equipo', titulo: 'Tipos de equipo' },
  { tipo: 'estado', titulo: 'Estados' },
  { tipo: 'ups', titulo: 'UPS' },
];

export const ACCIONES = {
  CREADO: 'Creado',
  EDITADO: 'Editado',
  TRASLADO: 'Traslado',
  CAMBIO_ESTADO: 'Cambio de estado',
  IMPORTADO: 'Importado de Excel',
  ELIMINADO: 'Eliminado',
};

export function aplicaCampo(campo, equipo) {
  if (!campo.soloMiniPC) return true;
  return equipo.tipo_equipo === 'Mini PC';
}

// Lista de campos obligatorios que faltan en un equipo
export function camposFaltantes(equipo) {
  const faltan = [];
  for (const campo of CAMPOS) {
    if (campo.obligatorio !== 'Sí') continue;
    if (!aplicaCampo(campo, equipo)) continue;
    const valor = equipo[campo.key];
    if (valor === null || valor === undefined || String(valor).trim() === '') faltan.push(campo);
  }
  return faltan;
}
