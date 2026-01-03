import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const sqlite3 = require('sqlite3').verbose();

function openDatabase() {
  const dbPath = path.join(process.cwd(), 'database', 'museum_v1.db');
  
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database not found at ${dbPath}`);
  }
  
  return new sqlite3.Database(dbPath);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get('group_id');

  if (!groupId) {
    return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
  }

  try {
    const db = openDatabase();
    
    return new Promise((resolve) => {
      // Récupérer tous les segments du parcours
      const query = `
        SELECT 
          id, segment_order, segment_type, guide_text, 
          total_duration_minutes as duration_minutes, oeuvre_info, criteria
        FROM parcours 
        WHERE group_id = ? 
        ORDER BY segment_order
      `;
      
      db.all(query, [groupId], (err: any, rows: any[]) => {
        db.close();
        
        if (err) {
          console.error('Database error:', err);
          resolve(NextResponse.json({ error: 'Database error' }, { status: 500 }));
          return;
        }

        if (rows.length === 0) {
          resolve(NextResponse.json({ error: 'Parcours not found' }, { status: 404 }));
          return;
        }

        // Parser les données JSON
        const segments = rows.map(row => ({
          id: row.id,
          segment_order: row.segment_order,
          segment_type: row.segment_type,
          guide_text: row.guide_text,
          duration_minutes: row.duration_minutes || 5, // Durée par défaut
          oeuvre_info: row.oeuvre_info ? JSON.parse(row.oeuvre_info) : {}
        }));

        // Parser les critères depuis le premier segment
        const criteria = rows[0].criteria ? JSON.parse(rows[0].criteria) : {
          age_cible: 'adulte',
          thematique: 'generale',
          style_texte: 'standard'
        };

        const parcours = {
          group_id: groupId,
          segments,
          criteria
        };

        resolve(NextResponse.json(parcours));
      });
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}