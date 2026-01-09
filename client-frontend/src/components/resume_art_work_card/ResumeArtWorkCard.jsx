import React from "react";
import ResumeArtWorkHeader from "./ResumeArtWorkHeader";
import ResumeArtWorkBody from "./ResumeArtWorkBody";
import "./ResumeArtWorkCard.css";

export default function ResumeArtWorkCard({
  title,
  artist,
  date,
  technique,
  location,
  description
}) {
  return (
    <div className="resume-card-container">
      <ResumeArtWorkHeader
        title={title}
        artist={artist}
        date={date}
        technique={technique}
        location={location}
      />

      <ResumeArtWorkBody description={description} />
    </div>
  );
}
