import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import MapModal from "../../components/map_modal/MapModal";
import { checkSession } from "../../utils/session";
import "./Resume.css";

// Icons as inline SVGs
const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z"/>
  </svg>
);

const PauseIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16"/>
    <rect x="14" y="4" width="4" height="16"/>
  </svg>
);

const SkipBackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="19 20 9 12 19 4 19 20"/>
    <line x1="5" y1="19" x2="5" y2="5"/>
  </svg>
);

const SkipForwardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 4 15 12 5 20 5 4"/>
    <line x1="19" y1="5" x2="19" y2="19"/>
  </svg>
);

const ImageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);

const TextIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="17" y1="10" x2="3" y2="10"/>
    <line x1="21" y1="6" x2="3" y2="6"/>
    <line x1="21" y1="14" x2="3" y2="14"/>
    <line x1="17" y1="18" x2="3" y2="18"/>
  </svg>
);

const MapIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
    <line x1="8" y1="2" x2="8" y2="18"/>
    <line x1="16" y1="6" x2="16" y2="22"/>
  </svg>
);

const Resume = () => {
  const navigate = useNavigate();
  const [parcours, setParcours] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [showText, setShowText] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  
  // Audio state
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Swipe state
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const swipeContainerRef = useRef(null);
  
  // Les fichiers audio sont servis par nginx depuis /uploads/audio/ - URLs relatives

  // Check session
  useEffect(() => {
    checkSession().then(({ valid }) => {
      if (!valid) {
        console.warn('Session invalide ou expirée');
        navigate('/');
      }
    });
  }, [navigate]);

  // Load parcours
  useEffect(() => {
    const storedParcours = localStorage.getItem('generatedParcours');
    if (!storedParcours) {
      navigate('/mes-choix');
      return;
    }
    try {
      const parsedParcours = JSON.parse(storedParcours);
      setParcours(parsedParcours);
      setLoading(false);
    } catch (error) {
      console.error("Erreur parsing parcours:", error);
      navigate('/mes-choix');
    }
  }, [navigate]);

  // Hide swipe hint after first interaction
  useEffect(() => {
    const timeout = setTimeout(() => setShowSwipeHint(false), 5000);
    return () => clearTimeout(timeout);
  }, []);

  // Audio handling
  const currentArtwork = parcours?.artworks?.[currentIndex];
  // Les audio_path sont des URLs relatives comme /uploads/audio/...
  // Nginx sert ces fichiers directement
  const audioUrl = currentArtwork?.audio_path || null;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    audio.load();
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration || 0);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, audioUrl]);

  const skipBackward = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
  }, []);

  const skipForward = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 10);
  }, [duration]);

  const handleProgressClick = useCallback((e) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = percent * duration;
  }, [duration]);

  // Swipe handling
  const handleTouchStart = useCallback((e) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
    setShowSwipeHint(false);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    setTranslateX(diff);
  }, [isDragging, startX]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging || !parcours) return;
    setIsDragging(false);
    
    const threshold = 80;
    if (translateX > threshold && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else if (translateX < -threshold && currentIndex < parcours.artworks.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
    setTranslateX(0);
  }, [isDragging, translateX, currentIndex, parcours]);

  // Format time
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate remaining time
  const calculateRemainingTime = () => {
    if (!parcours?.metadata?.duration_breakdown) return '--:--';
    const totalMinutes = parcours.metadata.duration_breakdown.total_minutes;
    const elapsedMinutes = parcours.artworks.slice(0, currentIndex).reduce((sum, artwork) => {
      const narrationMinutes = (artwork.narration_duration || 0) / 60;
      return sum + narrationMinutes + 2;
    }, 0);
    const remainingMinutes = Math.max(0, totalMinutes - elapsedMinutes);
    const hours = Math.floor(remainingMinutes / 60);
    const minutes = Math.floor(remainingMinutes % 60);
    return hours > 0 ? `${hours}h ${minutes}min` : `${minutes} min`;
  };

  if (loading || !parcours) {
    return (
      <div className="loading-overlay">
        <div className="loading-spinner" />
        <p>Chargement du parcours...</p>
      </div>
    );
  }

  if (!parcours.artworks || parcours.artworks.length === 0) {
    return (
      <div className="error-container">
        <div className="error-card">
          <svg className="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <h2>Aucune œuvre disponible</h2>
          <p>Impossible de générer un parcours avec vos critères. Veuillez modifier vos choix et réessayer.</p>
          <button className="btn-back" onClick={() => navigate('/mes-choix')}>
            Modifier mes choix
          </button>
        </div>
      </div>
    );
  }

  const artwork = parcours.artworks[currentIndex];
  const totalArtworks = parcours.artworks.length;
  const progressPercent = ((currentIndex + 1) / totalArtworks) * 100;
  // Les images peuvent être des URLs absolues ou relatives
  const imageUrl = artwork?.image_link || null;

  return (
    <div className="resume-page">
      {/* Hidden Audio Element */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      {/* Progress Header */}
      <div className="progress-header">
        <div className="progress-header-content">
          <div className="progress-info">
            <span className="progress-count">{currentIndex + 1} sur {totalArtworks}</span>
            <span className="progress-time">{calculateRemainingTime()} restant</span>
          </div>
          <div className="progress-bar-mini">
            <div 
              className="progress-bar-mini-fill" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
      <div className="progress-header-spacer" />

      {/* Swipe Container */}
      <div 
        className="swipe-container"
        ref={swipeContainerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className={`swipe-track ${isDragging ? 'dragging' : ''}`}
          style={{ 
            transform: `translateX(calc(-${currentIndex * 100}% + ${translateX}px))` 
          }}
        >
          {parcours.artworks.map((art, index) => {
            // Les images peuvent être des URLs absolues ou relatives
            const artImageUrl = art?.image_link || null;
            
            return (
              <div key={art.oeuvre_id || index} className="swipe-slide">
                <div className="artwork-hero">
                  {/* Toggle Button */}
                  <button 
                    className="toggle-view-btn"
                    onClick={() => setShowText(!showText)}
                    aria-label={showText ? "Voir l'image" : "Voir le texte"}
                  >
                    {showText ? <ImageIcon /> : <TextIcon />}
                  </button>

                  {showText ? (
                    <div className="artwork-text-view">
                      <p className="artwork-narration">
                        {art.narration || "Description non disponible"}
                      </p>
                    </div>
                  ) : (
                    <div className="artwork-image-container">
                      {artImageUrl ? (
                        <img 
                          src={artImageUrl} 
                          alt={art.title || 'Œuvre'} 
                          className="artwork-image"
                          loading={Math.abs(index - currentIndex) <= 1 ? "eager" : "lazy"}
                        />
                      ) : (
                        <div className="artwork-placeholder">
                          <ImageIcon />
                        </div>
                      )}
                      <div className="artwork-gradient" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Swipe Hint */}
        {showSwipeHint && totalArtworks > 1 && (
          <div className="swipe-hint">
            <div className="swipe-hint-icon">
              <span>←</span>
              <span>→</span>
            </div>
            <span>Glissez pour naviguer</span>
          </div>
        )}
      </div>

      {/* Artwork Info */}
      <div className="artwork-info-bar">
        <h1 className="artwork-title">{artwork.title || "Titre inconnu"}</h1>
        <p className="artwork-artist">{artwork.artist || "Artiste inconnu"}</p>
        <div className="artwork-meta">
          {artwork.date && (
            <span className="artwork-meta-item">{artwork.date}</span>
          )}
          {artwork.materiaux_technique && (
            <span className="artwork-meta-item">{artwork.materiaux_technique}</span>
          )}
          {artwork.position?.room && (
            <span className="artwork-meta-item">Salle {artwork.position.room}</span>
          )}
        </div>
      </div>

      {/* Navigation Dots */}
      <div className="nav-dots">
        {parcours.artworks.map((_, index) => (
          <button
            key={index}
            className={`nav-dot ${index === currentIndex ? 'active' : ''}`}
            onClick={() => setCurrentIndex(index)}
            aria-label={`Aller à l'œuvre ${index + 1}`}
          />
        ))}
      </div>

      {/* Audio Player */}
      <div className="audio-player">
        {audioUrl && (
          <>
            <div className="audio-progress">
              <div 
                className="audio-progress-bar" 
                onClick={handleProgressClick}
              >
                <div 
                  className="audio-progress-fill" 
                  style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
                />
                <div 
                  className="audio-progress-thumb"
                  style={{ left: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
                />
              </div>
              <div className="audio-time">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </>
        )}
        
        <div className="audio-controls">
          <button 
            className="audio-btn audio-btn-skip" 
            onClick={skipBackward}
            disabled={!audioUrl}
            aria-label="Reculer de 10 secondes"
          >
            <SkipBackIcon />
          </button>
          
          <button 
            className="audio-btn audio-btn-play" 
            onClick={togglePlay}
            disabled={!audioUrl}
            aria-label={isPlaying ? "Pause" : "Lecture"}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          
          <button 
            className="audio-btn audio-btn-skip" 
            onClick={skipForward}
            disabled={!audioUrl}
            aria-label="Avancer de 10 secondes"
          >
            <SkipForwardIcon />
          </button>
        </div>
      </div>

      {/* Map Button */}
      <button 
        className="map-btn"
        onClick={() => setIsMapOpen(true)}
        aria-label="Voir le plan"
      >
        <MapIcon />
      </button>

      {/* Map Modal */}
      <MapModal 
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        parcours={parcours}
        currentIndex={currentIndex}
      />
    </div>
  );
};

export default Resume;
