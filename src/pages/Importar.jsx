import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useDatos } from '../context/Datos';
import { useAvisar } from '../context/Avisos';
import { CAMPO_POR_KEY } from '../config/campos';
import { leerExcel } from '../lib/excel';
import { normalizarEquipo, normalizarSerie, validarEquipo } from '../lib/normalizar';
import { plural } from '../lib/formato';

const TAMANO_LOTE = 200;

export default function Importar() {
  const { equipos, recargar } = useDatos();
  const avisar = useAvisar();
  const entrada = useRef(null);
  const [encima, setEncima] = useState(false);
  const [leyendo, setLeyendo] = useState(false);
  const [archivo, setArchivo] = useState(null);
  const [lectura, setLectura] = useState(null);
  const [error, setError] = useState('');
  const [omitirVacios, setOmitirVacios] = useState(true);
  const [progreso, setProgreso] = useState(null);
  const [resultado, setResultado] = useState(null);

  async function abrir(file) {
    if (!file) return;
    setError('');
    setResultado(null);
    setLectura(null);
    if (!/\.xlsx$/i.test(file.name)) {
      setError('Elija un archivo .xlsx (Excel). Los archivos .xls antiguos o .csv hay que guardarlos primero como .xlsx.');
      return;
    }
    setArchivo(file);
    setLeyendo(true);
    try {
      setLectura(await leerExcel(file));
    } catch (e) {
      setError('No se pudo leer el archivo: ' + e.message);
    } finally {
      setLeyendo(false);
    }
  }

  // Análisis previo: nuevos, existentes, sin serie, duplicados y formatos dudosos
  const analisis = useMemo(() => {
    if (!lectura) return null;
    const existentes = new Set(equipos.map((e) => e.numero_serie));
    const vistas = new Map();
    const filas = [];
    const sinSerie = [];
    const duplicadas = [];
    const formatos = [];
    let nuevos = 0;
    let actualizan = 0;

    for (const fila of lectura.filas) {
      const serie = normalizarSerie(fila.numero_serie);
      if (!serie) { sinSerie.push(fila._fila); continue; }
      if (vistas.has(serie)) { duplicadas.push({ serie, filas: [vistas.get(serie), fila._fila] }); continue; }
      vistas.set(serie, fila._fila);

      const { _fila, ...datos } = fila;
      const limpio = normalizarEquipo(datos);
      const { errores } = validarEquipo({ ...limpio, numero_serie: serie });
      for (const key of Object.keys(errores)) {
        formatos.push({ fila: _fila, campo: CAMPO_POR_KEY[key].label, valor: datos[key] });
      }
      if (existentes.has(serie)) actualizan++;
      else nuevos++;
      filas.push(limpio);
    }
    return { filas, nuevos, actualizan, sinSerie, duplicadas, formatos };
  }, [lectura, equipos]);

  async function importar() {
    const filas = analisis.filas;
    const total = { creados: 0, actualizados: 0, errores: [] };
    setProgreso(0);
    try {
      for (let i = 0; i < filas.length; i += TAMANO_LOTE) {
        const lote = filas.slice(i, i + TAMANO_LOTE);
        const r = await api.importarEquipos(lote, omitirVacios);
        total.creados += r.creados;
        total.actualizados += r.actualizados;
        for (const err of r.errores || []) total.errores.push(err);
        setProgreso(Math.min(filas.length, i + TAMANO_LOTE));
      }
      setResultado(total);
      avisar('Importación terminada: ' + total.creados + ' nuevos, ' + total.actualizados + ' actualizados.');
    } catch (e) {
      setError('La importación se detuvo: ' + e.message + '. Lo procesado hasta ese punto sí quedó guardado.');
      setResultado(total);
    } finally {
      setProgreso(null);
      setLectura(null);
      await recargar();
    }
  }

  return (
    <main className="pagina pagina-angosta">
      <div className="encabezado">
        <div>
          <h1>Importar desde Excel</h1>
          <p>Use la plantilla del inventario (hoja «Inventario», encabezados en la fila 2). Las columnas se reconocen por su título.</p>
        </div>
      </div>

      {error && <div className="alerta alerta-error">{error}</div>}

      {resultado && (
        <div className="caja">
          <h2>Importación terminada</h2>
          <div className="cifras">
            <div><b>{resultado.creados}</b><span>equipos nuevos</span></div>
            <div><b>{resultado.actualizados}</b><span>actualizados</span></div>
            <div><b>{resultado.errores.length}</b><span>con error</span></div>
          </div>
          {resultado.errores.length > 0 && (
            <div className="alerta alerta-error">
              Estas filas no se guardaron:
              <ul>{resultado.errores.slice(0, 50).map((e, i) => <li key={i}><span className="mono">{e.numero_serie}</span>: {e.error}</li>)}</ul>
            </div>
          )}
          <div className="acciones">
            <Link className="btn btn-primario" to="/">Ver equipos</Link>
            <button className="btn" type="button" onClick={() => { setResultado(null); setArchivo(null); }}>Importar otro archivo</button>
          </div>
        </div>
      )}

      {!resultado && !lectura && (
        <div
          className={'zona-archivo' + (encima ? ' encima' : '')}
          role="button"
          tabIndex={0}
          onClick={() => entrada.current.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') entrada.current.click(); }}
          onDragOver={(e) => { e.preventDefault(); setEncima(true); }}
          onDragLeave={() => setEncima(false)}
          onDrop={(e) => { e.preventDefault(); setEncima(false); abrir(e.dataTransfer.files[0]); }}
        >
          <strong>{leyendo ? 'Leyendo ' + archivo.name + '…' : 'Arrastre aquí el Excel o haga clic para elegirlo'}</strong>
          <span className="muted">Archivo .xlsx con la estructura de Inventario_temporal.xlsx</span>
          <input ref={entrada} type="file" accept=".xlsx" hidden onChange={(e) => { abrir(e.target.files[0]); e.target.value = ''; }} />
        </div>
      )}

      {analisis && (
        <div className="caja">
          <h2>{archivo.name}</h2>
          <p className="muted">Hoja «{lectura.hoja}», {plural(lectura.filas.length, 'fila con datos', 'filas con datos')}.</p>
          <div className="cifras">
            <div><b>{analisis.nuevos}</b><span>equipos nuevos</span></div>
            <div><b>{analisis.actualizan}</b><span>ya existen y se actualizan</span></div>
            <div><b>{analisis.sinSerie.length + analisis.duplicadas.length}</b><span>se omiten</span></div>
          </div>

          {lectura.columnasFaltantes.length > 0 && (
            <div className="alerta alerta-aviso">
              No se encontraron estas columnas y quedarán sin cambios: {lectura.columnasFaltantes.join(', ')}.
            </div>
          )}
          {analisis.sinSerie.length > 0 && (
            <div className="alerta alerta-aviso">
              {plural(analisis.sinSerie.length, 'fila no tiene', 'filas no tienen')} número de serie y se omiten (filas {analisis.sinSerie.slice(0, 20).join(', ')}{analisis.sinSerie.length > 20 ? '…' : ''}).
            </div>
          )}
          {analisis.duplicadas.length > 0 && (
            <div className="alerta alerta-aviso">
              Números de serie repetidos en el archivo; solo se importa la primera aparición:
              <ul>{analisis.duplicadas.slice(0, 20).map((d) => <li key={d.serie + d.filas[1]}><span className="mono">{d.serie}</span> en filas {d.filas.join(' y ')}</li>)}</ul>
            </div>
          )}
          {analisis.formatos.length > 0 && (
            <div className="alerta alerta-aviso">
              {plural(analisis.formatos.length, 'dato tiene', 'datos tienen')} un formato distinto al esperado. Se importan tal cual para que pueda corregirlos después:
              <ul>{analisis.formatos.slice(0, 20).map((f, i) => <li key={i}>Fila {f.fila}, {f.campo}: <span className="mono">{f.valor}</span></li>)}</ul>
              {analisis.formatos.length > 20 && <span>…y {analisis.formatos.length - 20} más.</span>}
            </div>
          )}

          <label className="casilla" style={{ margin: '14px 0' }}>
            <input type="checkbox" checked={omitirVacios} onChange={(e) => setOmitirVacios(e.target.checked)} />
            <span>
              <b>No borrar datos con celdas vacías.</b><br />
              <span className="muted">Si un equipo ya existe y su celda en el Excel está vacía, se conserva lo que hay en el sistema. Desmárquelo solo si el Excel es la versión más completa.</span>
            </span>
          </label>

          {progreso !== null && (
            <>
              <div className="progreso"><div style={{ width: (progreso / analisis.filas.length) * 100 + '%' }} /></div>
              <p className="muted">{progreso} de {analisis.filas.length}</p>
            </>
          )}

          <div className="acciones">
            <button className="btn btn-primario" type="button" onClick={importar} disabled={progreso !== null || analisis.filas.length === 0}>
              {progreso !== null ? 'Importando…' : 'Importar ' + plural(analisis.filas.length, 'equipo', 'equipos')}
            </button>
            <button className="btn" type="button" onClick={() => { setLectura(null); setArchivo(null); }} disabled={progreso !== null}>Elegir otro archivo</button>
          </div>
        </div>
      )}
    </main>
  );
}
