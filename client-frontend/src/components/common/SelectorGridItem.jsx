// SelectorGridItem.jsx
import React from 'react';
import '../criteria_selector/CriteriaSelector.css'; // CSS commun pour les grilles

const SelectorGridItem = ({ id, title, imageUrl, textOverlay, isSelected, onClick }) => {
  return (
    <div 
      className={`grid-item ${isSelected ? 'selected' : ''}`}
      style={{ backgroundImage: `url(${imageUrl})` }}
      onClick={onClick}
    >
      {/* Affichage spécial pour la tuile de texte (néo-classique) */}
      {textOverlay && (
        <div className="text-overlay">
          <span className="star">★</span>
          <p>{textOverlay}</p>
          <span className="star">★</span>
        </div>
      )}

      {/* Bandeau de titre en bas */}
      <div className={`title-bar ${id}`}>
        {title}
      </div>
    </div>
  );
};

export default SelectorGridItem;