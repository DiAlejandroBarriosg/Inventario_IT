import { crearApiSupabase } from './supabaseApi';
import { crearApiDemo } from './demoApi';

const url = import.meta.env.VITE_SUPABASE_URL;
const llave = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Con las variables de .env se conecta a Supabase; sin ellas arranca en modo demostración.
export const api = url && llave ? crearApiSupabase(url, llave) : crearApiDemo();
export const esDemo = api.modo === 'demo';
