import React from "react";
import { FaPlay, FaPause, FaStepBackward, FaStepForward } from "react-icons/fa";

const ResumeArtControls = ({ isPlaying, onTogglePlay, hasAudio, onPrevious, onNext }) => {
  return (
    <div className="resume-art-controls">
      <FaStepBackward 
        className="icon control" 
        onClick={onPrevious}
        style={{ opacity: hasAudio ? 1 : 0.3, cursor: hasAudio ? 'pointer' : 'not-allowed' }}
      />
      {isPlaying ? (
        <FaPause 
          className="icon control play-btn" 
          onClick={onTogglePlay}
          style={{ opacity: hasAudio ? 1 : 0.3, cursor: hasAudio ? 'pointer' : 'not-allowed' }}
        />
      ) : (
        <FaPlay 
          className="icon control play-btn" 
          onClick={onTogglePlay}
          style={{ opacity: hasAudio ? 1 : 0.3, cursor: hasAudio ? 'pointer' : 'not-allowed' }}
        />
      )}
      <FaStepForward 
        className="icon control" 
        onClick={onNext}
        style={{ opacity: hasAudio ? 1 : 0.3, cursor: hasAudio ? 'pointer' : 'not-allowed' }}
      />
    </div>
  );
};

export default ResumeArtControls;
