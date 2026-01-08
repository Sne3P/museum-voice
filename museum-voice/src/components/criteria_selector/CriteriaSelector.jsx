// CriteriaSelector.jsx - Composant GÉNÉRIQUE pour afficher les paramètres d'un critère
import React, { useState, useEffect } from 'react';
import './CriteriaSelector.css';
import SelectorGridItem from '../common/SelectorGridItem';

/**
 * Composant générique pour afficher et sélectionner les paramètres d'un critère
 * @param {string} criteriaType - Type du critère (age, thematique, style_texte, etc.)
 * @param {string} title - Titre affiché en en-tête
 * @param {string} icon - Emoji/icône à afficher
 * @param {function} onSelect - Callback appelé quand un paramètre est sélectionné
 * @param {string} defaultValue - Valeur par défaut à sélectionner
 */
const CriteriaSelector = ({ 
  criteriaType, 
  title, 
  icon = '📋', 
  onSelect,
  defaultValue = null 
}) => {
  const [parameters, setParameters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedParameter, setSelectedParameter] = useState('');

  // Charger les paramètres du critère depuis l'API
  useEffect(() => {
    const fetchParameters = async () => {
      try {
        const response = await fetch(`/api/criterias?type=${criteriaType}`);
        const data = await response.json();
        
        if (data.success && data.criterias) {
          const params = data.criterias.map(c => ({
            id: c.name,
            criteriaId: c.criteria_id,
            title: c.label,
            description: c.description,
            imageUrl: c.image_link || '/placeholder.svg',
            ordre: c.ordre
          }));
          
          // Trier par ordre
          params.sort((a, b) => a.ordre - b.ordre);
          setParameters(params);
          
          // Sélectionner par défaut
          const defaultParam = defaultValue 
            ? params.find(p => p.id === defaultValue)
            : params[0];
          
          if (defaultParam) {
            setSelectedParameter(defaultParam.id);
          }
        }
      } catch (error) {
        console.error(`Erreur chargement ${criteriaType}:`, error);
      } finally {
        setLoading(false);
      }
    };

    fetchParameters();
  }, [criteriaType, defaultValue]);

  // Notifier le parent quand la sélection change
  useEffect(() => {
    if (selectedParameter && onSelect) {
      const selectedParam = parameters.find(p => p.id === selectedParameter);
      onSelect({
        type: criteriaType,
        name: selectedParameter,
        criteriaId: selectedParam?.criteriaId,
        label: selectedParam?.title
      });
    }
  }, [selectedParameter, onSelect, criteriaType, parameters]);

  const handleSelect = (paramId) => {
    setSelectedParameter(paramId);
  };

  if (loading) {
    return (
      <div className="criteria-selector-container">
        <div className="criteria-selector-header">
          {title}
        </div>
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  if (parameters.length === 0) {
    return (
      <div className="criteria-selector-container">
        <div className="criteria-selector-header">
          {title}
        </div>
        <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontStyle: 'italic' }}>
          <p>Aucun paramètre disponible</p>
        </div>
      </div>
    );
  }

  return (
    <div className="criteria-selector-container">
      <div className="criteria-selector-header">
        {title}
      </div>
      <div className="criteria-selector-grid">
        {parameters.map((param) => (
          <SelectorGridItem
            key={param.id}
            id={param.id}
            title={param.title}
            imageUrl={param.imageUrl}
            isSelected={selectedParameter === param.id}
            onClick={() => handleSelect(param.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default CriteriaSelector;
