import React from 'react';
import MapViewer from '../map_viewer/MapViewer';
import './MapModal.css';

const MapModal = ({ isOpen, onClose, parcours, currentIndex }) => {
    if (!isOpen) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="map-modal-backdrop" onClick={handleBackdropClick}>
            <div className="map-modal-content">
                <button className="map-modal-close" onClick={onClose}>
                    ✕
                </button>
                <MapViewer parcours={parcours} currentIndex={currentIndex} />
            </div>
        </div>
    );
};

export default MapModal;
