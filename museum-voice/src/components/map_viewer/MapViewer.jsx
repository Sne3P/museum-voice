import React, { useEffect, useState, useRef } from 'react';
import './MapViewer.css';

const MapViewer = ({ parcours, currentIndex }) => {
    const [mapData, setMapData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 1000, height: 800 });
    const svgRef = useRef(null);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(1);

    useEffect(() => {
        if (!parcours || !parcours.artworks) return;

        // Préparer les données pour l'API
        const artworks = parcours.artworks.map(artwork => ({
            oeuvre_id: artwork.oeuvre_id,
            order: artwork.order
        }));

        // Récupérer les données du plan
        fetch('/api/parcours/map', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ artworks })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setMapData(data.map_data);
                    
                    // Calculer le viewBox optimal
                    const allPoints = [];
                    data.map_data.artworks.forEach(a => allPoints.push({ x: a.x, y: a.y }));
                    data.map_data.rooms.forEach(room => {
                        room.polygon_points.forEach(p => allPoints.push(p));
                    });

                    if (allPoints.length > 0) {
                        const xs = allPoints.map(p => p.x);
                        const ys = allPoints.map(p => p.y);
                        const minX = Math.min(...xs) - 50;
                        const minY = Math.min(...ys) - 50;
                        const maxX = Math.max(...xs) + 50;
                        const maxY = Math.max(...ys) + 50;
                        
                        setViewBox({
                            x: minX,
                            y: minY,
                            width: maxX - minX,
                            height: maxY - minY
                        });
                    }
                }
                setLoading(false);
            })
            .catch(err => {
                console.error('Erreur chargement plan:', err);
                setLoading(false);
            });
    }, [parcours]);

    // Gestion du zoom avec useEffect pour éviter l'erreur passive listener
    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return;

        const handleWheel = (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 1.1 : 0.9;
            setScale(prev => Math.max(0.5, Math.min(3, prev * delta)));
        };

        svg.addEventListener('wheel', handleWheel, { passive: false });
        
        return () => {
            svg.removeEventListener('wheel', handleWheel);
        };
    }, []);

    // Gestion du pan (déplacement)
    const handleMouseDown = (e) => {
        setIsPanning(true);
        setPanStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e) => {
        if (!isPanning) return;
        
        const dx = (e.clientX - panStart.x) * (viewBox.width / 800) / scale;
        const dy = (e.clientY - panStart.y) * (viewBox.height / 600) / scale;
        
        setViewBox(prev => ({
            ...prev,
            x: prev.x - dx,
            y: prev.y - dy
        }));
        
        setPanStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
        setIsPanning(false);
    };

    if (loading) {
        return <div className="map-viewer-loading">Chargement du plan...</div>;
    }

    if (!mapData) {
        return <div className="map-viewer-error">Plan non disponible</div>;
    }

    const currentArtwork = parcours.artworks[currentIndex];

    return (
        <div className="map-viewer-container">
            <div className="map-viewer-header">
                <h3>Plan du musée</h3>
                <div className="map-controls">
                    <button onClick={() => setScale(prev => Math.min(3, prev * 1.2))}>➕</button>
                    <button onClick={() => setScale(prev => Math.max(0.5, prev * 0.8))}>➖</button>
                    <button onClick={() => setScale(1)}>Reset</button>
                </div>
            </div>
            
            <svg
                ref={svgRef}
                className={`map-viewer-svg ${isPanning ? 'panning' : ''}`}
                viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width / scale} ${viewBox.height / scale}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {/* Dessiner les salles */}
                {mapData.rooms.map(room => (
                    <g key={room.room_id}>
                        <polygon
                            points={room.polygon_points.map(p => `${p.x},${p.y}`).join(' ')}
                            className="room-polygon"
                            fill="#f0f0f0"
                            stroke="#333"
                            strokeWidth="2"
                        />
                        {room.polygon_points.length > 0 && (
                            <text
                                x={room.polygon_points.reduce((sum, p) => sum + p.x, 0) / room.polygon_points.length}
                                y={room.polygon_points.reduce((sum, p) => sum + p.y, 0) / room.polygon_points.length}
                                className="room-label"
                                textAnchor="middle"
                                fill="#666"
                                fontSize="14"
                            >
                                {room.name}
                            </text>
                        )}
                    </g>
                ))}

                {/* Dessiner les connexions entre œuvres (chemin) */}
                {mapData.artworks.length > 1 && (
                    <polyline
                        points={mapData.artworks.map(a => `${a.x},${a.y}`).join(' ')}
                        className="parcours-path"
                        fill="none"
                        stroke="#5dace2"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                    />
                )}

                {/* Dessiner les œuvres */}
                {mapData.artworks.map((artwork, idx) => {
                    const isCurrent = artwork.oeuvre_id === currentArtwork?.oeuvre_id;
                    const isPast = idx < currentIndex;
                    
                    return (
                        <g key={artwork.oeuvre_id}>
                            {/* Point de l'œuvre */}
                            <circle
                                cx={artwork.x}
                                cy={artwork.y}
                                r={isCurrent ? 12 : 8}
                                className={`artwork-point ${isCurrent ? 'current' : ''} ${isPast ? 'visited' : ''}`}
                                fill={isCurrent ? '#ff0000' : isPast ? '#888' : '#5dace2'}
                                stroke="#fff"
                                strokeWidth="2"
                            />
                            
                            {/* Numéro de l'ordre */}
                            <text
                                x={artwork.x}
                                y={artwork.y}
                                className="artwork-order"
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill="#fff"
                                fontSize="10"
                                fontWeight="bold"
                            >
                                {artwork.order}
                            </text>
                            
                            {/* Label avec titre (seulement pour l'œuvre actuelle) */}
                            {isCurrent && (
                                <g>
                                    <rect
                                        x={artwork.x + 15}
                                        y={artwork.y - 12}
                                        width={artwork.title.length * 6 + 10}
                                        height="24"
                                        fill="#ff0000"
                                        stroke="#fff"
                                        strokeWidth="1"
                                        rx="3"
                                    />
                                    <text
                                        x={artwork.x + 20}
                                        y={artwork.y + 3}
                                        className="artwork-label"
                                        fill="#fff"
                                        fontSize="12"
                                        fontWeight="bold"
                                    >
                                        {artwork.title}
                                    </text>
                                </g>
                            )}
                        </g>
                    );
                })}
            </svg>

            <div className="map-viewer-legend">
                <div className="legend-item">
                    <div className="legend-color" style={{backgroundColor: '#ff0000'}}></div>
                    <span>Œuvre actuelle</span>
                </div>
                <div className="legend-item">
                    <div className="legend-color" style={{backgroundColor: '#5dace2'}}></div>
                    <span>Œuvre à venir</span>
                </div>
                <div className="legend-item">
                    <div className="legend-color" style={{backgroundColor: '#888'}}></div>
                    <span>Œuvre visitée</span>
                </div>
            </div>
        </div>
    );
};

export default MapViewer;
