'use client';
import { useState, useEffect } from 'react';

export function useDark(): boolean {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // Leer estado inicial
    const saved = globalThis.localStorage.getItem('nexora_theme');
    setDark(saved === 'dark');

    // Escuchar cambios del toggle del sidebar
    const observer = new MutationObserver(() => {
      setDark(document.documentElement.getAttribute('data-theme') === 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return dark;
}