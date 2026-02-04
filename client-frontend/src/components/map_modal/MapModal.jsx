import React from 'react';
import MapViewer from '../map_viewer/MapViewer';
import './MapModal.css';

const CloseIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
);

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
                <div className="map-modal-header">
                    <h2 className="map-modal-title">Plan du parcours</h2>
                    <button className="map-modal-close" onClick={onClose}>
                        <CloseIcon />
                    </button>
                </div>
                <div className="map-modal-body">
                    <MapViewer parcours={parcours} currentIndex={currentIndex} />
                </div>
            </div>
        </div>
    );
};

export default MapModal;
