import { useId, useState } from 'react';

// Un campo del formulario según su definición en config/campos.js
export default function CampoEntrada({ campo, valor, alCambiar, opciones, sugerencias, error, aviso, requerido, deshabilitado, mostrarAyuda = true }) {
  const id = useId();
  const idLista = id + '-lista';
  const [verSecreto, setVerSecreto] = useState(false);
  const texto = valor === null || valor === undefined ? '' : valor;

  let control;
  if (campo.tipo === 'lista' && !campo.libre) {
    const lista = opciones || [];
    const fueraDeLista = texto !== '' && !lista.includes(texto);
    control = (
      <select id={id} className="seleccion" value={texto} onChange={(e) => alCambiar(e.target.value)} disabled={deshabilitado}>
        <option value="">Seleccione…</option>
        {lista.map((op) => <option key={op} value={op}>{op}</option>)}
        {fueraDeLista && <option value={texto}>{texto} (fuera del catálogo)</option>}
      </select>
    );
  } else if (campo.tipo === 'textarea') {
    control = <textarea id={id} className="area" value={texto} onChange={(e) => alCambiar(e.target.value)} disabled={deshabilitado} />;
  } else if (campo.tipo === 'secreto') {
    control = (
      <div className="secreto">
        <input
          id={id}
          className="entrada mono"
          type={verSecreto ? 'text' : 'password'}
          autoComplete="off"
          value={texto}
          onChange={(e) => alCambiar(e.target.value)}
          disabled={deshabilitado}
        />
        <button type="button" className="btn btn-chico" onClick={() => setVerSecreto(!verSecreto)}>
          {verSecreto ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
    );
  } else {
    // Texto libre con autocompletado (catálogo + valores ya usados)
    const listaSugerida = [];
    for (const op of opciones || []) if (!listaSugerida.includes(op)) listaSugerida.push(op);
    for (const op of sugerencias || []) if (!listaSugerida.includes(op)) listaSugerida.push(op);
    control = (
      <>
        <input
          id={id}
          className={'entrada' + (campo.mono ? ' mono' : '')}
          value={texto}
          onChange={(e) => alCambiar(e.target.value)}
          list={listaSugerida.length > 0 ? idLista : undefined}
          inputMode={campo.tipo === 'numero' ? 'numeric' : undefined}
          placeholder={campo.ejemplo ? 'Ej.: ' + campo.ejemplo : ''}
          autoComplete="off"
          spellCheck={campo.mono ? false : undefined}
          disabled={deshabilitado}
        />
        {listaSugerida.length > 0 && (
          <datalist id={idLista}>
            {listaSugerida.slice(0, 300).map((op) => <option key={op} value={op} />)}
          </datalist>
        )}
      </>
    );
  }

  return (
    <div className={'campo' + (error ? ' con-error' : '') + (campo.tipo === 'textarea' ? ' ancho-total' : '')}>
      <label htmlFor={id}>
        {campo.label}
        {requerido && <span className="req" aria-label="obligatorio">*</span>}
      </label>
      {control}
      {error && <span className="msg-error">{error}</span>}
      {!error && aviso && <span className="msg-aviso">{aviso}</span>}
      {!error && !aviso && mostrarAyuda && campo.tipo !== 'lista' && <span className="ayuda">{campo.formato}{campo.tipo === 'mac' ? '. Escriba N/A si no tiene.' : ''}</span>}
    </div>
  );
}
