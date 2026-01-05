-- ============================================
-- MIGRATION: Corriger les room_id des œuvres
-- ============================================
-- Problème: Les œuvres dans la table 'oeuvres' ont room=NULL
-- Solution: Récupérer le room depuis les entities/points
-- ============================================

-- Étape 1: Voir l'état actuel
SELECT 
    o.oeuvre_id,
    o.title,
    o.room as room_actuel,
    e.entity_id as artwork_entity_id,
    p.x,
    p.y
FROM oeuvres o
LEFT JOIN entities e ON e.oeuvre_id = o.oeuvre_id AND e.entity_type = 'ARTWORK'
LEFT JOIN points p ON p.entity_id = e.entity_id
ORDER BY o.oeuvre_id;

-- Étape 2: Trouver dans quelle room se trouve chaque artwork
-- (en vérifiant si le point de l'artwork est dans le polygone d'une room)

-- Pour simplifier, on va créer une fonction helper temporaire
CREATE OR REPLACE FUNCTION point_in_polygon(
    px REAL, 
    py REAL, 
    room_entity_id INT
) RETURNS BOOLEAN AS $$
DECLARE
    room_points RECORD;
    point_count INT;
    intersections INT := 0;
    x1 REAL;
    y1 REAL;
    x2 REAL;
    y2 REAL;
    i INT;
BEGIN
    -- Récupérer tous les points de la room
    SELECT COUNT(*) INTO point_count 
    FROM points 
    WHERE entity_id = room_entity_id;
    
    IF point_count < 3 THEN
        RETURN FALSE;
    END IF;
    
    -- Algorithme Ray Casting pour vérifier si point dans polygone
    FOR i IN 1..point_count LOOP
        SELECT x, y INTO x1, y1 
        FROM points 
        WHERE entity_id = room_entity_id AND ordre = i;
        
        SELECT x, y INTO x2, y2 
        FROM points 
        WHERE entity_id = room_entity_id AND ordre = (i % point_count) + 1;
        
        -- Ray casting horizontal depuis px vers la droite
        IF ((y1 > py) != (y2 > py)) AND 
           (px < (x2 - x1) * (py - y1) / (y2 - y1) + x1) THEN
            intersections := intersections + 1;
        END IF;
    END LOOP;
    
    -- Impair = dedans, Pair = dehors
    RETURN (intersections % 2) = 1;
END;
$$ LANGUAGE plpgsql;

-- Étape 3: Mettre à jour les room_id des œuvres
UPDATE oeuvres o
SET room = (
    SELECT r.entity_id
    FROM entities r
    CROSS JOIN entities a
    CROSS JOIN points p
    WHERE r.entity_type = 'ROOM'
      AND a.entity_type = 'ARTWORK'
      AND a.oeuvre_id = o.oeuvre_id
      AND p.entity_id = a.entity_id
      AND point_in_polygon(p.x, p.y, r.entity_id)
    LIMIT 1
)
WHERE o.room IS NULL;

-- Étape 4: Vérifier le résultat
SELECT 
    o.oeuvre_id,
    o.title,
    o.room as room_entity_id,
    e_room.name as room_name,
    e_artwork.entity_id as artwork_entity_id,
    p.x,
    p.y
FROM oeuvres o
LEFT JOIN entities e_artwork ON e_artwork.oeuvre_id = o.oeuvre_id AND e_artwork.entity_type = 'ARTWORK'
LEFT JOIN points p ON p.entity_id = e_artwork.entity_id
LEFT JOIN entities e_room ON e_room.entity_id = o.room AND e_room.entity_type = 'ROOM'
ORDER BY o.oeuvre_id;

-- Étape 5: Nettoyer la fonction temporaire
DROP FUNCTION IF EXISTS point_in_polygon;

-- Afficher statistiques finales
SELECT 
    COUNT(*) as total_oeuvres,
    COUNT(room) as oeuvres_avec_room,
    COUNT(*) - COUNT(room) as oeuvres_sans_room
FROM oeuvres;
