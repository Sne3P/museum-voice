'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface Segment {
  id: number;
  segment_order: number;
  segment_type: string;
  guide_text: string;
  duration_minutes: number;
  oeuvre_info: {
    titre?: string;
    artiste?: string;
    oeuvre_id?: number;
  };
}

interface Parcours {
  group_id: string;
  segments: Segment[];
  criteria: {
    age_cible: string;
    thematique: string;
    style_texte: string;
  };
}

function ParcoursContent() {
  const searchParams = useSearchParams();
  const groupId = searchParams.get('id');
  
  const [parcours, setParcours] = useState<Parcours | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) {
      setError('ID de parcours manquant');
      setLoading(false);
      return;
    }

    fetch(`/api/parcours?group_id=${groupId}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setParcours(data);
        }
        setLoading(false);
      })
      .catch(err => {
        setError('Erreur lors du chargement du parcours');
        setLoading(false);
      });
  }, [groupId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement du parcours...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-red-700 mb-2">Erreur</h1>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!parcours) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">🎨</div>
          <h1 className="text-2xl font-bold text-gray-700 mb-2">Parcours non trouvé</h1>
          <p className="text-gray-600">Aucun parcours ne correspond à cet ID</p>
        </div>
      </div>
    );
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'introduction_oeuvre': return '🎭';
      case 'oeuvre': return '🖼️';
      case 'conclusion': return '🎯';
      default: return '📝';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'introduction_oeuvre': return 'Introduction & Première œuvre';
      case 'oeuvre': return 'Œuvre';
      case 'conclusion': return 'Conclusion';
      default: return 'Segment';
    }
  };

  const getAgeEmoji = (age: string) => {
    switch (age) {
      case 'enfant': return '👶';
      case 'ado': return '🧑';
      case 'adulte': return '👨';
      case 'senior': return '👴';
      default: return '👤';
    }
  };

  const totalDuration = parcours.segments.reduce((sum, seg) => sum + seg.duration_minutes, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-lg">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                🎨 Parcours Personnalisé
              </h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  {getAgeEmoji(parcours.criteria.age_cible)}
                  <span className="capitalize">{parcours.criteria.age_cible}</span>
                </span>
                <span className="flex items-center gap-1">
                  🎭 <span className="capitalize">{parcours.criteria.thematique.replace('_', ' ')}</span>
                </span>
                <span className="flex items-center gap-1">
                  📝 <span className="capitalize">{parcours.criteria.style_texte}</span>
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-indigo-100 rounded-lg px-4 py-2">
                <div className="text-sm text-indigo-600 font-medium">Durée totale</div>
                <div className="text-2xl font-bold text-indigo-800">{totalDuration} min</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {parcours.segments.map((segment, index) => (
            <div key={segment.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getTypeIcon(segment.segment_type)}</span>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {getTypeLabel(segment.segment_type)}
                      </h3>
                      {segment.oeuvre_info.titre && (
                        <p className="text-indigo-100 text-sm">
                          {segment.oeuvre_info.titre} - {segment.oeuvre_info.artiste}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white/80 text-xs">Segment {segment.segment_order}</div>
                    <div className="text-white font-semibold">{segment.duration_minutes} min</div>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="prose prose-lg max-w-none">
                  <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {segment.guide_text}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6">
            <p className="text-gray-600 mb-2">
              🎭 Parcours généré automatiquement avec {parcours.segments.length} segments
            </p>
            <p className="text-sm text-gray-500">
              ID: {parcours.group_id} • Durée totale: {totalDuration} minutes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ParcourePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-lg">Chargement du parcours...</div></div>}>
      <ParcoursContent />
    </Suspense>
  );
}