import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { activateSession } from '../../utils/session';
import './Accueil.css';

// Icons
const ArrowRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
);

const HeadphonesIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
  </svg>
);

const RouteIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="19" r="3"/>
    <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/>
    <circle cx="18" cy="5" r="3"/>
  </svg>
);

const Accueil = () => {
  const [selectedLanguage, setSelectedLanguage] = useState('FR');
  const [museumImageUrl, setMuseumImageUrl] = useState('/placeholder.svg');
  const [museumTitle, setMuseumTitle] = useState('Louvre-Lens');
  const [museumSubtitle, setMuseumSubtitle] = useState('Explorez, observez, ressentez. L\'art se devoile a vous.');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Handle QR code token from URL
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      activateSession(token).then(success => {
        if (success) {
          console.log('Session activee avec succes');
          window.history.replaceState({}, '', window.location.pathname);
        } else {
          console.error('Echec activation session');
        }
      });
    }
  }, [searchParams]);

  // Load museum settings
  useEffect(() => {
    const fetchMuseumSettings = async () => {
      try {
        // Utiliser URLs relatives pour passer par nginx
        
        // Fetch image
        const imageRes = await fetch(`/api/museum-settings?setting_key=museum_image_url`);
        const imageData = await imageRes.json();
        if (imageData?.setting_value) {
          // L'URL peut être absolue ou relative
          setMuseumImageUrl(imageData.setting_value);
        }

        // Fetch title
        const titleRes = await fetch(`/api/museum-settings?setting_key=museum_title`);
        const titleData = await titleRes.json();
        if (titleData?.setting_value) {
          setMuseumTitle(titleData.setting_value.split('\n')[0]);
        }
      } catch (error) {
        console.error('Erreur chargement parametres musee:', error);
      }
    };

    fetchMuseumSettings();
  }, []);

  const handleLanguageChange = (lang) => {
    setSelectedLanguage(lang);
    localStorage.setItem('preferred_language', lang);
  };

  const goToMesChoix = () => {
    navigate('/mes-choix');
  };

  const languages = ['FR', 'EN', 'DE', 'ES'];

  return (
    <div className="accueil-page">
      {/* Hero Background */}
      <div className="hero-background">
        <img 
          src={museumImageUrl} 
          alt="Museum" 
          className="hero-background-image"
        />
      </div>

      {/* Content */}
      <div className="accueil-content">
        <div className="welcome-section">
          <span className="welcome-label">Audio Guide</span>
          <h1 className="welcome-title">{museumTitle}</h1>
          <p className="welcome-subtitle">{museumSubtitle}</p>

          {/* Language Selector */}
          <div className="language-selector">
            {languages.map(lang => (
              <button
                key={lang}
                className={`language-btn ${selectedLanguage === lang ? 'active' : ''}`}
                onClick={() => handleLanguageChange(lang)}
              >
                {lang}
              </button>
            ))}
          </div>

          {/* Features */}
          <div className="features-preview">
            <div className="feature-card">
              <div className="feature-icon">
                <HeadphonesIcon />
              </div>
              <span className="feature-title">Audio Guide</span>
              <span className="feature-desc">Narration personnalisee</span>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <RouteIcon />
              </div>
              <span className="feature-title">Parcours</span>
              <span className="feature-desc">Adapte a vos preferences</span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <div className="cta-container">
        <button className="cta-button" onClick={goToMesChoix}>
          Commencer l'experience
          <ArrowRightIcon />
        </button>
      </div>
    </div>
  );
};

export default Accueil;