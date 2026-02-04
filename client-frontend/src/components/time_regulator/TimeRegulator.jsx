import React, { useState, useEffect } from "react";
import "./TimeRegulator.css";

export default function TimeRegulator({ onValueChange }) {
  const [value, setValue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Paramètres dynamiques depuis l'API (valeurs par défaut en attendant)
  const [settings, setSettings] = useState({
    maxDuration: 5,
    timeStep: 0.5,
    defaultDuration: 1
  });

  // Charger les paramètres depuis l'API au montage
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/parcours-settings');
        const data = await response.json();
        
        if (data.success) {
          setSettings({
            maxDuration: data.maxDuration || 5,
            timeStep: data.timeStep || 0.5,
            defaultDuration: data.defaultDuration || 1
          });
          console.log('⚙️ Paramètres temps chargés:', data);
        }
      } catch (error) {
        console.warn('⚠️ Erreur chargement paramètres temps, utilisation des défauts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Initialiser la valeur une fois les settings chargés
  useEffect(() => {
    if (isLoading) return;
    
    const savedValue = localStorage.getItem("timeSliderValue");
    let val = savedValue !== null ? parseFloat(savedValue) : settings.defaultDuration;
    
    // S'assurer que la valeur est dans les limites
    if (val > settings.maxDuration) val = settings.maxDuration;
    if (val < 0) val = 0;
    
    // Arrondir au step le plus proche
    val = Math.round(val / settings.timeStep) * settings.timeStep;
    
    setValue(val);
    document.documentElement.style.setProperty("--value", val);
    document.documentElement.style.setProperty("--max-value", settings.maxDuration);
    
    // 👉 Notifier le parent de la valeur initiale
    if (onValueChange) {
      onValueChange(val);
      console.log(`⏱️ TimeRegulator initialisé à: ${val}h (max: ${settings.maxDuration}h, step: ${settings.timeStep}h)`);
    }
  }, [isLoading, settings, onValueChange]);

  // Whenever slider changes
  const handleChange = (e) => {
    const val = parseFloat(e.target.value);
    setValue(val);
    e.target.style.setProperty("--value", val);
    localStorage.setItem("timeSliderValue", val);

    // 👉 Send new value to parent
    if (onValueChange) {
      onValueChange(val);
      console.log(`⏱️ Temps modifié: ${val}h = ${val * 60} minutes`);
    }
  };

  const formatTime = (val) => {
    const hours = Math.floor(val);
    const minutes = Math.round((val - hours) * 60);
    return `${hours}H${minutes === 0 ? "00" : minutes.toString().padStart(2, '0')}`;
  };

  // Générer les ticks dynamiquement selon les settings
  const generateTicks = () => {
    const ticks = [];
    for (let i = 0; i <= settings.maxDuration; i += settings.timeStep) {
      ticks.push(parseFloat(i.toFixed(2)));
    }
    return ticks;
  };

  // Générer les labels (heures entières seulement)
  const generateLabels = () => {
    const labels = [];
    for (let i = 0; i <= settings.maxDuration; i++) {
      labels.push(i);
    }
    return labels;
  };

  const ticks = generateTicks();
  const labels = generateLabels();

  if (isLoading) {
    return (
      <div className="time-page">
        <div className="time-container">
          <div className="title-row">
            <h3>Chargement...</h3>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="time-page">
      <div className="time-container">
        <div className="title-row">
          <h3>Combien de temps avez-vous ?</h3>
          <div className="time-display">{formatTime(value)}</div>
        </div>

        <div className="slider-wrapper">
          <div className="labels">
            {labels.map((val) => (
              <span
                key={val}
                style={{ visibility: val === 0 ? "hidden" : "visible" }}
              >
                {val}H
              </span>
            ))}
          </div>

          <input
            type="range"
            min="0"
            max={settings.maxDuration}
            step={settings.timeStep}
            value={value}
            onChange={handleChange}
            className="slider"
          />

          <div className="ticks">
            {ticks.map((val, i) => {
              const percent = (val / settings.maxDuration) * 100;
              const isHalfTick = val % 1 !== 0;
              return (
                <div
                  key={i}
                  className={`tick ${isHalfTick ? "half" : ""}`}
                  style={{ left: `${percent}%` }}
                ></div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
