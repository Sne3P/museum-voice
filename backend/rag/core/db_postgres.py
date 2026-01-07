"""
Connexion PostgreSQL pour Museum Voice Backend
Remplace SQLite par PostgreSQL Docker
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import os
from typing import Optional, List, Dict, Any
from collections import defaultdict


def get_pg_config() -> Dict[str, str]:
    """Récupère la configuration PostgreSQL depuis env variables"""
    return {
        'host': os.getenv('DB_HOST', 'museum-db'),
        'port': int(os.getenv('DB_PORT', '5432')),
        'database': os.getenv('DB_NAME', 'museumvoice'),
        'user': os.getenv('DB_USER', 'museum_admin'),
        'password': os.getenv('DB_PASSWORD', 'museum_password')
    }


def _connect_postgres():
    """
    Connexion à PostgreSQL Docker
    Retourne une connexion avec RealDictCursor (résultats en dict)
    """
    config = get_pg_config()
    conn = psycopg2.connect(
        host=config['host'],
        port=config['port'],
        database=config['database'],
        user=config['user'],
        password=config['password'],
        cursor_factory=RealDictCursor,
        client_encoding='UTF8'
    )
    # S'assurer que le client utilise UTF-8
    conn.set_client_encoding('UTF8')
    return conn


def init_postgres_db() -> None:
    """
    Vérifie que les tables PostgreSQL existent
    """
    conn = _connect_postgres()
    cur = conn.cursor()
    
    try:
        # Vérifier tables essentielles
        cur.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        tables = [row['table_name'] for row in cur.fetchall()]
        
        required_tables = [
            'oeuvres', 'artistes', 'mouvements', 
            'pregenerations', 'sections', 'anecdotes', 
            'chunk', 'plans', 'entities', 'points'
        ]
        
        missing = [t for t in required_tables if t not in tables]
        
        if missing:
            print(f"⚠️ Tables manquantes: {missing}")
            print("Exécutez le script d'initialisation PostgreSQL")
        else:
            print("✅ Base de données PostgreSQL prête")
            
    finally:
        cur.close()
        conn.close()


# ===== FONCTIONS ARTISTES =====

def add_artist(nom: str, lieu_naissance: Optional[str] = None,
               date_naissance: Optional[str] = None, date_deces: Optional[str] = None,
               biographie: Optional[str] = None) -> int:
    """Ajoute un artiste et retourne son ID"""
    conn = _connect_postgres()
    cur = conn.cursor()
    
    try:
        # Vérifier si existe
        cur.execute("SELECT artiste_id FROM artistes WHERE nom = %s", (nom,))
        existing = cur.fetchone()
        if existing:
            return existing['artiste_id']
        
        # Ajouter
        cur.execute("""
            INSERT INTO artistes (nom, lieu_naissance, date_naissance, date_deces, biographie)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING artiste_id
        """, (nom, lieu_naissance, date_naissance, date_deces, biographie))
        
        artiste_id = cur.fetchone()['artiste_id']
        conn.commit()
        return artiste_id
        
    finally:
        cur.close()
        conn.close()


def get_artist(artiste_id: int) -> Optional[Dict[str, Any]]:
    """Récupère un artiste par ID"""
    conn = _connect_postgres()
    cur = conn.cursor()
    
    try:
        cur.execute("SELECT * FROM artistes WHERE artiste_id = %s", (artiste_id,))
        return cur.fetchone()
    finally:
        cur.close()
        conn.close()


# ===== FONCTIONS MOUVEMENTS =====

def add_movement(nom: str, description: Optional[str] = None,
                 periode_debut: Optional[str] = None, 
                 periode_fin: Optional[str] = None) -> int:
    """Ajoute un mouvement artistique"""
    conn = _connect_postgres()
    cur = conn.cursor()
    
    try:
        # Vérifier si existe
        cur.execute("SELECT mouvement_id FROM mouvements WHERE nom = %s", (nom,))
        existing = cur.fetchone()
        if existing:
            return existing['mouvement_id']
        
        # Ajouter
        cur.execute("""
            INSERT INTO mouvements (nom, description, periode_debut, periode_fin)
            VALUES (%s, %s, %s, %s)
            RETURNING mouvement_id
        """, (nom, description, periode_debut, periode_fin))
        
        mouvement_id = cur.fetchone()['mouvement_id']
        conn.commit()
        return mouvement_id
        
    finally:
        cur.close()
        conn.close()


# ===== FONCTIONS OEUVRES =====

def add_artwork(title: str, artist: str, artiste_id: Optional[int] = None,
                mouvement_id: Optional[int] = None, description: Optional[str] = None,
                date_oeuvre: Optional[str] = None, materiaux_technique: Optional[str] = None,
                dimensions: Optional[str] = None, provenance: Optional[str] = None,
                image_link: Optional[str] = None, pdf_link: Optional[str] = None,
                file_name: Optional[str] = None, file_path: Optional[str] = None,
                room: Optional[int] = None) -> int:
    """Ajoute une œuvre"""
    conn = _connect_postgres()
    cur = conn.cursor()
    
    try:
        # Vérifier si existe
        cur.execute(
            "SELECT oeuvre_id FROM oeuvres WHERE title = %s AND artist = %s",
            (title, artist)
        )
        existing = cur.fetchone()
        if existing:
            return existing['oeuvre_id']
        
        # Ajouter
        cur.execute("""
            INSERT INTO oeuvres (
                title, artist, artiste_id, mouvement_id, description,
                date_oeuvre, materiaux_technique, dimensions, provenance,
                image_link, pdf_link, file_name, file_path, room
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING oeuvre_id
        """, (
            title, artist, artiste_id, mouvement_id, description,
            date_oeuvre, materiaux_technique, dimensions, provenance,
            image_link, pdf_link, file_name, file_path, room
        ))
        
        oeuvre_id = cur.fetchone()['oeuvre_id']
        conn.commit()
        return oeuvre_id
        
    finally:
        cur.close()
        conn.close()


def get_artwork(oeuvre_id: int) -> Optional[Dict[str, Any]]:
    """Récupère une œuvre avec ses relations"""
    conn = _connect_postgres()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT o.*, 
                   a.nom as artiste_nom, a.biographie as artiste_bio,
                   m.nom as mouvement_nom, m.description as mouvement_desc
            FROM oeuvres o
            LEFT JOIN artistes a ON o.artiste_id = a.artiste_id
            LEFT JOIN mouvements m ON o.mouvement_id = m.mouvement_id
            WHERE o.oeuvre_id = %s
        """, (oeuvre_id,))
        return cur.fetchone()
    finally:
        cur.close()
        conn.close()


def get_all_artworks() -> List[Dict[str, Any]]:
    """Récupère toutes les œuvres"""
    conn = _connect_postgres()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT o.*, 
                   a.nom as artiste_nom,
                   m.nom as mouvement_nom
            FROM oeuvres o
            LEFT JOIN artistes a ON o.artiste_id = a.artiste_id
            LEFT JOIN mouvements m ON o.mouvement_id = m.mouvement_id
            ORDER BY o.created_at DESC
        """)
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()


def search_artworks(query: str) -> List[Dict[str, Any]]:
    """Recherche d'œuvres par mot-clé"""
    conn = _connect_postgres()
    cur = conn.cursor()
    
    try:
        search_pattern = f"%{query}%"
        cur.execute("""
            SELECT o.*, 
                   a.nom as artiste_nom,
                   m.nom as mouvement_nom
            FROM oeuvres o
            LEFT JOIN artistes a ON o.artiste_id = a.artiste_id
            LEFT JOIN mouvements m ON o.mouvement_id = m.mouvement_id
            WHERE o.title ILIKE %s 
               OR o.artist ILIKE %s
               OR o.description ILIKE %s
               OR a.nom ILIKE %s
            ORDER BY o.created_at DESC
        """, (search_pattern, search_pattern, search_pattern, search_pattern))
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()


# ===== FONCTIONS SECTIONS =====

def add_section(oeuvre_id: int, type_section: str, content: str,
                title: Optional[str] = None, ordre: int = 0) -> int:
    """Ajoute une section documentaire"""
    conn = _connect_postgres()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            INSERT INTO sections (oeuvre_id, type_section, title, content, ordre)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING section_id
        """, (oeuvre_id, type_section, title, content, ordre))
        
        section_id = cur.fetchone()['section_id']
        conn.commit()
        return section_id
        
    finally:
        cur.close()
        conn.close()


def get_artwork_sections(oeuvre_id: int) -> List[Dict[str, Any]]:
    """Récupère sections d'une œuvre"""
    conn = _connect_postgres()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT * FROM sections 
            WHERE oeuvre_id = %s 
            ORDER BY ordre, section_id
        """, (oeuvre_id,))
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()


# ===== FONCTIONS ANECDOTES =====

def add_anecdote(oeuvre_id: int, content: str, 
                 title: Optional[str] = None, source: Optional[str] = None) -> int:
    """Ajoute une anecdote"""
    conn = _connect_postgres()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            INSERT INTO anecdotes (oeuvre_id, title, content, source)
            VALUES (%s, %s, %s, %s)
            RETURNING anecdote_id
        """, (oeuvre_id, title, content, source))
        
        anecdote_id = cur.fetchone()['anecdote_id']
        conn.commit()
        return anecdote_id
        
    finally:
        cur.close()
        conn.close()


def get_artwork_anecdotes(oeuvre_id: int) -> List[Dict[str, Any]]:
    """Récupère anecdotes d'une œuvre"""
    conn = _connect_postgres()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT * FROM anecdotes 
            WHERE oeuvre_id = %s
        """, (oeuvre_id,))
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()


# ===== FONCTIONS CHUNKS (RAG) =====

def add_chunk(oeuvre_id: int, chunk_text: str, chunk_index: int = 0) -> int:
    """Ajoute un chunk pour RAG"""
    conn = _connect_postgres()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            INSERT INTO chunk (oeuvre_id, chunk_text, chunk_index)
            VALUES (%s, %s, %s)
            RETURNING chunk_id
        """, (oeuvre_id, chunk_text, chunk_index))
        
        chunk_id = cur.fetchone()['chunk_id']
        conn.commit()
        return chunk_id
        
    finally:
        cur.close()
        conn.close()


def get_artwork_chunks(oeuvre_id: int) -> List[Dict[str, Any]]:
    """Récupère chunks d'une œuvre"""
    conn = _connect_postgres()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT * FROM chunk 
            WHERE oeuvre_id = %s 
            ORDER BY chunk_index
        """, (oeuvre_id,))
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()

def get_criteres() -> Dict[str, List[Any]]:
    """
    Retourne les critères groupés par nom, triés par ordre.
    Exemple:
    {
      "style_narration": ["Enfant", "Ado", "Adulte"],
      etc
    }
    """
    conn = _connect_postgres()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT *
            FROM criterias
            ORDER BY criteria_id
        """)
        rows = cur.fetchall()

        options = defaultdict(list)
        for r in rows:
            # 1. On identifie la clé de regroupement
            group_key = r["type"]
        
            item_data = dict(r)
            
            options[group_key].append(item_data)

        return dict(options)

    finally:
        cur.close()
        conn.close()
        
        
def add_criteria(
    cat_type: str, 
    name: str, 
    description: Optional[str] = None, 
    image_link: Optional[str] = None
) -> Optional[int]:
    """
    Ajoute un critère dans la base de données.
    Retourne l'ID du nouveau critère ou None en cas d'erreur.
    """
    conn = _connect_postgres()
    cur = conn.cursor()
    
    try:
        # SQL avec des placeholders (%s)
        query = """
            INSERT INTO criterias (type, name, description, image_link)
            VALUES (%s, %s, %s, %s)
            RETURNING criteria_id;
        """
        
        # Exécution : on passe les variables dans un tuple
        cur.execute(query, (cat_type, name, description, image_link))
        
        # On récupère l'ID généré grâce au "RETURNING"
        new_id = cur.fetchone()['criteria_id']
        
        # Valider la transaction
        conn.commit()
        print(f"Succès : '{name}' ajouté avec l'ID {new_id}")
        return new_id

    except Exception as e:
        conn.rollback() 
        print(f"Erreur lors de l'ajout de {name}: {e}")
        return None
        
    finally:
        cur.close()
        conn.close()