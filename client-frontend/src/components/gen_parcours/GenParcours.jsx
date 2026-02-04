import React from 'react';
import './GenParcours.css';

const GenParcours = ({ onClick, disabled = false, loading = false }) => (
  <div className="gen-parcours-wrapper">
    <button
      className={`gen-parcours-btn ${disabled ? 'disabled' : ''} ${loading ? 'loading' : ''}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <>
          <span className="gen-parcours-spinner" />
          <span>Génération en cours...</span>
        </>
      ) : (
        <>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
          <span>Lancer mon parcours</span>
        </>
      )}
    </button>
  </div>
);

export default GenParcours;