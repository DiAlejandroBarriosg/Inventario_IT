import { CAMPOS, aplicaCampo } from '../config/campos';

export function limpiar(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor).trim();
}

export function normalizarSerie(valor) {
  return limpiar(valor).replace(/\s+/g, '').toUpperCase();
}

// Acepta aa:bb:cc:dd:ee:ff, aabb.ccdd.eeff, AABBCCDDEEFF... y devuelve AA-BB-CC-DD-EE-FF
export function normalizarMac(valor) {
  const texto = limpiar(valor);
  if (texto === '') return '';
  if (esNoAplica(texto)) return 'N/A';
  const hex = texto.replace(/[^0-9a-fA-F]/g, '').toUpperCase();
  if (hex.length !== 12) return texto.toUpperCase();
  const pares = [];
  for (let i = 0; i < 12; i += 2) pares.push(hex.substring(i, i + 2));
  return pares.join('-');
}

const REGEX_MAC = /^([0-9A-F]{2}-){5}[0-9A-F]{2}$/;

// "N/A", "NA", "No tiene", "No aplica" o "-": el equipo no tiene ese dato (p. ej. sin segundo puerto LAN).
// Cuenta como campo lleno y se guarda como N/A.
const REGEX_NO_APLICA = /^(n\/?a|no tiene|no aplica|ninguno|ninguna|-)$/i;

export function esNoAplica(valor) {
  return REGEX_NO_APLICA.test(limpiar(valor));
}
const REGEX_NUMERO = /^\d+$/;
const REGEX_NOMBRE = /^[A-Z0-9]+(-[A-Z0-9]+)*-\d+$/;

export function esIpValida(texto) {
  const partes = texto.split('.');
  if (partes.length !== 4) return false;
  for (const parte of partes) {
    if (!REGEX_NUMERO.test(parte)) return false;
    if (Number(parte) > 255) return false;
  }
  return true;
}

// Normaliza todos los campos de un equipo antes de guardarlo
export function normalizarEquipo(datos) {
  const salida = {};
  for (const campo of CAMPOS) {
    if (!(campo.key in datos)) continue;
    let valor = limpiar(datos[campo.key]);
    if (campo.key === 'numero_serie') valor = normalizarSerie(valor);
    if (campo.key === 'nombre_equipo') valor = valor.toUpperCase();
    if (campo.tipo === 'mac') valor = normalizarMac(valor);
    if ((campo.tipo === 'ip' || campo.tipo === 'numero') && esNoAplica(valor)) valor = 'N/A';
    salida[campo.key] = valor === '' ? null : valor;
  }
  return salida;
}

// Devuelve { errores, avisos } como objetos { campoKey: mensaje }.
// Los errores impiden guardar; los avisos no (permiten ir llenando poco a poco).
export function validarEquipo(datos) {
  const errores = {};
  const avisos = {};

  for (const campo of CAMPOS) {
    const valor = limpiar(datos[campo.key]);

    if (valor === '') {
      if (campo.key === 'numero_serie') errores[campo.key] = 'El número de serie es obligatorio.';
      else if (campo.obligatorio === 'Sí' && aplicaCampo(campo, datos)) avisos[campo.key] = 'Campo obligatorio pendiente de llenar.';
      continue;
    }

    if ((campo.tipo === 'mac' || campo.tipo === 'ip' || campo.tipo === 'numero') && esNoAplica(valor)) continue;

    if (campo.tipo === 'mac' && !REGEX_MAC.test(normalizarMac(valor))) {
      errores[campo.key] = 'Use el formato XX-XX-XX-XX-XX-XX (12 dígitos hexadecimales).';
    }
    if (campo.tipo === 'ip' && !esIpValida(valor)) {
      errores[campo.key] = 'Escriba una dirección IPv4 válida, por ejemplo 10.10.20.45.';
    }
    if (campo.tipo === 'numero' && !REGEX_NUMERO.test(valor)) {
      errores[campo.key] = 'Solo números, sin espacios ni guiones.';
    }
    if (campo.key === 'nombre_equipo' && !REGEX_NOMBRE.test(valor.toUpperCase())) {
      avisos[campo.key] = 'El formato esperado es PREFIJO-NN, por ejemplo MED-014.';
    }
  }

  return { errores, avisos };
}

// Diferencia entre el original y lo editado: solo las llaves que cambiaron
export function diferencias(original, editado) {
  const cambios = {};
  for (const key of Object.keys(editado)) {
    const antes = original[key] === undefined ? null : original[key];
    const despues = editado[key] === undefined ? null : editado[key];
    if ((antes || null) !== (despues || null)) cambios[key] = despues;
  }
  return cambios;
}

// Texto para buscar: une los campos donde tiene sentido buscar
const CAMPOS_BUSQUEDA = ['nombre_equipo', 'numero_serie', 'encargado', 'unidad', 'oficina', 'oficina_salon', 'edificio',
  'mac_lan', 'mac_lan2', 'mac_wifi', 'ip', 'teamviewer_id', 'orden_compra', 'procesador', 'monitores', 'observaciones', 'extension'];

export function textoBusqueda(equipo) {
  const partes = [];
  for (const key of CAMPOS_BUSQUEDA) {
    if (equipo[key]) partes.push(String(equipo[key]));
  }
  return sinAcentos(partes.join(' | ').toLowerCase());
}

export function sinAcentos(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Para buscar una MAC sin importar si se escribe con : - o sin separadores
export function textoBusquedaCompacto(texto) {
  return texto.replace(/[^0-9a-z]/gi, '').toLowerCase();
}
