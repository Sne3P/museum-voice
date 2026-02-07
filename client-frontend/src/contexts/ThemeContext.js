import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Vérifier le localStorage d'abord
    const saved = localStorage.getItem('museum-theme');
    if (saved) return saved;
    // Sinon, vérifier la préférence système (mais on préfère light par défaut)
    return 'light';
  });

  useEffect(() => {
    // Appliquer le thème au document
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('museum-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
