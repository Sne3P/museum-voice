import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://backend:5000';
// URL publique du backend pour les assets (audio, images)
const PUBLIC_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

// Helper pour convertir les URLs d'assets en URLs publiques
function resolveAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  // Si c'est déjà une URL absolue, la retourner
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  // Sinon, ajouter le préfixe du backend public
  return `${PUBLIC_BACKEND_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get('group_id');

  if (!groupId) {
    return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
  }

  try {
    // Si group_id est "demo", générer un parcours de démo avec des critères par défaut
    if (groupId === 'demo') {
      const demoCriteria = {
        age: 'enfant',
        thematique: 'technique_picturale',
        style_texte: 'decouverte'
      };

      const response = await fetch(`${BACKEND_URL}/api/parcours/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          criteria: demoCriteria,
          target_duration_minutes: 30,
          generate_audio: true
        })
      });

      if (!response.ok) {
        const error = await response.json();
        return NextResponse.json(error, { status: response.status });
      }

      const data = await response.json();
      
      // Transformer la réponse de génération en format attendu par le client
      if (data.success && data.parcours) {
        const parcours = data.parcours;
        return NextResponse.json({
          group_id: 'demo',
          segments: parcours.artworks?.map((artwork: any, index: number) => ({
            id: index + 1,
            segment_order: artwork.order || index + 1,
            segment_type: index === 0 ? 'introduction_oeuvre' : 'oeuvre',
            guide_text: artwork.narration,
            duration_minutes: Math.ceil((artwork.narration_duration || 120) / 60),
            oeuvre_info: {
              oeuvre_id: artwork.oeuvre_id,
              titre: artwork.title,
              artiste: artwork.artist,
              date: artwork.date,
              technique: artwork.materiaux_technique,
              image_url: resolveAssetUrl(artwork.image_url),
              audio_url: resolveAssetUrl(artwork.audio_path),
              position_x: artwork.position?.x,
              position_y: artwork.position?.y,
              salle: artwork.position?.room ? `Salle ${artwork.position.room}` : null
            }
          })) || [],
          criteria: {
            age_cible: demoCriteria.age,
            thematique: demoCriteria.thematique,
            style_texte: demoCriteria.style_texte
          }
        });
      }

      return NextResponse.json({ error: 'Failed to generate demo parcours' }, { status: 500 });
    }

    // Sinon, proxy vers le backend Flask PostgreSQL
    const response = await fetch(`${BACKEND_URL}/api/parcours/${groupId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching parcours:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}