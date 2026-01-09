import React, { useState, useRef, useEffect } from "react";
import "./ResumeArt.css";
import ResumeArtImage, { ImageZoomModal } from "./ResumeArtImage";
import ResumeArtTopIcons from "./ResumeArtTopIcons";
import ResumeArtControls from "./ResumeArtControls";

const ResumeArt = ({ artwork }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showZoomModal, setShowZoomModal] = useState(false);

  // Backend URL pour préfixer les chemins relatifs
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';

  // URL de l'audio - préfixer si relatif
  let audioUrl = artwork?.audio_path;
  if (audioUrl && !audioUrl.startsWith('http')) {
    audioUrl = `${backendUrl}${audioUrl}`;
  }
  audioUrl = audioUrl || null;

  // Recharger l'audio quand la source change
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Stop current playback and reset
    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);

    // Force reload of the new source
    audio.load();
  }, [audioUrl]);

  // Mettre à jour le temps en cours
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', () => setIsPlaying(false));

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', () => setIsPlaying(false));
    };
  }, [audioUrl]);

  // Réinitialiser la lecture quand l'œuvre change
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [artwork?.oeuvre_id]);

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e) => {
    if (!audioRef.current || !duration) return;
    
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Préfixer l'image URL si relative
  let imageUrl = artwork?.image_url;
  if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('/placeholder')) {
    imageUrl = `${backendUrl}${imageUrl}`;
  }

  return (
    <div className="resume-art">
      <div className="resume-art-image-wrapper">
        <ResumeArtImage imageUrl={imageUrl} title={artwork?.title} />
        <ResumeArtTopIcons onZoomClick={() => setShowZoomModal(true)} />

        {/* Audio element (hidden) */}
        {audioUrl && (
          <audio ref={audioRef} preload="metadata" key={audioUrl}>
            <source src={audioUrl} type="audio/wav" />
          </audio>
        )}

        {/* 🎵 Overlay that includes controls (then progress bar below) */}
        <div className="resume-art-controls-overlay">
          <ResumeArtControls 
            isPlaying={isPlaying}
            onTogglePlay={togglePlay}
            hasAudio={!!audioUrl}
          />

          <div 
            className="resume-art-progress" 
            onClick={handleSeek}
            style={{ cursor: audioUrl ? 'pointer' : 'default' }}
          >
            <div 
              className="resume-progress-fill" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {showZoomModal && (
        <ImageZoomModal
          imageUrl={imageUrl || "/placeholder.svg"}
          title={artwork?.title || "Museum Artwork"}
          onClose={() => setShowZoomModal(false)}
        />
      )}
    </div>
  );
};

export default ResumeArt;
