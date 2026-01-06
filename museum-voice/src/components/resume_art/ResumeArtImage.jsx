import React from "react";
import "./ResumeArt.css";

const ResumeArtImage = ({ imageUrl, title }) => {
  // Utiliser l'image de l'œuvre si disponible, sinon image par défaut
  const imageSrc = imageUrl || "/assets/images/testmuseum.png";
  const imageAlt = title || "Museum Artwork";

  return (
    <img
      src={imageSrc}
      alt={imageAlt}
      className="resume-art-image"
    />
  );
};

export default ResumeArtImage;
