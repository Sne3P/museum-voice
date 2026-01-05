-- ============================================
-- SCRIPT DE VÉRIFICATION POST-SAUVEGARDE
-- ============================================
-- À exécuter après avoir sauvegardé le plan depuis l'éditeur
-- pour vérifier que tout est correct

-- 1. VÉRIFIER LES NOMS DES ENTITÉS
SELECT 
    entity_type,
    name,
    COUNT(*) as nombre
FROM entities
GROUP BY entity_type, name
ORDER BY entity_type, name;

-- 2. VÉRIFIER LES RELATIONS ENTRE SALLES
SELECT 
    r.relation_id,
    e1.name as salle_source,
    e2.name as salle_destination,
    r.type_relation
FROM relations r
JOIN entities e1 ON r.source_id = e1.entity_id
JOIN entities e2 ON r.cible_id = e2.entity_id
ORDER BY r.relation_id;

-- 3. VÉRIFIER LES ŒUVRES ET LEURS SALLES
SELECT 
    o.oeuvre_id,
    o.title,
    o.room as room_entity_id,
    e.name as room_name,
    p.x,
    p.y
FROM oeuvres o
LEFT JOIN entities e ON e.entity_id = o.room AND e.entity_type = 'ROOM'
LEFT JOIN entities ea ON ea.oeuvre_id = o.oeuvre_id AND ea.entity_type = 'ARTWORK'
LEFT JOIN points p ON p.entity_id = ea.entity_id
ORDER BY o.oeuvre_id;

-- 4. VÉRIFIER LES PORTES ET LEURS CONNEXIONS
SELECT 
    e.entity_id,
    e.name as porte_name,
    e.description::json->>'room_a' as room_a_uuid,
    e.description::json->>'room_b' as room_b_uuid,
    e.description::json->>'door_number' as door_number
FROM entities e
WHERE e.entity_type = 'DOOR'
ORDER BY e.entity_id;

-- 5. STATISTIQUES GLOBALES
SELECT 
    'SALLES' as type, COUNT(*) as total FROM entities WHERE entity_type = 'ROOM'
UNION ALL
SELECT 'PORTES', COUNT(*) FROM entities WHERE entity_type = 'DOOR'
UNION ALL
SELECT 'MURS', COUNT(*) FROM entities WHERE entity_type = 'WALL'
UNION ALL
SELECT 'ESCALIERS', COUNT(*) FROM entities WHERE entity_type = 'VERTICAL_LINK'
UNION ALL
SELECT 'ARTWORKS', COUNT(*) FROM entities WHERE entity_type = 'ARTWORK'
UNION ALL
SELECT 'RELATIONS', COUNT(*) FROM relations
UNION ALL
SELECT 'OEUVRES', COUNT(*) FROM oeuvres
UNION ALL
SELECT 'NARRATIONS', COUNT(*) FROM pregenerations;

-- 6. VÉRIFIER QUE TOUTES LES ŒUVRES ONT UN ROOM VALIDE
SELECT 
    'Œuvres sans room' as verification,
    COUNT(*) as nombre
FROM oeuvres 
WHERE room IS NULL
UNION ALL
SELECT 
    'Œuvres avec room invalide',
    COUNT(*)
FROM oeuvres o
LEFT JOIN entities e ON e.entity_id = o.room AND e.entity_type = 'ROOM'
WHERE o.room IS NOT NULL AND e.entity_id IS NULL;
