import { useEffect } from 'react';

// Versión técnica de la etapa 001: aplica el tema guardado y muestra una pantalla de transición.
// El router, la autenticación y los módulos se incorporan en las etapas siguientes.
function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Ambienta POS</h1>
      <p style={{ color: 'var(--text-secondary)' }}>Reconstrucción por etapas del frontend: estructura inicial.</p>
    </main>
  );
}

export default App;
