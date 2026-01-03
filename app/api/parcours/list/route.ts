import { NextResponse } from 'next/server';
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

export async function GET() {
  try {
    const db = openDatabase();
    
    return new Promise((resolve) => {
      // Récupérer la liste des parcours avec leurs informations de base
      const query = `
        SELECT 
          group_id,
          COUNT(*) as segment_count,
          criteria,
          MIN(created_at) as created_at
        FROM parcours 
        WHERE group_id IS NOT NULL 
        GROUP BY group_id, criteria
        ORDER BY created_at DESC
      `;
      
      db.all(query, [], (err: any, rows: any[]) => {
        db.close();
        
        if (err) {
          console.error('Database error:', err);
          resolve(NextResponse.json({ error: 'Database error' }, { status: 500 }));
          return;
        }

        const parcoursList = rows.map(row => {
          const criteria = row.criteria ? JSON.parse(row.criteria) : {};
          return {
            group_id: row.group_id,
            segment_count: row.segment_count,
            age_cible: criteria.age_cible || 'non spécifié',
            thematique: criteria.thematique || 'générale',
            style_texte: criteria.style_texte || 'standard',
            created_at: row.created_at
          };
        });

        resolve(NextResponse.json(parcoursList));
      });
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}