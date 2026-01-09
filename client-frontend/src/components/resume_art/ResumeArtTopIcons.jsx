import React from "react";
import { FaSearch, FaHeart } from "react-icons/fa";

const ResumeArtTopIcons = ({ onZoomClick }) => {
  return (
    <div className="resume-art-top-icons">
      <FaSearch className="icon" role="button" aria-label="Agrandir l'image" onClick={onZoomClick} />
      <FaHeart className="icon" />
    </div>
  );
};

export default ResumeArtTopIcons;
