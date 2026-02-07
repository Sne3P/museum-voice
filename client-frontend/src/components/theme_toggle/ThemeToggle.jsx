import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import './ThemeToggle.css';

const ThemeToggle = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button 
      className={`theme-toggle-btn ${className}`}
      onClick={toggleTheme}
      aria-label={`Passer en mode ${theme === 'light' ? 'sombre' : 'clair'}`}
    >
      <span className="theme-toggle-track">
        <span className="theme-toggle-thumb" />
        <span className="theme-toggle-icon sun">☀️</span>
        <span className="theme-toggle-icon moon">🌙</span>
      </span>
    </button>
  );
};

export default ThemeToggle;
