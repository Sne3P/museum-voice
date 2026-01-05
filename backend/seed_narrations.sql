-- ============================================
-- SEED NARRATIONS POUR TEST PARCOURS
-- 4 œuvres × 36 combinaisons = 144 narrations
-- ============================================

-- Vider les anciennes narrations
TRUNCATE TABLE pregenerations RESTART IDENTITY CASCADE;

-- ============================================
-- ŒUVRE 1: Profil sombre (ID: 1, Salle NULL)
-- ============================================

-- ENFANT - TECHNIQUE PICTURALE
INSERT INTO pregenerations (oeuvre_id, age_cible, thematique, style_texte, pregeneration_text) VALUES
(1, 'enfant', 'technique_picturale', 'analyse', 'Cette peinture utilise beaucoup de couleurs sombres. Le peintre a appliqué la peinture avec un pinceau large, en faisant de grands gestes. On voit des couches épaisses de peinture qui se superposent. Les couleurs marron et noires dominent le tableau.'),
(1, 'enfant', 'technique_picturale', 'decouverte', 'Regarde comment le peintre a utilisé sa peinture! Il l''a étalée de façon très épaisse. On dirait presque que tu pourrais toucher les reliefs. Les couleurs foncées créent une atmosphère mystérieuse.'),
(1, 'enfant', 'technique_picturale', 'anecdote', 'Quand Eugène Leroy peignait, il mettait tellement de peinture que les tableaux devenaient très lourds! Il pouvait passer des mois sur une seule œuvre, ajoutant couche après couche.');

-- ENFANT - BIOGRAPHIE
INSERT INTO pregenerations (oeuvre_id, age_cible, thematique, style_texte, pregeneration_text) VALUES
(1, 'enfant', 'biographie', 'analyse', 'Eugène Leroy était un peintre français qui aimait travailler lentement et avec patience. Il vivait dans le nord de la France. Il peignait souvent les mêmes sujets encore et encore.'),
(1, 'enfant', 'biographie', 'decouverte', 'Connais-tu Eugène Leroy? C''était un artiste très patient qui passait énormément de temps sur chaque tableau. Il habitait dans une région où la lumière changeait beaucoup.'),
(1, 'enfant', 'biographie', 'anecdote', 'Eugène Leroy était aussi professeur! Pendant la journée, il enseignait aux élèves, et le soir, il peignait dans son atelier. Il adorait la peinture par-dessus tout.');

-- ENFANT - HISTORIQUE
INSERT INTO pregenerations (oeuvre_id, age_cible, thematique, style_texte, pregeneration_text) VALUES
(1, 'enfant', 'historique', 'analyse', 'Cette œuvre a été créée au 20ème siècle, à une époque où beaucoup d''artistes expérimentaient avec la peinture. C''était une période de grande liberté artistique en France.'),
(1, 'enfant', 'historique', 'decouverte', 'Imagine l''époque où ce tableau a été peint! Les artistes pouvaient essayer toutes sortes de nouvelles techniques. C''était une période très excitante pour l''art.'),
(1, 'enfant', 'historique', 'anecdote', 'À l''époque où Leroy peignait, la télévision en couleur venait juste d''arriver! Mais lui préférait observer la nature directement pour trouver ses couleurs.');

-- ADO - TECHNIQUE PICTURALE
INSERT INTO pregenerations (oeuvre_id, age_cible, thematique, style_texte, pregeneration_text) VALUES
(1, 'ado', 'technique_picturale', 'analyse', 'Leroy applique la matière picturale en couches épaisses, créant un relief presque sculptural. La palette restreinte aux tons sombres intensifie l''atmosphère contemplative. Les empâtements successifs génèrent une texture unique.'),
(1, 'ado', 'technique_picturale', 'decouverte', 'Observe la façon dont la peinture est appliquée! Ces couches superposées créent une profondeur incroyable. La technique d''empâtement de Leroy est reconnaissable entre mille.'),
(1, 'ado', 'technique_picturale', 'anecdote', 'Leroy utilisait parfois ses mains pour étaler la peinture! Il cherchait une connexion directe avec la matière. Certains de ses tableaux pèsent plusieurs kilos à cause des couches accumulées.');

-- ADO - BIOGRAPHIE
INSERT INTO pregenerations (oeuvre_id, age_cible, thematique, style_texte, pregeneration_text) VALUES
(1, 'ado', 'biographie', 'analyse', 'Eugène Leroy a développé un style unique marqué par l''accumulation de matière. Professeur d''arts plastiques, il conciliait enseignement et création. Son œuvre explore l''essence de la représentation.'),
(1, 'ado', 'biographie', 'decouverte', 'Découvre le parcours de cet artiste atypique! Leroy a choisi de rester en marge des modes parisiennes pour développer sa propre recherche picturale dans le nord de la France.'),
(1, 'ado', 'biographie', 'anecdote', 'Leroy était tellement absorbé par son travail qu''il pouvait passer des années sur une même série! Il reprenait sans cesse ses toiles, les enrichissant constamment.');

-- ADO - HISTORIQUE
INSERT INTO pregenerations (oeuvre_id, age_cible, thematique, style_texte, pregeneration_text) VALUES
(1, 'ado', 'historique', 'analyse', 'Cette œuvre s''inscrit dans le contexte de la peinture d''après-guerre. Les artistes questionnaient la représentation et la matérialité de la peinture elle-même.'),
(1, 'ado', 'historique', 'decouverte', 'Plonge dans le contexte artistique des années d''après-guerre! Les peintres cherchaient de nouvelles voies entre abstraction et figuration.'),
(1, 'ado', 'historique', 'anecdote', 'Quand Leroy exposait à Paris, les critiques étaient divisés! Certains admiraient sa démarche, d''autres trouvaient ses tableaux trop épais et sombres.');

-- ADULTE - TECHNIQUE PICTURALE
INSERT INTO pregenerations (oeuvre_id, age_cible, thematique, style_texte, pregeneration_text) VALUES
(1, 'adulte', 'technique_picturale', 'analyse', 'La technique de Leroy repose sur l''accumulation progressive de matière picturale. Les empâtements généreux créent une surface tactile où la lumière joue dans les aspérités. La palette restreinte renforce l''unité chromatique.'),
(1, 'adulte', 'technique_picturale', 'decouverte', 'Observez la densité matérielle exceptionnelle de cette toile. Les couches successives témoignent d''un processus créatif lent et méditatif. La surface devient presque relief sculptural.'),
(1, 'adulte', 'technique_picturale', 'anecdote', 'Leroy travaillait par sessions répétées sur plusieurs années. Il appliquait la peinture au couteau, au pinceau, parfois même directement du tube. Certaines toiles contiennent plusieurs dizaines de kilos de matière.');

-- ADULTE - BIOGRAPHIE
INSERT INTO pregenerations (oeuvre_id, age_cible, thematique, style_texte, pregeneration_text) VALUES
(1, 'adulte', 'biographie', 'analyse', 'Eugène Leroy développe une œuvre singulière marquée par l''obsession de la matière picturale. Enseignant de formation, il mène parallèlement une recherche plastique exigeante. Son travail interroge les limites de la représentation.'),
(1, 'adulte', 'biographie', 'decouverte', 'Découvrez le parcours de ce peintre atypique qui a choisi de rester à Wasquehal plutôt que de rejoindre Paris. Sa démarche solitaire a produit une œuvre d''une cohérence remarquable.'),
(1, 'adulte', 'biographie', 'anecdote', 'Leroy conservait son atelier dans sa maison familiale. Il peignait tôt le matin avant ses cours, puis tard le soir. Cette discipline rigoureuse a produit une œuvre considérable.');

-- ADULTE - HISTORIQUE
INSERT INTO pregenerations (oeuvre_id, age_cible, thematique, style_texte, pregeneration_text) VALUES
(1, 'adulte', 'historique', 'analyse', 'L''œuvre s''inscrit dans le contexte de la remise en question de la peinture d''après-guerre. Leroy dialogue avec l''expressionnisme abstrait tout en maintenant un lien à la figuration.'),
(1, 'adulte', 'historique', 'decouverte', 'Explorez le contexte artistique des années 1950-1980. Les peintres européens cherchaient une voie propre face à la domination de l''école new-yorkaise.'),
(1, 'adulte', 'historique', 'anecdote', 'Les premières expositions parisiennes de Leroy suscitèrent des réactions contrastées. Certains critiques comparaient sa démarche à celle de Rembrandt pour l''usage de la matière.');

-- SENIOR - TECHNIQUE PICTURALE
INSERT INTO pregenerations (oeuvre_id, age_cible, thematique, style_texte, pregeneration_text) VALUES
(1, 'senior', 'technique_picturale', 'analyse', 'La démarche technique de Leroy s''apparente à celle des maîtres anciens par l''accumulation patiente de glacis et d''empâtements. La construction chromatique procède par superpositions successives, créant une profondeur lumineuse malgré la palette restreinte.'),
(1, 'senior', 'technique_picturale', 'decouverte', 'Observez comment Leroy réinvente la tradition de l''empâtement. Sa technique rappelle celle de Rembrandt ou Courbet, tout en étant résolument contemporaine. La matière devient sujet autant que moyen.'),
(1, 'senior', 'technique_picturale', 'anecdote', 'Leroy utilisait des pinceaux usés jusqu''à la corde et travaillait debout face à ses toiles. Il pouvait passer six mois sur une zone de vingt centimètres, cherchant l''exacte vibration lumineuse.');

-- SENIOR - BIOGRAPHIE
INSERT INTO pregenerations (oeuvre_id, age_cible, thematique, style_texte, pregeneration_text) VALUES
(1, 'senior', 'biographie', 'analyse', 'Eugène Leroy incarne la figure du peintre solitaire poursuivant une recherche exigeante loin des modes parisiennes. Professeur aux Beaux-Arts de Tourcoing, il a formé plusieurs générations d''artistes tout en développant une œuvre d''une cohérence remarquable.'),
(1, 'senior', 'biographie', 'decouverte', 'Découvrez l''itinéraire de ce peintre dont la reconnaissance fut tardive mais durable. Son refus des compromis et sa fidélité à une vision singulière en font une figure majeure de la peinture française.'),
(1, 'senior', 'biographie', 'anecdote', 'Leroy menait une vie d''une régularité monastique, partageant son temps entre l''enseignement et l''atelier. Il refusait de vendre ses toiles avant de les juger abouties, ce qui pouvait prendre des années.');

-- SENIOR - HISTORIQUE
INSERT INTO pregenerations (oeuvre_id, age_cible, thematique, style_texte, pregeneration_text) VALUES
(1, 'senior', 'historique', 'analyse', 'L''œuvre de Leroy s''inscrit dans le débat européen sur l''avenir de la peinture après l''expressionnisme abstrait. Son approche singulière dialogue avec celle d''Auerbach ou Kossoff, partageant une même obsession de la matière.'),
(1, 'senior', 'historique', 'decouverte', 'Explorez le contexte de la peinture européenne d''après-guerre. Tandis que Paris cherchait une nouvelle voie après l''École de Paris, des artistes comme Leroy inventaient des réponses personnelles.'),
(1, 'senior', 'historique', 'anecdote', 'La reconnaissance critique de Leroy vint tardivement, dans les années 1980. Certains y virent un lien avec la nouvelle figuration, d''autres une forme d''expressionnisme tardif. Lui poursuivait simplement sa route.');

-- ============================================
-- ŒUVRE 2, 3, 4: Répéter le même pattern...
-- Pour gagner du temps, je vais créer des variations
-- ============================================

-- ŒUVRE 2: L'Enfant (ID: 2)
INSERT INTO pregenerations (oeuvre_id, age_cible, thematique, style_texte, pregeneration_text) VALUES
-- Répéter les 36 combinaisons avec variations de texte pour "L'Enfant"
(2, 'enfant', 'technique_picturale', 'analyse', 'Dans ce tableau représentant un enfant, le peintre a utilisé des couleurs vives et douces. Les traits sont appliqués avec délicatesse. On distingue les formes du visage grâce aux contrastes de lumière.'),
(2, 'enfant', 'technique_picturale', 'decouverte', 'Observe comment l''artiste a capturé l''innocence de l''enfance! Les couleurs claires et les touches légères donnent une impression de douceur et de fragilité.'),
(2, 'enfant', 'technique_picturale', 'anecdote', 'Pour peindre les enfants, Leroy devait travailler vite car ils ne tenaient pas en place! Il faisait d''abord des croquis rapides puis travaillait de mémoire dans son atelier.'),
(2, 'enfant', 'biographie', 'analyse', 'Eugène Leroy aimait peindre les gens de son entourage. Les enfants étaient des sujets qui l''inspiraient particulièrement. Il cherchait à capturer leur spontanéité.'),
(2, 'enfant', 'biographie', 'decouverte', 'Savais-tu que Leroy peignait souvent les mêmes personnes? Il aimait voir comment son regard sur elles évoluait avec le temps.'),
(2, 'enfant', 'biographie', 'anecdote', 'Les enfants du quartier venaient parfois voir Leroy peindre! Il leur expliquait patiemment son travail, toujours avec le sourire.'),
(2, 'enfant', 'historique', 'analyse', 'La représentation d''enfants dans l''art a une longue tradition. À l''époque de Leroy, les artistes cherchaient de nouvelles façons de capturer l''humanité.'),
(2, 'enfant', 'historique', 'decouverte', 'Les portraits d''enfants ont toujours fasciné les artistes! Ils permettent d''exprimer l''innocence et l''émerveillement.'),
(2, 'enfant', 'historique', 'anecdote', 'Dans les années où Leroy peignait, la photographie devenait courante. Mais lui préférait toujours peindre à l''œil nu.'),
-- ADO
(2, 'ado', 'technique_picturale', 'analyse', 'Le traitement du portrait révèle une approche sensible de la matière. Les zones de lumière contrastent avec les ombres, créant volume et profondeur. La palette est plus claire que d''ordinaire.'),
(2, 'ado', 'technique_picturale', 'decouverte', 'Remarque la différence de traitement avec les autres œuvres! Ici, Leroy utilise une touche plus légère, adaptée à la jeunesse du sujet.'),
(2, 'ado', 'technique_picturale', 'anecdote', 'Pour ce portrait, Leroy a travaillé différemment. Il a d''abord établi les grandes masses avant d''affiner les détails. Le processus a pris plusieurs mois.'),
(2, 'ado', 'biographie', 'analyse', 'Leroy abordait le portrait avec la même exigence que ses autres sujets. Il cherchait l''essence du modèle au-delà de la simple ressemblance physique.'),
(2, 'ado', 'biographie', 'decouverte', 'Explore comment Leroy concevait le portrait! Pour lui, c''était une façon d''étudier l''humanité et la lumière sur les visages.'),
(2, 'ado', 'biographie', 'anecdote', 'Leroy refaisait souvent ses portraits! Il n''était jamais totalement satisfait et pouvait reprendre une toile des années après.'),
(2, 'ado', 'historique', 'analyse', 'Le portrait dans les années d''après-guerre connaît un renouveau. Les artistes comme Leroy cherchent à réinventer ce genre traditionnel.'),
(2, 'ado', 'historique', 'decouverte', 'Découvre comment le portrait a évolué au 20ème siècle! Entre abstraction et figuration, chaque artiste trouve sa voie.'),
(2, 'ado', 'historique', 'anecdote', 'Quand Leroy exposait ses portraits, le public était souvent intrigué. Les visages semblaient émerger de la matière épaisse comme des apparitions.'),
-- ADULTE
(2, 'adulte', 'technique_picturale', 'analyse', 'Le portrait manifeste une approche plus retenue dans l''application de la matière. Les transitions chromatiques sont travaillées avec subtilité. La lumière modèle délicatement les volumes du visage.'),
(2, 'adulte', 'technique_picturale', 'decouverte', 'Observez la maîtrise technique dans le rendu des chairs. Leroy adapte sa touche au sujet, révélant une grande sensibilité. Le travail de la lumière est particulièrement abouti.'),
(2, 'adulte', 'technique_picturale', 'anecdote', 'Ce portrait a nécessité plusieurs dizaines de séances. Leroy travaillait par couches successives, laissant sécher entre chaque intervention. La construction progressive révèle sa méthode patiente.'),
(2, 'adulte', 'biographie', 'analyse', 'La pratique du portrait chez Leroy s''inscrit dans une tradition humaniste. Il cherche à révéler l''intériorité du modèle à travers l''étude approfondie de la physionomie.'),
(2, 'adulte', 'biographie', 'decouverte', 'Découvrez comment Leroy concevait l''exercice du portrait. Pour lui, c''était avant tout une étude de la lumière et de ses effets sur la matière vivante.'),
(2, 'adulte', 'biographie', 'anecdote', 'Leroy conservait dans son atelier des dizaines de portraits inachevés. Il y revenait périodiquement, cherchant toujours à approfondir sa compréhension du sujet.'),
(2, 'adulte', 'historique', 'analyse', 'Dans le contexte des années 1960-1980, le portrait connaît un regain d''intérêt. Les artistes européens proposent des approches renouvelées face à la domination de l''abstraction.'),
(2, 'adulte', 'historique', 'decouverte', 'Explorez la place du portrait dans l''art d''après-guerre. Entre tradition et modernité, les artistes comme Leroy inventent de nouvelles voies.'),
(2, 'adulte', 'historique', 'anecdote', 'Les portraits de Leroy furent d''abord peu compris du grand public. Ce n''est que dans les années 1980 que leur force expressive fut pleinement reconnue.'),
-- SENIOR
(2, 'senior', 'technique_picturale', 'analyse', 'Le portrait témoigne d''une maîtrise consommée du clair-obscur. Les passages lumineux sont travaillés avec une délicatesse qui rappelle les maîtres flamands. La construction par plans successifs révèle une approche quasi architecturale.'),
(2, 'senior', 'technique_picturale', 'decouverte', 'Observez la sophistication du modelé dans ce portrait. Leroy y déploie toute sa science de la lumière et de la matière. Chaque touche participe à l''émergence progressive du visage.'),
(2, 'senior', 'technique_picturale', 'anecdote', 'Pour ce portrait, Leroy a utilisé une palette limitée à quelques terres et blancs. Il cherchait à retrouver la sobriété des maîtres anciens tout en maintenant une facture contemporaine.'),
(2, 'senior', 'biographie', 'analyse', 'Le portrait occupe une place centrale dans l''œuvre de Leroy. Il y poursuit une méditation sur la présence humaine et les mystères de l''individuation. Son approche conjugue rigueur et sensibilité.'),
(2, 'senior', 'biographie', 'decouverte', 'Découvrez la conception lerotienne du portrait. Au-delà de la ressemblance, l''artiste cherche à saisir ce qu''il nomme la vibration intérieure du modèle.'),
(2, 'senior', 'biographie', 'anecdote', 'Leroy racontait qu''un portrait n''était jamais fini. Il le considérait achevé lorsqu''il parvenait à oublier qu''il s''agissait d''une peinture et voyait une présence.'),
(2, 'senior', 'historique', 'analyse', 'Ce portrait s''inscrit dans le débat sur la pérennité du genre à l''ère de la photographie et de l''abstraction. Leroy y démontre la vitalité continue de la tradition portraitiste.'),
(2, 'senior', 'historique', 'decouverte', 'Explorez la question du portrait au 20ème siècle. Tandis que certains le proclamaient obsolète, des artistes comme Leroy en renouvelaient profondément la pratique.'),
(2, 'senior', 'historique', 'anecdote', 'Ce portrait fut acquis tardivement par un musée. Durant des années, il resta dans l''atelier de Leroy qui continuait à y travailler épisodiquement.');

-- ŒUVRE 3: Paysage (ID: 3, Salle: 557)
INSERT INTO pregenerations (oeuvre_id, age_cible, thematique, style_texte, pregeneration_text) VALUES
(3, 'enfant', 'technique_picturale', 'analyse', 'Ce paysage est peint avec des coups de pinceau énergiques. Les verts et les bleus se mélangent pour créer ciel et végétation. La peinture forme des reliefs qu''on pourrait presque toucher.'),
(3, 'enfant', 'technique_picturale', 'decouverte', 'Regarde tous ces verts différents! Le peintre a créé un paysage vivant où on imagine presque sentir le vent dans les arbres.'),
(3, 'enfant', 'technique_picturale', 'anecdote', 'Leroy peignait souvent ses paysages dehors au début, puis finissait dans son atelier. Il aimait observer comment la lumière changeait selon l''heure.'),
(3, 'enfant', 'biographie', 'analyse', 'Leroy habitait une région avec de beaux paysages. Il aimait se promener et observer la nature pour trouver l''inspiration pour ses tableaux.'),
(3, 'enfant', 'biographie', 'decouverte', 'Savais-tu que Leroy se promenait chaque jour dans la campagne? Il observait les arbres, le ciel, la terre, puis rentrait peindre ce qu''il avait vu.'),
(3, 'enfant', 'biographie', 'anecdote', 'Leroy connaissait tous les chemins autour de chez lui! Il avait ses endroits préférés où il revenait peindre à différentes saisons.'),
(3, 'enfant', 'historique', 'analyse', 'Les paysages ont toujours été importants dans l''art. À l''époque de Leroy, les artistes cherchaient de nouvelles façons de montrer la nature.'),
(3, 'enfant', 'historique', 'decouverte', 'Imagine la campagne française où Leroy vivait! Les champs, les arbres, le ciel changeant... Tout ça l''inspirait pour ses peintures.'),
(3, 'enfant', 'historique', 'anecdote', 'À l''époque où ce tableau a été peint, la campagne changeait beaucoup. Leroy voulait garder en mémoire ces paysages qu''il aimait.'),
-- Suite ADO, ADULTE, SENIOR pour l'œuvre 3...
(3, 'ado', 'technique_picturale', 'analyse', 'Le paysage révèle une approche gestuelle et matérielle. Les empâtements suggèrent la densité de la végétation. Les contrastes entre tons chauds et froids créent profondeur et atmosphère.'),
(3, 'ado', 'technique_picturale', 'decouverte', 'Observe la liberté du geste pictural! Leroy capte l''énergie du paysage plutôt que sa reproduction fidèle. C''est une impression, une sensation.'),
(3, 'ado', 'technique_picturale', 'anecdote', 'Leroy peignait parfois le même paysage pendant des années! Il revenait au même endroit, à différentes saisons, capturant les changements lumineux.'),
(3, 'ado', 'biographie', 'analyse', 'Le paysage nordiste marque profondément l''œuvre de Leroy. Cette lumière particulière, ces ciels changeants deviennent sujets d''étude obsessionnels.'),
(3, 'ado', 'biographie', 'decouverte', 'Découvre le lien profond entre Leroy et sa région! Le Nord de la France, avec ses lumières et ses atmosphères, nourrit constamment son travail.'),
(3, 'ado', 'biographie', 'anecdote', 'Leroy refusait de voyager pour peindre! Il disait qu''il avait tout ce qu''il lui fallait autour de chez lui. Pas besoin d''aller chercher ailleurs.'),
(3, 'ado', 'historique', 'analyse', 'Le paysage dans l''art d''après-guerre oscille entre abstraction et figuration. Leroy trouve une voie personnelle, ni totalement l''un ni l''autre.'),
(3, 'ado', 'historique', 'decouverte', 'Explore comment les artistes du 20ème siècle ont renouvelé le genre du paysage! Entre tradition et modernité, chacun invente son langage.'),
(3, 'ado', 'historique', 'anecdote', 'Les paysages de Leroy étaient parfois comparés à ceux des impressionnistes. Mais lui cherchait autre chose: la matière même de la nature.'),
(3, 'adulte', 'technique_picturale', 'analyse', 'Le traitement du paysage conjugue observation directe et méditation picturale. Les empâtements traduisent la densité végétale. La palette restreinte unifie la composition.'),
(3, 'adulte', 'technique_picturale', 'decouverte', 'Observez comment Leroy transforme le motif paysager. Au-delà de la représentation, il cherche à rendre la sensation même de la nature, sa vibration.'),
(3, 'adulte', 'technique_picturale', 'anecdote', 'Leroy travaillait ses paysages en atelier d''après mémoire. Cette distance temporelle lui permettait de distiller l''essentiel de son expérience.'),
(3, 'adulte', 'biographie', 'analyse', 'L''enracinement régional de Leroy constitue un choix artistique délibéré. Il trouve dans les paysages nordistes une source inépuisable de variations lumineuses.'),
(3, 'adulte', 'biographie', 'decouverte', 'Découvrez la relation de Leroy à son territoire. Loin de tout exotisme, il puise dans la familiarité des lieux une matière pour sa recherche picturale.'),
(3, 'adulte', 'biographie', 'anecdote', 'Leroy affirmait qu''un vrai peintre n''a besoin que d''un kilomètre carré à étudier toute sa vie. Il appliquait ce précepte avec une constance remarquable.'),
(3, 'adulte', 'historique', 'analyse', 'Le paysage lerotien dialogue avec l''histoire du genre. On y décèle des échos de Corot et Courbet, mais réinterprétés dans un langage contemporain.'),
(3, 'adulte', 'historique', 'decouverte', 'Explorez la position singulière de Leroy dans le paysage artistique d''après-guerre. Entre abstraction lyrique et nouvelle figuration, il trace sa propre voie.'),
(3, 'adulte', 'historique', 'anecdote', 'Les paysages de Leroy furent d''abord peu exposés. Il les considérait comme des exercices privés avant de les montrer publiquement dans les années 1980.'),
(3, 'senior', 'technique_picturale', 'analyse', 'Le paysage manifeste une approche synthétique héritière de Corot et des maîtres de Barbizon. Les masses sont construites par plans successifs. La touche finale, presque calligraphique, anime l''ensemble.'),
(3, 'senior', 'technique_picturale', 'decouverte', 'Observez la sophistication de la construction spatiale. Leroy y conjugue observation directe et élaboration méditative. La matière devient métaphore de la terre elle-même.'),
(3, 'senior', 'technique_picturale', 'anecdote', 'Pour ses paysages, Leroy utilisait souvent les mêmes tubes de couleur jusqu''à épuisement. Cette économie de moyens renforçait l''unité chromatique de ses séries.'),
(3, 'senior', 'biographie', 'analyse', 'L''attachement de Leroy à son terroir s''inscrit dans une tradition nordiste de méditation sur le proche. Sa démarche évoque celle d''un Van Gogh ou d''un Permeke.'),
(3, 'senior', 'biographie', 'decouverte', 'Découvrez la philosophie paysagère de Leroy. Pour lui, la profondeur ne se trouve pas dans l''exotique mais dans l''étude approfondie du familier.'),
(3, 'senior', 'biographie', 'anecdote', 'Leroy racontait qu''il lui fallait vingt ans pour vraiment voir un arbre. Cette patience dans l''observation fondait son approche du paysage.'),
(3, 'senior', 'historique', 'analyse', 'Les paysages de Leroy répondent à la tradition nordiste de méditation sur la terre et la lumière. Ils dialoguent avec l''expressionnisme flamand tout en proposant une voix singulière.'),
(3, 'senior', 'historique', 'decouverte', 'Explorez la question du paysage dans l''art européen d''après-guerre. Entre héritage romantique et abstraction, Leroy invente une synthèse personnelle.'),
(3, 'senior', 'historique', 'anecdote', 'Ces paysages furent longtemps méconnus, éclipsés par les portraits. Leur redécouverte dans les années 1990 révéla un aspect majeur de l''œuvre.');

-- ŒUVRE 4: Autoportrait (lichen) (ID: 4, Salle: 557)
INSERT INTO pregenerations (oeuvre_id, age_cible, thematique, style_texte, pregeneration_text) VALUES
(4, 'enfant', 'technique_picturale', 'analyse', 'Cet autoportrait montre comment le peintre se voyait lui-même. Les couleurs sont appliquées en couches épaisses. On voit son visage émerger de la peinture comme s''il sortait du brouillard.'),
(4, 'enfant', 'technique_picturale', 'decouverte', 'C''est le peintre qui s''est peint lui-même! Observe comment il a utilisé beaucoup de matière pour créer son portrait. C''est impressionnant!'),
(4, 'enfant', 'technique_picturale', 'anecdote', 'Pour se peindre, Leroy se regardait dans un miroir! Mais il ne copiait pas exactement ce qu''il voyait. Il peignait ce qu''il ressentait.'),
(4, 'enfant', 'biographie', 'analyse', 'Un autoportrait, c''est quand l''artiste se peint lui-même. Leroy en a fait plusieurs dans sa vie. C''était sa façon de réfléchir à qui il était.'),
(4, 'enfant', 'biographie', 'decouverte', 'Regarde bien: c''est Eugène Leroy lui-même! Il s''observait dans le miroir et peignait ce qu''il voyait. C''est une façon de se connaître mieux.'),
(4, 'enfant', 'biographie', 'anecdote', 'Leroy faisait des autoportraits toute sa vie! Il aimait voir comment son visage changeait avec le temps. Comme des photos, mais en peinture.'),
(4, 'enfant', 'historique', 'analyse', 'Les artistes font des autoportraits depuis très longtemps. C''est une tradition importante dans l''histoire de l''art. Leroy continue cette tradition.'),
(4, 'enfant', 'historique', 'decouverte', 'Savais-tu que beaucoup de grands peintres ont fait leur autoportrait? C''est une façon de laisser une trace de soi dans l''histoire.'),
(4, 'enfant', 'historique', 'anecdote', 'Avant l''invention de la photo, les autoportraits étaient le seul moyen pour un artiste de garder une image de lui! Leroy a continué même après l''invention de l''appareil photo.'),
-- Suite pour ADO, ADULTE, SENIOR œuvre 4...
(4, 'ado', 'technique_picturale', 'analyse', 'L''autoportrait révèle une approche introspective de la matière picturale. Les couches successives créent une profondeur psychologique. Le regard émerge des empâtements avec intensité.'),
(4, 'ado', 'technique_picturale', 'decouverte', 'Observe la force de cet autoportrait! Leroy se représente non pas tel qu''il paraît, mais tel qu''il se perçoit. La matière devient miroir de l''âme.'),
(4, 'ado', 'technique_picturale', 'anecdote', 'Pour cet autoportrait, Leroy a travaillé pendant des mois devant son miroir! Il reprenait sans cesse son visage, cherchant à saisir quelque chose d''insaisissable.'),
(4, 'ado', 'biographie', 'analyse', 'L''autoportrait constitue chez Leroy un exercice de connaissance de soi. À travers ces œuvres, il explore les transformations du temps et du regard.'),
(4, 'ado', 'biographie', 'decouverte', 'Découvre la série d''autoportraits de Leroy! Tout au long de sa vie, il se peint régulièrement, créant une sorte de journal intime pictural.'),
(4, 'ado', 'biographie', 'anecdote', 'Leroy disait que se peindre soi-même était l''exercice le plus difficile! Plus dur que n''importe quel autre sujet car on se connaît trop bien.'),
(4, 'ado', 'historique', 'analyse', 'L''autoportrait dans l''art moderne devient exploration psychologique. Leroy s''inscrit dans cette tradition tout en proposant une vision très personnelle.'),
(4, 'ado', 'historique', 'decouverte', 'Explore la tradition de l''autoportrait au 20ème siècle! De Van Gogh à Bacon, chaque artiste y cherche quelque chose de différent.'),
(4, 'ado', 'historique', 'anecdote', 'Les autoportraits de Leroy étaient rarement exposés de son vivant. Il les considérait comme trop intimes pour être montrés facilement.'),
(4, 'adulte', 'technique_picturale', 'analyse', 'L''autoportrait manifeste une quête identitaire à travers la matière. Les empâtements traduisent la densité de l''interrogation. Le regard, intensément présent, émerge de la surface tourmentée.'),
(4, 'adulte', 'technique_picturale', 'decouverte', 'Observez la puissance de cet autoportrait. Leroy y déploie toute sa maîtrise technique au service d''une introspection sans complaisance.'),
(4, 'adulte', 'technique_picturale', 'anecdote', 'Cet autoportrait a nécessité plusieurs années de travail. Leroy y revenait périodiquement, ajoutant des couches, modifiant le regard, cherchant une vérité toujours fuyante.'),
(4, 'adulte', 'biographie', 'analyse', 'Les autoportraits jalonnent le parcours de Leroy comme des jalons existentiels. Chacun marque une étape dans sa compréhension de soi et de son art.'),
(4, 'adulte', 'biographie', 'decouverte', 'Découvrez la dimension autobiographique de ces autoportraits. Leroy y poursuit un dialogue avec lui-même, témoin de son évolution intérieure.'),
(4, 'adulte', 'biographie', 'anecdote', 'Leroy conservait ses autoportraits dans une pièce séparée de son atelier. Il disait qu''ils étaient ses compagnons silencieux, témoins de sa vie.'),
(4, 'adulte', 'historique', 'analyse', 'L''autoportrait lerotien dialogue avec la grande tradition de Rembrandt à Van Gogh. Il en renouvelle l''approche par l''emphase mise sur la matérialité.'),
(4, 'adulte', 'historique', 'decouverte', 'Explorez la place de l''autoportrait dans l''art du 20ème siècle. Entre affirmation du moi et questionnement existentiel, il demeure un exercice fondamental.'),
(4, 'adulte', 'historique', 'anecdote', 'Ces autoportraits furent longtemps ignorés par la critique, concentrée sur les autres sujets. Leur exposition dans les années 1990 révéla leur importance centrale.'),
(4, 'senior', 'technique_picturale', 'analyse', 'L''autoportrait témoigne d''une méditation sur la condition du peintre. La construction par accumulation matérielle évoque le travail du temps sur le visage et la mémoire. Chaque couche semble porter une strate temporelle.'),
(4, 'senior', 'technique_picturale', 'decouverte', 'Observez la profondeur métaphysique de cet autoportrait. Leroy y questionne simultanément son identité d''homme et de peintre. La matière devient support d''une quête existentielle.'),
(4, 'senior', 'technique_picturale', 'anecdote', 'Pour cet autoportrait, Leroy utilisait un petit miroir piqué dans le bois de son chevalet. Il travaillait debout, en lumière naturelle, toujours aux mêmes heures.'),
(4, 'senior', 'biographie', 'analyse', 'Les autoportraits constituent le fil rouge de l''œuvre lerotienne. De la jeunesse à la maturité, ils documentent une quête inlassable de vérité picturale et personnelle.'),
(4, 'senior', 'biographie', 'decouverte', 'Découvrez la dimension testamentaire de ces autoportraits. Leroy y consigne non seulement son apparence mais sa vision du monde et de l''art.'),
(4, 'senior', 'biographie', 'anecdote', 'Leroy racontait qu''en se peignant, il ne cherchait pas la ressemblance mais une forme de présence. Il voulait que le tableau soit aussi vivant que lui.'),
(4, 'senior', 'historique', 'analyse', 'L''autoportrait s''inscrit dans une lignée qui va de Rembrandt à Giacometti. Leroy en propose une interprétation où matière et psyché se confondent.'),
(4, 'senior', 'historique', 'decouverte', 'Explorez la tradition de l''autoportrait dans l''art occidental. Leroy y apporte une contribution singulière, conjuguant introspection et recherche formelle.'),
(4, 'senior', 'historique', 'anecdote', 'Ces autoportraits furent acquis tardivement par les institutions. On y reconnaît aujourd''hui des chefs-d''œuvre égalant les plus grands maîtres du genre.');

-- Vérification finale
SELECT 
    COUNT(*) as total_narrations,
    COUNT(DISTINCT oeuvre_id) as oeuvres_couvertes,
    COUNT(DISTINCT CONCAT(age_cible, '-', thematique, '-', style_texte)) as profils_uniques
FROM pregenerations;
