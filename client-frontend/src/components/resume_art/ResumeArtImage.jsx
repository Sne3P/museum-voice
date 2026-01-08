import React, { useState } from "react";
import "./ResumeArt.css";

const ImageZoomModal = ({ imageUrl, title, onClose }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.max(1, Math.min(5, prev * delta)));
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
    } else if (e.touches.length === 2) {
      // Pinch to zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      e.target.dataset.initialDistance = distance;
      e.target.dataset.initialScale = scale;
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && isDragging) {
      e.preventDefault();
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      const initialDistance = parseFloat(e.target.dataset.initialDistance);
      const initialScale = parseFloat(e.target.dataset.initialScale);
      const newScale = initialScale * (distance / initialDistance);
      setScale(Math.max(1, Math.min(5, newScale)));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleMouseDown = (e) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div 
      className="image-zoom-modal" 
      onClick={(e) => e.target.className === 'image-zoom-modal' && onClose()}
    >
      <button className="zoom-close-btn" onClick={onClose}>✕</button>
      <div className="zoom-controls">
        <button onClick={() => setScale(Math.min(5, scale * 1.2))}>+</button>
        <span>{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale(Math.max(1, scale * 0.8))}>-</button>
        <button onClick={() => { setScale(1); setPosition({ x: 0, y: 0 }); }}>Reset</button>
      </div>
      <img
        src={imageUrl}
        alt={title}
        className="zoom-image"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
        }}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        draggable={false}
      />
    </div>
  );
};

const ResumeArtImage = ({ imageUrl, title }) => {
  const [showZoomModal, setShowZoomModal] = useState(false);
  
  // Utiliser l'image de l'œuvre si disponible, sinon image par défaut
  const imageSrc = imageUrl || "/placeholder.svg";
  const imageAlt = title || "Museum Artwork";

  return (
    <>
      <div className="resume-art-image-container">
        <img
          src={imageSrc}
          alt={imageAlt}
          className="resume-art-image"
        />
        <button 
          className="image-zoom-btn" 
          onClick={() => setShowZoomModal(true)}
          title="Agrandir l'image"
        >
          🔍
        </button>
      </div>
      
      {showZoomModal && (
        <ImageZoomModal 
          imageUrl={imageSrc} 
          title={imageAlt} 
          onClose={() => setShowZoomModal(false)} 
        />
      )}
    </>
  );
};

export default ResumeArtImage;
