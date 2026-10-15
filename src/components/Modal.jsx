import { useEffect, useRef } from 'react';

export default function Modal({ titulo, descripcion, children, pie, alCerrar, ancho }) {
  const caja = useRef(null);

  useEffect(() => {
    const anterior = document.activeElement;
    const primero = caja.current && caja.current.querySelector('input, select, textarea, button');
    if (primero) primero.focus();

    function tecla(e) {
      if (e.key === 'Escape') alCerrar();
    }
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('keydown', tecla);
      if (anterior && anterior.focus) anterior.focus();
    };
  }, [alCerrar]);

  return (
    <div className="fondo-modal" onMouseDown={(e) => { if (e.target === e.currentTarget) alCerrar(); }}>
      <div className={'modal' + (ancho ? ' modal-ancho' : '')} role="dialog" aria-modal="true" aria-labelledby="titulo-modal" ref={caja}>
        <header>
          <h2 id="titulo-modal">{titulo}</h2>
          {descripcion && <p>{descripcion}</p>}
        </header>
        <div className="cuerpo">{children}</div>
        {pie && <footer>{pie}</footer>}
      </div>
    </div>
  );
}
