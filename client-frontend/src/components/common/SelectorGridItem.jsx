// SelectorGridItem.jsx - Modern Design
import React, { useState } from 'react';
import '../criteria_selector/CriteriaSelector.css';

const SelectorGridItem = ({ id, title, imageUrl, isSelected, onClick }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const hasValidImage = imageUrl && !imageUrl.includes('placeholder') && !imageError;

  return (
    <div 
      className={`grid-item ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      {hasValidImage ? (
        <img 
          src={imageUrl} 
          alt={title}
          className={`grid-item-image ${imageLoaded ? 'loaded' : ''}`}
          onError={() => setImageError(true)}
          onLoad={() => setImageLoaded(true)}
          loading="lazy"
        />
      ) : (
        <div className="grid-item-placeholder">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </div>
      )}
      
      <div className="title-bar">
        <span>{title}</span>
      </div>
    </div>
  );
};

export default SelectorGridItem;