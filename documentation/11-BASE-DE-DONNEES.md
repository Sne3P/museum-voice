# 🗄️ Base de Données

## Vue d'ensemble

Le projet utilise **PostgreSQL 15** comme système de gestion de base de données.

### Connexion

| Paramètre | Développement | Production |
|-----------|---------------|------------|
| Host | `localhost` / `postgres` | `postgres` |
| Port | 5432 | 5432 |
| Database | `museum_db` | `museum_db` |
| User | `museum` | `museum` |
| Password | `museum` | `${DB_PASSWORD}` |

---

## Schéma Relationnel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SCHÉMA MUSEUM_DB                                │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐       ┌──────────────┐       ┌──────────────────┐
  │    plans     │       │   entities   │       │      points      │
  ├──────────────┤       ├──────────────┤       ├──────────────────┤
  │ plan_id (PK) │◄──────│ plan_id (FK) │       │ point_id (PK)    │
  │ nom          │       │ entity_id(PK)│◄──────│ entity_id (FK)   │
  │ description  │       │ name         │       │ x                │
  └──────────────┘       │ entity_type  │       │ y                │
         │               │ color        │       │ ordre            │
         │               └──────────────┘       └──────────────────┘
         │
         │               ┌──────────────────┐
         └──────────────►│ museum_entrances │
                         ├──────────────────┤
                         │ entrance_id (PK) │
                         │ plan_id (FK)     │
                         │ name             │
                         │ x, y             │
                         │ icon             │
                         │ is_active        │
                         └──────────────────┘

  ┌──────────────┐       ┌──────────────┐       ┌──────────────────┐
  │   artistes   │       │   oeuvres    │       │      salle       │
  ├──────────────┤       ├──────────────┤       ├──────────────────┤
  │ artiste_id   │◄──────│ artiste_id   │       │ salle_id (PK)    │
  │ nom          │       │ oeuvre_id(PK)│──────►│ salle_nom        │
  │ biographie   │       │ salle_id(FK) │       │ plan_id (FK)     │
  │ dates        │       │ titre        │       └──────────────────┘
  └──────────────┘       │ description  │
                         │ x, y         │
                         │ image_link   │
                         │ pdf_link     │
                         └──────────────┘
                                │
                                ▼
  ┌──────────────────────────────────────────────────────────────────┐
  │                          narrations                               │
  ├──────────────────────────────────────────────────────────────────┤
  │ narration_id (PK)                                                 │
  │ oeuvre_id (FK) ──────────────────────────────────────────────────│
  │ age_id (FK) ─────► criteres_age                                  │
  │ thematique_id (FK) ─────► criteres_thematique                    │
  │ style_id (FK) ─────► criteres_style_texte                        │
  │ texte                                                             │
  │ audio_path                                                        │
  │ duration_seconds                                                  │
  └──────────────────────────────────────────────────────────────────┘

  ┌──────────────┐       ┌──────────────────────┐
  │   parcours   │       │   parcours_oeuvres   │
  ├──────────────┤       ├──────────────────────┤
  │ parcours_id  │◄──────│ parcours_id (FK)     │
  │ nom          │       │ oeuvre_id (FK) ──────│──► oeuvres
  │ description  │       │ ordre                │
  │ is_active    │       └──────────────────────┘
  └──────────────┘
         │
         ▼
  ┌──────────────────────┐
  │    path_segments     │
  ├──────────────────────┤
  │ segment_id (PK)      │
  │ parcours_id (FK)     │
  │ segment_index        │
  │ from_x, from_y       │
  │ from_floor, from_type│
  │ to_x, to_y           │
  │ to_floor, to_type    │
  │ distance_meters      │
  └──────────────────────┘

  ┌──────────────┐       ┌──────────────────┐
  │    links     │       │  vertical_links  │
  ├──────────────┤       ├──────────────────┤
  │ link_id (PK) │       │ link_id (PK)     │
  │ from_entity  │       │ stairs_id_top    │
  │ to_entity    │       │ stairs_id_bottom │
  │ x, y         │       │ type             │
  │ type         │       └──────────────────┘
  └──────────────┘
```

---

## Tables Détaillées

### Table `plans`

Plans (étages) du musée.

```sql
CREATE TABLE plans (
    plan_id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| Colonne | Type | Description |
|---------|------|-------------|
| plan_id | SERIAL | Identifiant unique |
| nom | VARCHAR(255) | Nom de l'étage ("RDC", "Étage 1") |
| description | TEXT | Description optionnelle |

---

### Table `entities`

Entités géométriques (salles, zones).

```sql
CREATE TABLE entities (
    entity_id SERIAL PRIMARY KEY,
    plan_id INTEGER REFERENCES plans(plan_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) DEFAULT 'ROOM',
    color VARCHAR(50) DEFAULT '#f0f0f0',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| Colonne | Type | Description |
|---------|------|-------------|
| entity_id | SERIAL | Identifiant unique |
| plan_id | INTEGER | FK vers plans |
| name | VARCHAR | Nom de la salle |
| entity_type | VARCHAR | Type ("ROOM", "ZONE") |
| color | VARCHAR | Couleur hex (#f0f0f0) |

---

### Table `points`

Points des polygones (contours des salles).

```sql
CREATE TABLE points (
    point_id SERIAL PRIMARY KEY,
    entity_id INTEGER REFERENCES entities(entity_id) ON DELETE CASCADE,
    x FLOAT NOT NULL,
    y FLOAT NOT NULL,
    ordre INTEGER NOT NULL
);
```

| Colonne | Type | Description |
|---------|------|-------------|
| point_id | SERIAL | Identifiant unique |
| entity_id | INTEGER | FK vers entities |
| x, y | FLOAT | Coordonnées en pixels |
| ordre | INTEGER | Ordre dans le polygone |

---

### Table `museum_entrances`

Points d'entrée du musée.

```sql
CREATE TABLE museum_entrances (
    entrance_id SERIAL PRIMARY KEY,
    plan_id INTEGER REFERENCES plans(plan_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'Entrée',
    x FLOAT NOT NULL,
    y FLOAT NOT NULL,
    icon VARCHAR(50) DEFAULT '🚪',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_entrances_plan ON museum_entrances(plan_id);
```

| Colonne | Type | Description |
|---------|------|-------------|
| entrance_id | SERIAL | Identifiant unique |
| plan_id | INTEGER | FK vers plans (étage) |
| name | VARCHAR | Nom ("Entrée Principale") |
| x, y | FLOAT | Coordonnées |
| icon | VARCHAR | Emoji ou code |
| is_active | BOOLEAN | Actif/inactif |

---

### Table `salle`

Métadonnées des salles (lien avec entities).

```sql
CREATE TABLE salle (
    salle_id SERIAL PRIMARY KEY,
    salle_nom VARCHAR(255) NOT NULL,
    plan_id INTEGER REFERENCES plans(plan_id),
    entity_id INTEGER REFERENCES entities(entity_id)
);
```

---

### Table `artistes`

Informations sur les artistes.

```sql
CREATE TABLE artistes (
    artiste_id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    prenom VARCHAR(255),
    dates VARCHAR(100),
    nationalite VARCHAR(100),
    biographie TEXT,
    image_url VARCHAR(500)
);
```

---

### Table `oeuvres`

Œuvres d'art.

```sql
CREATE TABLE oeuvres (
    oeuvre_id SERIAL PRIMARY KEY,
    salle_id INTEGER REFERENCES salle(salle_id),
    artiste_id INTEGER REFERENCES artistes(artiste_id),
    titre VARCHAR(255) NOT NULL,
    date_creation VARCHAR(100),
    technique VARCHAR(255),
    dimensions VARCHAR(100),
    description TEXT,
    x FLOAT,
    y FLOAT,
    image_link VARCHAR(500),
    pdf_link VARCHAR(500),
    audio_link VARCHAR(500),
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_oeuvres_salle ON oeuvres(salle_id);
CREATE INDEX idx_oeuvres_artiste ON oeuvres(artiste_id);
```

---

### Table `narrations`

Narrations audio générées.

```sql
CREATE TABLE narrations (
    narration_id SERIAL PRIMARY KEY,
    oeuvre_id INTEGER REFERENCES oeuvres(oeuvre_id) ON DELETE CASCADE,
    age_id INTEGER REFERENCES criteres_age(age_id),
    thematique_id INTEGER REFERENCES criteres_thematique(thematique_id),
    style_id INTEGER REFERENCES criteres_style_texte(style_id),
    texte TEXT NOT NULL,
    audio_path VARCHAR(500),
    duration_seconds FLOAT,
    is_validated BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_narration_unique ON narrations(
    oeuvre_id, age_id, thematique_id, style_id
);
```

---

### Tables de critères

```sql
CREATE TABLE criteres_age (
    age_id SERIAL PRIMARY KEY,
    label VARCHAR(50) NOT NULL,
    description TEXT
);

INSERT INTO criteres_age (label, description) VALUES
    ('Enfant', '6-10 ans'),
    ('Adolescent', '11-17 ans'),
    ('Adulte', '18-64 ans'),
    ('Senior', '65+ ans');

CREATE TABLE criteres_thematique (
    thematique_id SERIAL PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    description TEXT
);

INSERT INTO criteres_thematique (label, description) VALUES
    ('Art', 'Focus technique artistique'),
    ('Histoire', 'Contexte historique'),
    ('Biographie', 'Vie de l''artiste'),
    ('Symbolisme', 'Significations'),
    ('Émotion', 'Ressenti');

CREATE TABLE criteres_style_texte (
    style_id SERIAL PRIMARY KEY,
    label VARCHAR(50) NOT NULL,
    description TEXT
);

INSERT INTO criteres_style_texte (label, description) VALUES
    ('Court', '1 minute'),
    ('Standard', '2 minutes'),
    ('Détaillé', '3-4 minutes'),
    ('Narratif', 'Raconté'),
    ('Poétique', 'Littéraire');
```

---

### Table `parcours`

Parcours de visite.

```sql
CREATE TABLE parcours (
    parcours_id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

### Table `parcours_oeuvres`

Association parcours-œuvres avec ordre.

```sql
CREATE TABLE parcours_oeuvres (
    parcours_id INTEGER REFERENCES parcours(parcours_id) ON DELETE CASCADE,
    oeuvre_id INTEGER REFERENCES oeuvres(oeuvre_id) ON DELETE CASCADE,
    ordre INTEGER NOT NULL,
    PRIMARY KEY (parcours_id, oeuvre_id)
);

CREATE INDEX idx_parcours_ordre ON parcours_oeuvres(parcours_id, ordre);
```

---

### Table `path_segments`

Segments de chemin calculés.

```sql
CREATE TABLE path_segments (
    segment_id SERIAL PRIMARY KEY,
    parcours_id INTEGER REFERENCES parcours(parcours_id) ON DELETE CASCADE,
    segment_index INTEGER NOT NULL,
    from_x FLOAT NOT NULL,
    from_y FLOAT NOT NULL,
    from_floor INTEGER DEFAULT 0,
    from_type VARCHAR(50) DEFAULT 'artwork',
    from_entity_id INTEGER,
    to_x FLOAT NOT NULL,
    to_y FLOAT NOT NULL,
    to_floor INTEGER DEFAULT 0,
    to_type VARCHAR(50) DEFAULT 'artwork',
    to_entity_id INTEGER,
    distance_meters FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_segments_parcours ON path_segments(parcours_id, segment_index);
```

---

### Table `links`

Liens de navigation (portes, passages).

```sql
CREATE TABLE links (
    link_id SERIAL PRIMARY KEY,
    plan_id INTEGER REFERENCES plans(plan_id) ON DELETE CASCADE,
    from_entity_id INTEGER REFERENCES entities(entity_id),
    to_entity_id INTEGER REFERENCES entities(entity_id),
    x FLOAT NOT NULL,
    y FLOAT NOT NULL,
    type VARCHAR(50) DEFAULT 'door',
    is_bidirectional BOOLEAN DEFAULT true
);
```

---

### Table `vertical_links`

Liens entre étages (escaliers, ascenseurs).

```sql
CREATE TABLE vertical_links (
    link_id SERIAL PRIMARY KEY,
    stairs_id_top INTEGER NOT NULL,
    stairs_id_bottom INTEGER NOT NULL,
    type VARCHAR(50) DEFAULT 'stairs',
    is_active BOOLEAN DEFAULT true
);
```

---

## Requêtes Utiles

### Récupérer toutes les œuvres avec artiste et salle

```sql
SELECT 
    o.oeuvre_id,
    o.titre,
    o.x,
    o.y,
    a.nom AS artiste_nom,
    s.salle_nom,
    p.nom AS floor_name
FROM oeuvres o
LEFT JOIN artistes a ON o.artiste_id = a.artiste_id
LEFT JOIN salle s ON o.salle_id = s.salle_id
LEFT JOIN plans p ON s.plan_id = p.plan_id
WHERE o.is_visible = true
ORDER BY o.oeuvre_id;
```

### Récupérer un parcours complet

```sql
SELECT 
    p.parcours_id,
    p.nom,
    o.oeuvre_id,
    o.titre,
    o.x,
    o.y,
    po.ordre,
    s.salle_nom,
    pl.nom AS floor_name
FROM parcours p
JOIN parcours_oeuvres po ON p.parcours_id = po.parcours_id
JOIN oeuvres o ON po.oeuvre_id = o.oeuvre_id
LEFT JOIN salle s ON o.salle_id = s.salle_id
LEFT JOIN plans pl ON s.plan_id = pl.plan_id
WHERE p.parcours_id = 1
ORDER BY po.ordre;
```

### Statistiques narrations

```sql
SELECT 
    o.titre,
    COUNT(n.narration_id) AS total_narrations,
    COUNT(CASE WHEN n.is_validated THEN 1 END) AS validated
FROM oeuvres o
LEFT JOIN narrations n ON o.oeuvre_id = n.oeuvre_id
GROUP BY o.oeuvre_id, o.titre
ORDER BY total_narrations DESC;
```

---

## Maintenance

### Backup

```bash
docker compose exec postgres pg_dump -U museum museum_db > backup.sql
```

### Restore

```bash
cat backup.sql | docker compose exec -T postgres psql -U museum museum_db
```

### Vacuum

```sql
VACUUM ANALYZE;
```
