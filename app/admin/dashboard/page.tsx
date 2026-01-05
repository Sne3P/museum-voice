'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { X } from 'lucide-react'

interface Oeuvre {
  oeuvre_id: number
  title: string
  artist: string
  date_oeuvre: string
  materiaux_technique: string
  contexte_commande: string
  analyse_materielle_technique: string
  pdf_link: string
  room: number
  created_at: string
  pregeneration_count?: number
  chunk_count?: number
}

interface Pregeneration {
  pregeneration_id: number
  oeuvre_id: number
  age_cible: string
  thematique: string
  style_texte: string
  pregeneration_text: string
  created_at: string
}

interface Stats {
  total_oeuvres: number
  total_pregenerations: number
  total_chunks: number
  oeuvres_with_pregenerations: number
}

export default function AdminDashboard() {
  const [oeuvres, setOeuvres] = useState<Oeuvre[]>([])
  const [pregenerations, setPregenerations] = useState<Pregeneration[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [selectedOeuvre, setSelectedOeuvre] = useState<Oeuvre | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'oeuvres' | 'pregenerations' | 'actions'>('oeuvres')
  const [modalPregen, setModalPregen] = useState<Pregeneration | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      // Charger les œuvres depuis la base PostgreSQL
      const oeuvresRes = await fetch('/api/admin/get-oeuvres')
      if (oeuvresRes.ok) {
        const data = await oeuvresRes.json()
        setOeuvres(data.oeuvres || [])
      }

      // Charger les stats
      const statsRes = await fetch('/api/admin/get-stats')
      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Erreur chargement données:', error)
    }
    setLoading(false)
  }

  async function loadPregenerationsForOeuvre(oeuvreId: number) {
    try {
      const res = await fetch(`/api/admin/get-pregenerations/${oeuvreId}`)
      if (res.ok) {
        const data = await res.json()
        setPregenerations(data.pregenerations || [])
      }
    } catch (error) {
      console.error('Erreur chargement prégénérations:', error)
    }
  }

  async function launchPregenerationForOeuvre(oeuvreId: number, forceRegenerate: boolean = false) {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/pregenerate-artwork/${oeuvreId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force_regenerate: forceRegenerate })
      })

      const data = await res.json()
      if (data.success) {
        alert(`✅ Prégénération terminée !\n${data.stats.generated} narrations générées`)
        await loadData()
        if (selectedOeuvre?.oeuvre_id === oeuvreId) {
          await loadPregenerationsForOeuvre(oeuvreId)
        }
      } else {
        alert(`❌ Erreur: ${data.error}`)
      }
    } catch (error) {
      console.error('Erreur prégénération:', error)
      alert(`❌ Erreur: ${error}`)
    }
    setLoading(false)
  }

  async function launchPregenerationAll(forceRegenerate: boolean = false) {
    if (!confirm(`Lancer la prégénération pour TOUTES les œuvres ?\n(${oeuvres.length} œuvres × 36 variantes = ${oeuvres.length * 36} narrations)`)) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/pregenerate-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force_regenerate: forceRegenerate, use_parallel: true })
      })

      const data = await res.json()
      if (data.success) {
        alert(`✅ Prégénération globale terminée !`)
        await loadData()
      } else {
        alert(`❌ Erreur: ${data.error}`)
      }
    } catch (error) {
      console.error('Erreur prégénération globale:', error)
      alert(`❌ Erreur: ${error}`)
    }
    setLoading(false)
  }

  async function viewOeuvreDetails(oeuvre: Oeuvre) {
    setSelectedOeuvre(oeuvre)
    await loadPregenerationsForOeuvre(oeuvre.oeuvre_id)
    setActiveTab('pregenerations')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🎨 Dashboard Admin - Museum Voice</h1>

        {/* Stats globales */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="text-sm text-gray-600">Œuvres totales</div>
              <div className="text-2xl font-bold">{stats.total_oeuvres}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-gray-600">Narrations générées</div>
              <div className="text-2xl font-bold">{stats.total_pregenerations}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-gray-600">Chunks créés</div>
              <div className="text-2xl font-bold">{stats.total_chunks}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-gray-600">Œuvres complètes</div>
              <div className="text-2xl font-bold text-green-600">
                {stats.oeuvres_with_pregenerations}/{stats.total_oeuvres}
              </div>
            </Card>
          </div>
        )}

        {/* Onglets */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={activeTab === 'oeuvres' ? 'default' : 'outline'}
            onClick={() => setActiveTab('oeuvres')}
          >
            📚 Œuvres
          </Button>
          <Button
            variant={activeTab === 'pregenerations' ? 'default' : 'outline'}
            onClick={() => setActiveTab('pregenerations')}
            disabled={!selectedOeuvre}
          >
            🎯 Prégénérations {selectedOeuvre && `(${selectedOeuvre.title})`}
          </Button>
          <Button
            variant={activeTab === 'actions' ? 'default' : 'outline'}
            onClick={() => setActiveTab('actions')}
          >
            ⚙️ Actions globales
          </Button>
        </div>

        {/* Contenu onglets */}
        <Card className="p-6">
          {activeTab === 'oeuvres' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Liste des œuvres</h2>
                <Button onClick={loadData} variant="outline" size="sm">
                  🔄 Rafraîchir
                </Button>
              </div>

              {loading ? (
                <div className="text-center py-8">Chargement...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">ID</th>
                        <th className="text-left p-2">Titre</th>
                        <th className="text-left p-2">Artiste</th>
                        <th className="text-left p-2">Date</th>
                        <th className="text-left p-2">Salle</th>
                        <th className="text-left p-2">Narrations</th>
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {oeuvres.map((oeuvre) => (
                        <tr key={oeuvre.oeuvre_id} className="border-b hover:bg-gray-50">
                          <td className="p-2">{oeuvre.oeuvre_id}</td>
                          <td className="p-2 font-medium">{oeuvre.title}</td>
                          <td className="p-2">{oeuvre.artist}</td>
                          <td className="p-2">{oeuvre.date_oeuvre}</td>
                          <td className="p-2">{oeuvre.room || '-'}</td>
                          <td className="p-2">
                            <span className={`px-2 py-1 rounded text-sm ${
                              (oeuvre.pregeneration_count || 0) === 36 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {oeuvre.pregeneration_count || 0}/36
                            </span>
                          </td>
                          <td className="p-2 space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => viewOeuvreDetails(oeuvre)}
                            >
                              👁️ Voir
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => launchPregenerationForOeuvre(oeuvre.oeuvre_id)}
                              disabled={loading}
                            >
                              🚀 Générer
                            </Button>
                            {oeuvre.pdf_link && (
                              <a
                                href={oeuvre.pdf_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block px-3 py-1 text-sm border rounded hover:bg-gray-100"
                              >
                                📄 PDF
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {oeuvres.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      Aucune œuvre trouvée. Créez des œuvres dans l'éditeur !
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'pregenerations' && selectedOeuvre && (
            <div>
              <div className="mb-4">
                <h2 className="text-xl font-bold mb-2">
                  Prégénérations : {selectedOeuvre.title}
                </h2>
                <p className="text-sm text-gray-600">
                  Artiste: {selectedOeuvre.artist} | Date: {selectedOeuvre.date_oeuvre}
                </p>
              </div>

              {/* Scrollable container */}
              <div className="max-h-[600px] overflow-y-auto pr-2">
                <div className="grid grid-cols-2 gap-4">
                  {pregenerations.length > 0 ? (
                    pregenerations.map((pregen) => (
                      <Card 
                        key={pregen.pregeneration_id} 
                        className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => setModalPregen(pregen)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs mr-1">
                              {pregen.age_cible}
                            </span>
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs mr-1">
                              {pregen.thematique}
                            </span>
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                              {pregen.style_texte}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-4">
                          {pregen.pregeneration_text.substring(0, 200)}...
                        </p>
                        <div className="mt-2 text-xs text-gray-500">
                          Cliquer pour voir en entier
                        </div>
                      </Card>
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-8 text-gray-500">
                      Aucune prégénération pour cette œuvre.
                      <br />
                      <Button
                        onClick={() => launchPregenerationForOeuvre(selectedOeuvre.oeuvre_id)}
                        className="mt-4"
                        disabled={loading}
                      >
                        🚀 Générer les 36 narrations
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Actions globales</h2>

              <Card className="p-4">
                <h3 className="font-bold mb-2">🚀 Prégénération automatique</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Générez automatiquement les 36 narrations (4 âges × 3 thèmes × 3 styles) pour toutes les œuvres.
                </p>
                <div className="space-x-2">
                  <Button
                    onClick={() => launchPregenerationAll(false)}
                    disabled={loading}
                  >
                    � Générer les narrations manquantes
                  </Button>
                  <Button
                    onClick={() => launchPregenerationAll(true)}
                    variant="outline"
                    disabled={loading}
                  >
                    🔄 Tout régénérer (force)
                  </Button>
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-bold mb-2">📊 Statistiques détaillées</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Œuvres:</div>
                    <div className="text-gray-600">{stats?.total_oeuvres || 0} au total</div>
                  </div>
                  <div>
                    <div className="font-medium">Narrations:</div>
                    <div className="text-gray-600">
                      {stats?.total_pregenerations || 0} générées / {(stats?.total_oeuvres || 0) * 36} possibles
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Taux de complétion:</div>
                    <div className="text-gray-600">
                      {stats?.total_oeuvres ? 
                        ((stats.total_pregenerations / (stats.total_oeuvres * 36)) * 100).toFixed(1) 
                        : 0}%
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Chunks:</div>
                    <div className="text-gray-600">{stats?.total_chunks || 0} créés</div>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-yellow-50 border-yellow-200">
                <h3 className="font-bold mb-2">⚠️ Actions avancées (À venir)</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 🔧 Construire index FAISS pour recherche vectorielle</li>
                  <li>• 📦 Générer chunks + embeddings pour toutes les œuvres</li>
                  <li>• 🎙️ Convertir textes en audio (TTS)</li>
                  <li>• 🗑️ Nettoyer prégénérations obsolètes</li>
                </ul>
              </Card>
            </div>
          )}
        </Card>
      </div>

      {/* Modal de prévisualisation */}
      {modalPregen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold mb-2">Prévisualisation Narration</h3>
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                    {modalPregen.age_cible}
                  </span>
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                    {modalPregen.thematique}
                  </span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                    {modalPregen.style_texte}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setModalPregen(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content scrollable */}
            <div className="p-6 overflow-y-auto flex-1">
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                {modalPregen.pregeneration_text}
              </p>
              <div className="mt-6 pt-4 border-t text-sm text-gray-500">
                <p>Longueur: {modalPregen.pregeneration_text.length} caractères</p>
                <p>Créé le: {new Date(modalPregen.created_at).toLocaleString('fr-FR')}</p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <Button onClick={() => setModalPregen(null)}>
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
