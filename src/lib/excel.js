// Exportar e importar el inventario con el mismo formato de la plantilla
// "Inventario_temporal.xlsx": hojas Inventario, Listas y Campos, encabezados por
// sección con sus colores, notas en cada encabezado, listas desplegables,
// paneles inmovilizados en C3 y autofiltro.

import { CAMPOS, SECCIONES, LISTAS_BASE } from '../config/campos';
import { limpiar } from './normalizar';

const AZUL_OSCURO = 'FF1F3864';
const BORDE = { style: 'thin', color: { argb: 'FFBFBFBF' } };
const BORDES = { top: BORDE, left: BORDE, bottom: BORDE, right: BORDE };
const FILAS_MINIMAS = 2000; // la plantilla trae validaciones y filtro hasta la fila 2000

// Columnas de "Listas" y la columna del Inventario que las usa
const LISTAS_EXCEL = [
  { col: 'A', titulo: 'Tipo de área', tipo: 'tipo_area', usaEn: 'B' },
  { col: 'B', titulo: 'Categoría de uso', tipo: 'categoria_uso', usaEn: 'D' },
  { col: 'C', titulo: 'Tipo de equipo', tipo: 'tipo_equipo', usaEn: 'K' },
  { col: 'D', titulo: 'UPS', tipo: 'ups', usaEn: 'AB' },
  { col: 'E', titulo: 'Estado', tipo: 'estado', usaEn: 'AD' },
];

// Columnas que la plantilla define como número; se escriben como número si lo son
const COLUMNAS_NUMERICAS = ['nivel', 'teamviewer_id', 'extension', 'orden_compra'];

async function cargarExcelJS() {
  const modulo = await import('exceljs');
  return modulo.default || modulo;
}

function valorCelda(campo, valor) {
  const texto = limpiar(valor);
  if (texto === '') return null;
  if (COLUMNAS_NUMERICAS.includes(campo.key) && /^[1-9]\d{0,14}$/.test(texto)) return Number(texto);
  return texto;
}

function estiloEncabezado(celda) {
  celda.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' } };
  celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_OSCURO } };
  celda.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  celda.border = BORDES;
}

/**
 * Genera el archivo .xlsx y devuelve un Blob.
 * @param equipos  lista de equipos (en el orden en que se quieren en el Excel)
 * @param secretos mapa { equipo_id: clave_windows } o null si el usuario no puede verlas
 * @param listas   función (tipo) => valores del catálogo, para la hoja "Listas"
 */
export async function generarExcel(equipos, secretos, listas) {
  const ExcelJS = await cargarExcelJS();
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Inventario TI · CETA';
  libro.created = new Date();

  // ---------------- Hoja Inventario ----------------
  const hoja = libro.addWorksheet('Inventario', {
    views: [{ state: 'frozen', xSplit: 2, ySplit: 2, topLeftCell: 'C3', activeCell: 'A1' }],
  });
  hoja.columns = CAMPOS.map((campo) => ({ key: campo.key, width: campo.ancho }));

  // Fila 1: secciones combinadas con su color
  for (const seccion of SECCIONES) {
    const primera = hoja.getCell(seccion.desde + '1');
    primera.value = seccion.titulo;
    const inicio = hoja.getColumn(seccion.desde).number;
    const fin = hoja.getColumn(seccion.hasta).number;
    for (let c = inicio; c <= fin; c++) {
      const celda = hoja.getRow(1).getCell(c);
      celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + seccion.relleno } };
      celda.border = BORDES;
      celda.font = { name: 'Arial', bold: true, color: { argb: AZUL_OSCURO } };
      celda.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    }
    if (fin > inicio) hoja.mergeCells(seccion.desde + '1:' + seccion.hasta + '1');
  }
  hoja.getRow(1).height = 30;

  // Fila 2: encabezados con nota de formato
  CAMPOS.forEach((campo, i) => {
    const celda = hoja.getRow(2).getCell(i + 1);
    celda.value = campo.label;
    estiloEncabezado(celda);
    celda.note = {
      texts: [{ text: 'Formato: ' + campo.formato + '\nObligatorio: ' + campo.obligatorio }],
      editAs: 'absolute',
    };
  });
  hoja.getRow(2).height = 32;

  // Datos desde la fila 3
  equipos.forEach((equipo, i) => {
    const fila = hoja.getRow(3 + i);
    CAMPOS.forEach((campo, c) => {
      let valor = equipo[campo.key];
      if (campo.key === 'clave_windows') valor = secretos ? secretos[equipo.id] : null;
      const celda = fila.getCell(c + 1);
      celda.value = valorCelda(campo, valor);
      celda.font = { name: 'Arial' };
    });
  });

  const ultimaFila = Math.max(FILAS_MINIMAS, equipos.length + 2);
  hoja.autoFilter = 'A2:AF' + ultimaFila;

  // ---------------- Hoja Listas ----------------
  const hojaListas = libro.addWorksheet('Listas');
  hojaListas.columns = LISTAS_EXCEL.map(() => ({ width: 24 }));
  for (const lista of LISTAS_EXCEL) {
    const encabezado = hojaListas.getCell(lista.col + '1');
    encabezado.value = lista.titulo;
    encabezado.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' } };
    encabezado.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_OSCURO } };

    const valores = listas ? listas(lista.tipo) : LISTAS_BASE[lista.tipo];
    valores.forEach((valor, i) => {
      const celda = hojaListas.getCell(lista.col + (i + 2));
      celda.value = valor;
      celda.font = { name: 'Arial' };
    });

    // Lista desplegable en la hoja Inventario
    const ultimaLista = Math.max(2, valores.length + 1);
    hoja.dataValidations.add(lista.usaEn + '3:' + lista.usaEn + ultimaFila, {
      type: 'list',
      allowBlank: true,
      showErrorMessage: false,
      formulae: ['Listas!$' + lista.col + '$2:$' + lista.col + '$' + ultimaLista],
    });
  }

  // ---------------- Hoja Campos ----------------
  const hojaCampos = libro.addWorksheet('Campos', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1, topLeftCell: 'A2', activeCell: 'A1' }],
  });
  hojaCampos.columns = [{ width: 5 }, { width: 26 }, { width: 28 }, { width: 60 }, { width: 12 }, { width: 24 }];
  ['#', 'Sección', 'Campo', 'Formato / valores', 'Obligatorio', 'Ejemplo'].forEach((titulo, i) => {
    const celda = hojaCampos.getRow(1).getCell(i + 1);
    celda.value = titulo;
    celda.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' } };
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_OSCURO } };
    celda.border = BORDES;
  });
  const camposVisibles = CAMPOS;
  camposVisibles.forEach((campo, i) => {
    const seccion = SECCIONES.find((s) => s.id === campo.seccion);
    const valores = [i + 1, seccion.titulo, campo.label, campo.formato, campo.obligatorio, campo.ejemplo || null];
    valores.forEach((valor, c) => {
      const celda = hojaCampos.getRow(i + 2).getCell(c + 1);
      celda.value = valor;
      celda.font = { name: 'Arial' };
      celda.border = BORDES;
      celda.alignment = { vertical: 'top', wrapText: true };
    });
  });
  const nota = hojaCampos.getCell('B' + (camposVisibles.length + 3));
  nota.value = 'Campos sin color en «Campos inventario» (Word). Pasa el mouse sobre cada encabezado de la hoja Inventario para ver su formato.';
  nota.font = { name: 'Arial', italic: true, color: { argb: 'FF595959' } };

  const buffer = await libro.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function nombreArchivoExport() {
  const hoy = new Date();
  const dos = (n) => String(n).padStart(2, '0');
  return 'Inventario_TI_' + hoy.getFullYear() + '-' + dos(hoy.getMonth() + 1) + '-' + dos(hoy.getDate()) + '.xlsx';
}

// ---------------------------------------------------------------------------
// Importación
// ---------------------------------------------------------------------------

// Para importar solo se necesitan los valores. Las notas de los encabezados se
// quitan antes de leer porque algunos generadores de Excel (p. ej. openpyxl) las
// guardan en rutas que ExcelJS no reconoce y la lectura falla.
async function prepararParaLectura(buffer) {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(buffer);
  for (const ruta of Object.keys(zip.files)) {
    const esRelacionHoja = /^xl\/worksheets\/_rels\/.+\.rels$/.test(ruta);
    const esHoja = /^xl\/worksheets\/[^/]+\.xml$/.test(ruta);
    if (!esRelacionHoja && !esHoja) continue;
    const texto = await zip.file(ruta).async('string');
    let corregido = texto;
    if (esRelacionHoja) corregido = texto.replace(/<Relationship\b[^>]*\/(comments|vmlDrawing)"[^>]*\/>/g, '');
    if (esHoja) corregido = texto.replace(/<legacyDrawing\b[^>]*\/>/g, '');
    if (corregido !== texto) zip.file(ruta, corregido);
  }
  return zip.generateAsync({ type: 'arraybuffer' });
}

function textoDeCelda(valor) {
  if (valor === null || valor === undefined) return '';
  if (valor instanceof Date) return valor.toISOString().substring(0, 10);
  if (typeof valor === 'object') {
    if (valor.richText) return valor.richText.map((parte) => parte.text).join('');
    if (valor.text !== undefined) return textoDeCelda(valor.text);
    if (valor.result !== undefined) return textoDeCelda(valor.result);
    if (valor.error) return '';
    return '';
  }
  return String(valor).trim();
}

function normalizarEncabezado(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Lee un Excel con la estructura de la plantilla. Ubica las columnas por el
 * texto del encabezado, así que tolera columnas en otro orden o columnas extra.
 * Devuelve { filas, columnasEncontradas, columnasFaltantes, hoja }.
 */
export async function leerExcel(archivo) {
  const ExcelJS = await cargarExcelJS();
  const buffer = await prepararParaLectura(await archivo.arrayBuffer());
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(buffer);

  const hoja = libro.getWorksheet('Inventario') || libro.worksheets[0];
  if (!hoja) throw new Error('El archivo no tiene hojas.');

  const porEncabezado = {};
  for (const campo of CAMPOS) porEncabezado[normalizarEncabezado(campo.label)] = campo.key;

  // Busca la fila de encabezados entre las primeras 5
  let filaEncabezado = 0;
  let columnas = {};
  for (let r = 1; r <= 5 && filaEncabezado === 0; r++) {
    const candidatas = {};
    hoja.getRow(r).eachCell((celda, numero) => {
      const key = porEncabezado[normalizarEncabezado(textoDeCelda(celda.value))];
      if (key) candidatas[numero] = key;
    });
    if (Object.values(candidatas).includes('numero_serie')) {
      filaEncabezado = r;
      columnas = candidatas;
    }
  }
  if (filaEncabezado === 0) {
    throw new Error('No se encontró la fila de encabezados. Use la plantilla del inventario (debe tener la columna «Número de serie»).');
  }

  const filas = [];
  for (let r = filaEncabezado + 1; r <= hoja.rowCount; r++) {
    const fila = hoja.getRow(r);
    const datos = {};
    let tieneDatos = false;
    for (const numero of Object.keys(columnas)) {
      const texto = textoDeCelda(fila.getCell(Number(numero)).value);
      datos[columnas[numero]] = texto;
      if (texto !== '') tieneDatos = true;
    }
    if (tieneDatos) {
      datos._fila = r;
      filas.push(datos);
    }
  }

  const encontradas = Object.values(columnas);
  return {
    hoja: hoja.name,
    filas,
    columnasEncontradas: encontradas,
    columnasFaltantes: CAMPOS.filter((c) => !encontradas.includes(c.key)).map((c) => c.label),
  };
}
