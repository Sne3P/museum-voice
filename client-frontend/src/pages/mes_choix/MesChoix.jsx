// MesChoix.jsx - Modern Apple Music Style
import React, { useState, useCallback, useEffect } from 'react';
import TimeRegulator from '../../components/time_regulator/TimeRegulator';
import CriteriaSelector from '../../components/criteria_selector/CriteriaSelector';
import { useNavigate } from 'react-router-dom';
import { checkSession } from '../../utils/session';
import './MesChoix.css';

// Icons
const ChevronLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

const SparklesIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    <path d="M5 3v4"/>
    <path d="M19 17v4"/>
    <path d="M3 5h4"/>
    <path d="M17 19h4"/>
  </svg>
);

const LoaderIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);

const InfoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 16v-4"/>
    <path d="M12 8h.01"/>
  </svg>
);

const MesChoix = () => {
  const navigate = useNavigate();
  
  // Vérifier la session au chargement
  useEffect(() => {
    checkSession().then(({ valid }) => {
      if (!valid) {
        console.warn('⚠️ Session invalide ou expirée');
        alert('⚠️ Votre session a expiré. Veuillez scanner un nouveau QR code.');
        navigate('/');
      }
    });
  }, [navigate]);
  
  // Charger la valeur initiale depuis localStorage ou utiliser 1h par défaut
  const getInitialTimeValue = () => {
    const savedValue = localStorage.getItem("timeSliderValue");
    return savedValue !== null ? parseFloat(savedValue) : 1;
  };

  const [timeValue, setTimeValue] = useState(getInitialTimeValue()); // Heures
  const [criteriaTypes, setCriteriaTypes] = useState([]); // Types de critères chargés depuis l'API
  const [selectedCriterias, setSelectedCriterias] = useState({}); // { age: 'adulte', thematique: 'biographie', ... }
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false); // État de génération du parcours

  // Charger les types de critères depuis l'API
  useEffect(() => {
    const fetchCriteriaTypes = async () => {
      try {
        const response = await fetch('/api/criteria-types');
        const data = await response.json();
        
        if (data.success && data.types) {
          // Trier par ordre
          const sorted = data.types.sort((a, b) => a.ordre - b.ordre);
          setCriteriaTypes(sorted);
        }
      } catch (error) {
        console.error('Erreur chargement types de critères:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCriteriaTypes();
  }, []);

  const handleTimeValueChange = useCallback((newValue) => {
    setTimeValue(newValue);
  }, []);

  const handleCriteriaSelect = useCallback((criteriaData) => {
    setSelectedCriterias(prev => ({
      ...prev,
      [criteriaData.type]: criteriaData.name
    }));
  }, []);

  // Validation : tous les critères doivent être sélectionnés
  const isFormValid = () => {
    if (timeValue <= 0) return false;
    
    // Tous les types de critères doivent avoir une sélection
    return criteriaTypes.length > 0 && 
           criteriaTypes.every(ct => selectedCriterias[ct.type]);
  };

  const handleSendData = async () => {
    if (!isFormValid()) {
      alert('⚠️ Veuillez sélectionner un choix pour chaque critère avant de générer le parcours');
      return;
    }

    // Construction du payload API VRAIMENT DYNAMIQUE avec dict de critères
    const criteria = {};
    for (const [type, name] of Object.entries(selectedCriterias)) {
      criteria[type] = name;  // {age: "adulte", thematique: "technique_picturale", ...}
    }

    // Générer un seed unique pour ce parcours (timestamp + random)
    const uniqueSeed = Date.now() + Math.floor(Math.random() * 10000);

    const apiPayload = {
      criteria: criteria,  // Format dict flexible pour N critères
      target_duration_minutes: timeValue * 60,
      variation_seed: uniqueSeed,  // Seed unique pour éviter les collisions
      generate_audio: true
    };

    console.log("📤 Payload envoyé:", apiPayload);
    console.log(`⏱️ Temps sélectionné: ${timeValue}h = ${timeValue * 60} minutes`);

    setGenerating(true); // Activer le loader
    try {
      const response = await fetch('/api/parcours/generate', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate parcours");
      }

      const data = await response.json();
      console.log("✅ Parcours generated:", data);
      
      if (data.success && data.parcours) {
        localStorage.setItem('generatedParcours', JSON.stringify(data.parcours));
        
        // Lier le parcours à la session active (si QR code)
        const sessionToken = localStorage.getItem('museum-session-token');
        if (sessionToken && data.parcours.metadata?.unique_parcours_id) {
          try {
            await fetch('/api/parcours/link-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                token: sessionToken,
                parcours_id: data.parcours.metadata.unique_parcours_id
              })
            });
            console.log('🔗 Parcours lié à la session');
          } catch (linkError) {
            console.warn('⚠️ Erreur liaison session:', linkError);
          }
        }
        
        // TODO: Désactivé temporairement pour debug - réactiver en prod
        // Déclencher un nettoyage des anciens fichiers (async, non-bloquant)
        // fetch('/api/cleanup/audio', { method: 'POST' })
        //   .catch(err => console.warn('⚠️ Cleanup error:', err));
        
        window.location.href = '/resume';
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("❌ Error generating parcours:", error);
      alert(`❌ Erreur: ${error.message}`);
    } finally {
      setGenerating(false); // Désactiver le loader
    }
  };

  if (loading) {
    return (
      <div className="mes-choix-page">
        <header className="page-header">
          <button className="back-button" onClick={() => navigate('/')}>
            <ChevronLeftIcon />
          </button>
          <h1 className="page-title">Personnaliser</h1>
        </header>
        <div className="mes-choix-content">
          <div className="loading-skeleton criteria-skeleton" />
          <div className="loading-skeleton criteria-skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="mes-choix-page">
      {/* Loading Overlay */}
      {generating && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <p>Creation de votre parcours personnalise...</p>
        </div>
      )}

      {/* Header */}
      <header className="page-header">
        <button className="back-button" onClick={() => navigate('/')}>
          <ChevronLeftIcon />
        </button>
        <h1 className="page-title">Personnaliser</h1>
      </header>

      {/* Content */}
      <div className="mes-choix-content">
        {/* Duration */}
        <TimeRegulator onValueChange={handleTimeValueChange} />

        {/* Dynamic Criteria */}
        {criteriaTypes.map((criteriaType) => (
          <CriteriaSelector
            key={criteriaType.type}
            criteriaType={criteriaType.type}
            title={criteriaType.label}
            onSelect={handleCriteriaSelect}
          />
        ))}

        {/* Notice */}
        <div className="notice-card">
          <div className="notice-icon">
            <InfoIcon />
          </div>
          <p className="notice-text">
            Votre parcours sera genere en fonction de vos preferences et adapte a la duree choisie.
          </p>
        </div>
      </div>

      {/* CTA Fixed */}
      <div className="cta-fixed">
        <button 
          className={`cta-btn ${generating ? 'loading' : ''}`}
          onClick={handleSendData} 
          disabled={!isFormValid() || generating}
        >
          {generating ? (
            <>
              <LoaderIcon />
              Generation...
            </>
          ) : (
            <>
              <SparklesIcon />
              Generer mon parcours
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default MesChoix;
