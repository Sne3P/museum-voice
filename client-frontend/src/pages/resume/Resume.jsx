import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import MapModal from "../../components/map_modal/MapModal";
import ThemeToggle from "../../components/theme_toggle/ThemeToggle";
import { checkSession } from "../../utils/session";
import "./Resume.css";

// Icons
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
  const [viewMode, setViewMode] = useState('image'); // 'image' or 'text'
  const [showTutorial, setShowTutorial] = useState(true);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Audio state
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Swipe state
  const [swipeX, setSwipeX] = useState(0);
  const [swipeY, setSwipeY] = useState(0);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState(null); // 'horizontal' or 'vertical'
  const [isInScrollableArea, setIsInScrollableArea] = useState(false);
  
  const containerRef = useRef(null);
  const textScrollRef = useRef(null);

  // Check session
  useEffect(() => {
    checkSession().then(({ valid }) => {
      if (!valid) {
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
      
      // Check if tutorial was already seen
      const tutorialSeen = localStorage.getItem('resumeTutorialSeen');
      if (tutorialSeen) {
        setShowTutorial(false);
      }
    } catch (error) {
      console.error("Erreur parsing parcours:", error);
      navigate('/mes-choix');
    }
  }, [navigate]);

  // Audio handling
  const currentArtwork = parcours?.artworks?.[currentIndex];
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

  // Swipe handlers
  const handleTouchStart = useCallback((e) => {
    if (showTutorial) return;
    const touch = e.touches[0];
    setStartX(touch.clientX);
    setStartY(touch.clientY);
    setIsDragging(true);
    setSwipeDirection(null);
    
    // Check if touch started in scrollable text area
    const scrollableEl = textScrollRef.current;
    if (scrollableEl && viewMode === 'text') {
      const rect = scrollableEl.getBoundingClientRect();
      const isInArea = (
        touch.clientX >= rect.left &&
        touch.clientX <= rect.right &&
        touch.clientY >= rect.top &&
        touch.clientY <= rect.bottom
      );
      // Check if content is actually scrollable (content height > visible height)
      const isScrollable = scrollableEl.scrollHeight > scrollableEl.clientHeight;
      setIsInScrollableArea(isInArea && isScrollable);
    } else {
      setIsInScrollableArea(false);
    }
  }, [showTutorial, viewMode]);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging || showTutorial) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    
    // Determine direction if not set
    if (!swipeDirection) {
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 15) {
        setSwipeDirection('horizontal');
      } else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 15) {
        // If in scrollable text area, don't capture vertical swipe - let native scroll work
        if (isInScrollableArea) {
          setIsDragging(false);
          return;
        }
        setSwipeDirection('vertical');
      }
    }
    
    if (swipeDirection === 'horizontal') {
      setSwipeX(deltaX);
    } else if (swipeDirection === 'vertical') {
      setSwipeY(deltaY);
    }
  }, [isDragging, startX, startY, swipeDirection, showTutorial, isInScrollableArea]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging || showTutorial) return;
    
    const threshold = 100;
    
    // Horizontal swipe - toggle view
    if (swipeDirection === 'horizontal' && Math.abs(swipeX) > threshold) {
      setIsAnimating(true);
      if (swipeX < 0) {
        // Swipe left - go to text
        setViewMode('text');
      } else {
        // Swipe right - go to image
        setViewMode('image');
      }
      setTimeout(() => setIsAnimating(false), 400);
    }
    
    // Vertical swipe - change artwork
    if (swipeDirection === 'vertical' && parcours) {
      if (swipeY > threshold && currentIndex > 0) {
        setIsAnimating(true);
        setCurrentIndex(prev => prev - 1);
        setTimeout(() => setIsAnimating(false), 400);
      } else if (swipeY < -threshold && currentIndex < parcours.artworks.length - 1) {
        setIsAnimating(true);
        setCurrentIndex(prev => prev + 1);
        setTimeout(() => setIsAnimating(false), 400);
      }
    }
    
    // Reset
    setIsDragging(false);
    setSwipeDirection(null);
    setSwipeX(0);
    setSwipeY(0);
  }, [isDragging, swipeDirection, swipeX, swipeY, currentIndex, parcours, showTutorial]);

  // Tutorial handlers
  const handleTutorialNext = () => {
    if (tutorialStep < 2) {
      setTutorialStep(tutorialStep + 1);
    } else {
      setShowTutorial(false);
      localStorage.setItem('resumeTutorialSeen', 'true');
    }
  };

  const handleSkipTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('resumeTutorialSeen', 'true');
  };

  // Format time
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate remaining time
  const calculateRemainingTime = () => {
    if (!parcours?.metadata?.duration_breakdown) return '--';
    const totalMinutes = parcours.metadata.duration_breakdown.total_minutes;
    const elapsedMinutes = parcours.artworks.slice(0, currentIndex).reduce((sum, artwork) => {
      return sum + ((artwork.narration_duration || 0) / 60) + 2;
    }, 0);
    const remainingMinutes = Math.max(0, totalMinutes - elapsedMinutes);
    return `${Math.round(remainingMinutes)} min`;
  };

  if (loading || !parcours) {
    return (
      <div className="resume-loading">
        <div className="loading-spinner" />
        <p>Chargement...</p>
      </div>
    );
  }

  if (!parcours.artworks || parcours.artworks.length === 0) {
    return (
      <div className="resume-error">
        <div className="error-card">
          <h2>Aucune œuvre disponible</h2>
          <p>Veuillez modifier vos choix.</p>
          <button className="btn-primary" onClick={() => navigate('/mes-choix')}>
            Retour
          </button>
        </div>
      </div>
    );
  }

  const artwork = currentArtwork;
  const totalArtworks = parcours.artworks.length;
  const progressPercent = ((currentIndex + 1) / totalArtworks) * 100;
  const imageUrl = artwork?.image_link || null;

  // Oeuvres adjacentes pour l'animation style Reels
  const prevArtwork = currentIndex > 0 ? parcours.artworks[currentIndex - 1] : null;
  const nextArtwork = currentIndex < totalArtworks - 1 ? parcours.artworks[currentIndex + 1] : null;

  // Calcul du déplacement en pourcentage pour l'animation Reels
  const getSlideOffset = () => {
    if (swipeDirection === 'vertical' && isDragging) {
      // Convertir le swipe en pourcentage de la hauteur visible (environ 60vh pour le main)
      const maxOffset = window.innerHeight * 0.6;
      return (swipeY / maxOffset) * 100;
    }
    return 0;
  };

  const slideOffset = getSlideOffset();

  // Transform pour le swipe horizontal uniquement
  const getHorizontalTransform = () => {
    if (swipeDirection === 'horizontal') {
      return `translateX(${swipeX * 0.5}px)`;
    }
    return 'none';
  };

  return (
    <div 
      className={`resume-page ${isAnimating ? 'animating' : ''}`}
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Audio */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Tutorial Overlay */}
      {showTutorial && (
        <div className="tutorial-overlay">
          <div className="tutorial-card">
            {tutorialStep === 0 && (
              <>
                <div className="tutorial-icon">
                  <div className="swipe-demo horizontal">
                    <span className="arrow">←</span>
                    <span className="arrow">→</span>
                  </div>
                </div>
                <h3>Swipe horizontal</h3>
                <p>Glissez à gauche ou à droite pour basculer entre l'image et le texte de narration</p>
              </>
            )}
            {tutorialStep === 1 && (
              <>
                <div className="tutorial-icon">
                  <div className="swipe-demo vertical">
                    <span className="arrow">↑</span>
                    <span className="arrow">↓</span>
                  </div>
                </div>
                <h3>Swipe vertical</h3>
                <p>Glissez vers le haut pour l'œuvre suivante, vers le bas pour revenir en arrière</p>
              </>
            )}
            {tutorialStep === 2 && (
              <>
                <div className="tutorial-icon">
                  <div className="audio-demo">🎧</div>
                </div>
                <h3>Audio guide</h3>
                <p>Utilisez le lecteur en bas pour écouter la narration de chaque œuvre</p>
              </>
            )}
            <div className="tutorial-actions">
              <button className="btn-skip" onClick={handleSkipTutorial}>Passer</button>
              <button className="btn-next" onClick={handleTutorialNext}>
                {tutorialStep < 2 ? 'Suivant' : 'Commencer'}
              </button>
            </div>
            <div className="tutorial-dots">
              {[0, 1, 2].map(i => (
                <span key={i} className={`dot ${tutorialStep === i ? 'active' : ''}`} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="resume-header">
        <div className="header-row">
          <div className="progress-info">
            <span className="progress-count">{currentIndex + 1}/{totalArtworks}</span>
            <span className="progress-time">{calculateRemainingTime()} restantes</span>
          </div>
          <ThemeToggle className="small" />
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </header>

      {/* Vertical Swipe Indicators - FIXED position */}
      {swipeDirection === 'vertical' && isDragging && (
        <>
          {currentIndex > 0 && swipeY > 30 && (
            <div className="swipe-indicator-fixed top">
              <span>↑ {prevArtwork?.title || 'Précédent'}</span>
            </div>
          )}
          {currentIndex < totalArtworks - 1 && swipeY < -30 && (
            <div className="swipe-indicator-fixed bottom">
              <span>{nextArtwork?.title || 'Suivant'} ↓</span>
            </div>
          )}
        </>
      )}

      {/* Slides Container - Style Instagram Reels */}
      <div className="slides-container">
        {/* Previous Artwork Slide */}
        {prevArtwork && (
          <div 
            className={`artwork-slide prev ${swipeDirection === 'vertical' && swipeY > 0 ? 'visible' : ''}`}
            style={{
              transform: `translateY(${-100 + slideOffset}%)`,
              transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            }}
          >
            <div className="slide-content">
              {prevArtwork.image_link ? (
                <img src={prevArtwork.image_link} alt={prevArtwork.title} className="slide-image" />
              ) : (
                <div className="no-image"><span>Image non disponible</span></div>
              )}
              <div className="slide-info">
                <h2>{prevArtwork.title || 'Titre inconnu'}</h2>
                <p>{prevArtwork.artist || 'Artiste inconnu'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Current Artwork Slide */}
        <div 
          className="artwork-slide current"
          style={{
            transform: swipeDirection === 'vertical' ? `translateY(${slideOffset}%)` : getHorizontalTransform(),
            transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          }}
        >
          <main className={`resume-main ${viewMode}`}>
            {/* Background Image (always visible as backdrop) */}
            {imageUrl && (
              <div className="artwork-backdrop">
                <img src={imageUrl} alt="" />
              </div>
            )}

            {/* Image View */}
            <div className={`view-panel image-view ${viewMode === 'image' ? 'active' : ''}`}>
              <div className="image-container">
                {imageUrl ? (
                  <img 
                    src={imageUrl} 
                    alt={artwork.title || 'Œuvre'} 
                    className="artwork-img"
                  />
                ) : (
                  <div className="no-image">
                    <span>Image non disponible</span>
                  </div>
                )}
              </div>
            </div>

            {/* Text View */}
            <div className={`view-panel text-view ${viewMode === 'text' ? 'active' : ''}`}>
              <div className="text-scroll" ref={textScrollRef}>
                <p className="narration">
                  {artwork.narration || "Description non disponible."}
                </p>
              </div>
            </div>

            {/* View Mode Tabs */}
            <div className="view-tabs">
              <button 
                className={`tab ${viewMode === 'image' ? 'active' : ''}`}
                onClick={() => setViewMode('image')}
              >
                Image
              </button>
              <button 
                className={`tab ${viewMode === 'text' ? 'active' : ''}`}
                onClick={() => setViewMode('text')}
              >
                Texte
              </button>
            </div>

            {/* Swipe indicators - horizontal only */}
            {isDragging && swipeDirection === 'horizontal' && (
              <div className={`swipe-indicator ${swipeX < -50 ? 'show-right' : swipeX > 50 ? 'show-left' : ''}`}>
                {swipeX < -50 && <span className="indicator-text">Texte →</span>}
                {swipeX > 50 && <span className="indicator-text">← Image</span>}
              </div>
            )}
          </main>
        </div>

        {/* Next Artwork Slide */}
        {nextArtwork && (
          <div 
            className={`artwork-slide next ${swipeDirection === 'vertical' && swipeY < 0 ? 'visible' : ''}`}
            style={{
              transform: `translateY(${100 + slideOffset}%)`,
              transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            }}
          >
            <div className="slide-content">
              {nextArtwork.image_link ? (
                <img src={nextArtwork.image_link} alt={nextArtwork.title} className="slide-image" />
              ) : (
                <div className="no-image"><span>Image non disponible</span></div>
              )}
              <div className="slide-info">
                <h2>{nextArtwork.title || 'Titre inconnu'}</h2>
                <p>{nextArtwork.artist || 'Artiste inconnu'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Artwork Info */}
      <div className="artwork-meta">
        <h1 className="meta-title">{artwork.title || "Titre inconnu"}</h1>
        <div className="meta-details">
          <span className="meta-artist">{artwork.artist || "Artiste inconnu"}</span>
          {artwork.date && <span className="meta-date">{artwork.date}</span>}
          {artwork.style && <span className="meta-style">{artwork.style}</span>}
          {artwork.room && <span className="meta-room">Salle {artwork.room}</span>}
        </div>
      </div>

      {/* Audio Player */}
      <div className="audio-player">
        <div className="audio-progress" onClick={handleProgressClick}>
          <div className="audio-track">
            <div className="audio-fill" style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }} />
          </div>
          <div className="audio-times">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        
        <div className="audio-controls">
          <button className="audio-btn" onClick={skipBackward} disabled={!audioUrl}>
            <SkipBackIcon />
          </button>
          <button className="audio-btn play-btn" onClick={togglePlay} disabled={!audioUrl}>
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button className="audio-btn" onClick={skipForward} disabled={!audioUrl}>
            <SkipForwardIcon />
          </button>
        </div>
      </div>

      {/* Map Button */}
      <button className="map-btn" onClick={() => setIsMapOpen(true)}>
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
