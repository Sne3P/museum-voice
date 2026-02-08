'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AdminLayout } from '../components'
import { cn } from '@/lib/utils'
import { getUploadUrl } from '@/lib/uploads'
import { 
  RefreshCw, 
  Eye, 
  Zap, 
  FileText, 
  Database, 
  Trash2, 
  Sparkles,
  CheckCircle,
  AlertCircle,
  X,
  Play,
  Pause,
  Clock,
  XCircle,
  Image as ImageIcon,
  BarChart3,
  Layers
} from 'lucide-react'

// ==========================================
// TYPES
// ==========================================

interface Oeuvre {
  oeuvre_id: number
  title: string
  artist: string
  date_oeuvre: string
  room: number | null
  pdf_link: string | null
  pregeneration_count?: number
}

interface CriteriaType {
  type: string
  label: string
  ordre: number
}

interface Criteria {
  criteria_id: number
  type: string
  name: string
  label: string
  description: string | null
  ordre: number
}

interface Pregeneration {
  pregeneration_id: number
  oeuvre_id: number
  criteria_combination: Record<string, number>
  pregeneration_text: string
  created_at: string
  voice_link: string | null
  criteria_labels?: Record<string, string>
}

interface Stats {
  total_oeuvres: number
  total_pregenerations: number
  expected_pregenerations: number
  expected_per_oeuvre: number
  completion_rate: number
}

// Types pour les jobs de génération asynchrone
interface GenerationJob {
  job_id: string
  job_type: string  // 'all', 'artwork', 'profile' ou variations avec préfixes
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  created_at: string
  started_at: string | null
  completed_at: string | null
  progress: {
    total: number
    completed: number
    current: string
    percentage: number
  }
  stats: {
    generated: number
    skipped: number
    errors: number
  }
  params: Record<string, unknown>
  error: string | null
  elapsed_seconds: number | null
  estimated_remaining_seconds: number | null
}

interface JobsState {
  active_jobs: GenerationJob[]
  recent_jobs: GenerationJob[]
  stats: {
    active_jobs: number
    pending_jobs: number
    total_jobs_in_history: number
    current_generations: number
  }
}

// ==========================================
// COMPOSANT PRINCIPAL
// ==========================================

export default function NarrationsDashboard() {
  const router = useRouter()
  
  // State
  const [oeuvres, setOeuvres] = useState<Oeuvre[]>([])
  const [criteriaTypes, setCriteriaTypes] = useState<CriteriaType[]>([])
  const [allCriterias, setAllCriterias] = useState<Criteria[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [selectedOeuvre, setSelectedOeuvre] = useState<Oeuvre | null>(null)
  const [pregenerations, setPregenerations] = useState<Pregeneration[]>([])
  const [modalPregen, setModalPregen] = useState<Pregeneration | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'oeuvres' | 'narrations' | 'actions'>('oeuvres')
  
  // États pour génération précise
  const [showGeneratePreciseModal, setShowGeneratePreciseModal] = useState(false)
  const [selectedCombination, setSelectedCombination] = useState<Record<string, number> | null>(null)
  
  // États pour les jobs de génération async
  const [jobsState, setJobsState] = useState<JobsState | null>(null)
  const [showJobsPanel, setShowJobsPanel] = useState(false)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  
  // États pour génération par profil
  const [showGenerateByProfileModal, setShowGenerateByProfileModal] = useState(false)
  const [profileForGeneration, setProfileForGeneration] = useState<Record<string, number> | null>(null)

  // Calcul du nombre attendu de narrations par œuvre (produit cartésien des critères)
   // Utiliser la valeur calculée par le backend
   const expectedNarrationsPerOeuvre = stats?.expected_per_oeuvre || 36

  // =========================================
  // CHARGEMENT DONNÉES
  // ==========================================

  useEffect(() => {
    loadInitialData()
  }, [])

  async function loadInitialData() {
    setLoading(true)
    try {
      await Promise.all([
        loadCriteriaTypes(),
        loadAllCriterias(),
        loadOeuvres(),
        loadStats()
      ])
    } catch (error) {
      console.error('Erreur chargement initial:', error)
    }
    setLoading(false)
  }

  async function loadCriteriaTypes() {
    try {
      const res = await fetch('/api/criteria-types')
      if (res.ok) {
        const data = await res.json()
        setCriteriaTypes(data.types || [])
      }
    } catch (error) {
      console.error('Erreur chargement criteria types:', error)
    }
  }

  async function loadAllCriterias() {
    try {
      // Charger tous les critères sans filtre de type - récupère TOUS les critères
      const res = await fetch('/api/criterias')
      if (res.ok) {
        const data = await res.json()
        setAllCriterias(data.criterias || [])
      }
    } catch (error) {
      console.error('Erreur chargement criterias:', error)
    }
  }

  async function loadOeuvres() {
    try {
      const res = await fetch('/api/admin/get-oeuvres')
      if (res.ok) {
        const data = await res.json()
        setOeuvres(data.oeuvres || [])
      }
    } catch (error) {
      console.error('Erreur chargement œuvres:', error)
    }
  }

  async function loadStats() {
    try {
      const res = await fetch('/api/admin/get-stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Erreur chargement stats:', error)
    }
  }

  async function loadPregenerationsForOeuvre(oeuvreId: number) {
    try {
      const res = await fetch(`/api/admin/get-pregenerations/${oeuvreId}`)
      if (res.ok) {
        const data = await res.json()
        const enrichedPregens = enrichPregenerationsWithLabels(data.pregenerations || [])
        setPregenerations(enrichedPregens)
      }
    } catch (error) {
      console.error('Erreur chargement prégénérations:', error)
    }
  }

  // Enrichir les prégénérations avec les labels lisibles
  function enrichPregenerationsWithLabels(pregens: Pregeneration[]): Pregeneration[] {
    return pregens.map(pregen => {
      const labels: Record<string, string> = {}
      
      // Pour chaque criteria_id dans la combinaison
      Object.entries(pregen.criteria_combination).forEach(([type, criteriaId]) => {
        const criteria = allCriterias.find(c => c.criteria_id === criteriaId)
        if (criteria) {
          labels[type] = criteria.label
        }
      })
      
      return {
        ...pregen,
        criteria_labels: labels
      }
    })
  }

  // ==========================================
  // ACTIONS DATABASE
  // ==========================================

  async function seedDatabase() {
    if (!confirm('Lancer le seed de la base de données ?\n\nCela va générer toutes les combinaisons manquantes de narrations pour toutes les œuvres.')) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/seed-narrations', {
        method: 'POST'
      })

      const data = await res.json()
      if (data.success) {
        alert(`✅ Seed terminé !\n\n${data.inserted} nouvelles narrations insérées\n${data.skipped} combinaisons déjà existantes`)
        await loadStats()
        await loadOeuvres()
      } else {
        alert(`❌ Erreur: ${data.error}`)
      }
    } catch (error) {
      console.error('Erreur seed:', error)
      alert(`❌ Erreur: ${error}`)
    }
    setLoading(false)
  }

  async function deleteAllNarrations() {
    if (!confirm('⚠️ ATTENTION !\n\nSupprimer TOUTES les narrations de la base de données ?\n\nCette action est irréversible !')) {
      return
    }

    if (!confirm('Êtes-vous VRAIMENT sûr ? Toutes les narrations seront perdues !')) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/delete-all-narrations', {
        method: 'DELETE'
      })

      const data = await res.json()
      if (data.success) {
        alert(`✅ ${data.deleted} narrations supprimées`)
        await loadStats()
        await loadOeuvres()
        setPregenerations([])
        setSelectedOeuvre(null)
      } else {
        alert(`❌ Erreur: ${data.error}`)
      }
    } catch (error) {
      console.error('Erreur suppression:', error)
      alert(`❌ Erreur: ${error}`)
    }
    setLoading(false)
  }

  async function generateNarrationsForOeuvre(oeuvreId: number) {
    if (!confirm('Générer les narrations manquantes pour cette œuvre ?\n\nLa génération se fera en arrière-plan.')) {
      return
    }
    // Utiliser la version async pour ne pas bloquer
    await startAsyncGenerateArtwork(oeuvreId)
  }

  async function generateAllMissingNarrations() {
    if (!confirm(`Générer toutes les narrations manquantes pour ${oeuvres.length} œuvres ?\n\nLa génération se fera en arrière-plan.`)) {
      return
    }
    // Utiliser la version async pour ne pas bloquer
    await startAsyncGenerateAll(false)
  }

  async function regenerateAllNarrations() {
    if (!confirm('⚠️ ATTENTION !\n\nRégénérer TOUTES les narrations ?\n\nCela va recréer toutes les narrations existantes.\nLa génération se fera en arrière-plan.')) {
      return
    }
    // Utiliser la version async avec force_regenerate pour ne pas bloquer
    await startAsyncGenerateAll(true)
  }

  // ==========================================
  // NOUVELLES ACTIONS: GÉNÉRATION PRÉCISE & PAR PROFIL
  // ==========================================

  // Génération d'une narration précise via le système de jobs (async)
  async function generatePreciseNarrationAsync(oeuvreId: number, combination: Record<string, number>, forceRegenerate: boolean = true) {
    try {
      const res = await fetch('/api/admin/generate-async/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oeuvre_id: oeuvreId,
          criteria_combination: combination,
          force_regenerate: forceRegenerate
        })
      })

      const data = await res.json()
      if (data.success) {
        setShowJobsPanel(true)
        await loadJobs()
        setShowGeneratePreciseModal(false)
        setModalPregen(null)
      } else {
        alert(`❌ Erreur: ${data.error}`)
      }
    } catch (error) {
      console.error('Erreur génération précise async:', error)
      alert(`❌ Erreur: ${error}`)
    }
  }

  async function regenerateSingleNarration(pregen: Pregeneration) {
    if (!selectedOeuvre) return

    if (!confirm(`Régénérer cette narration ?\n\nProfil: ${Object.values(pregen.criteria_labels || {}).join(', ')}\n\nLa génération sera ajoutée à la file d'attente.`)) {
      return
    }

    // Utiliser le système de jobs pour ne pas interrompre les autres
    await generatePreciseNarrationAsync(selectedOeuvre.oeuvre_id, pregen.criteria_combination, true)
  }

  // Wrapper pour le modal de génération précise
  async function generatePreciseNarration(oeuvreId: number, combination: Record<string, number>) {
    await generatePreciseNarrationAsync(oeuvreId, combination, false)
  }

  async function generateNarrationsByProfile(combination: Record<string, number>) {
    const labels = Object.entries(combination).map(([type, id]) => {
      const criteria = allCriterias.find(c => c.criteria_id === id)
      return criteria ? criteria.label : `${type}:${id}`
    })

    if (!confirm(`Générer les narrations pour ce profil dans TOUTES les œuvres ?\n\nProfil: ${labels.join(', ')}\n\nLa génération se fera en arrière-plan.`)) {
      return
    }

    // Utiliser la version async pour ne pas bloquer
    await startAsyncGenerateByProfile(combination)
  }

  // ==========================================
  // GÉNÉRATION ASYNC AVEC SUIVI EN TEMPS RÉEL
  // ==========================================

  // Référence pour détecter les changements d'état des jobs
  const previousJobsRef = useRef<Map<string, string>>(new Map())

  // Charger l'état des jobs
  const loadJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/generation-jobs')
      if (res.ok) {
        const data = await res.json()
        
        // Filtrer les jobs sans ID valide (protection)
        const activeJobs = (data.active_jobs || []).filter((job: GenerationJob) => job?.job_id)
        const recentJobs = (data.recent_jobs || []).filter((job: GenerationJob) => job?.job_id)
        
        // Détecter si un job vient de se terminer
        const previousJobs = previousJobsRef.current
        let jobJustCompleted = false
        
        for (const job of [...activeJobs, ...recentJobs]) {
          const prevStatus = previousJobs.get(job.job_id)
          if (prevStatus && prevStatus !== 'completed' && job.status === 'completed') {
            jobJustCompleted = true
          }
          previousJobs.set(job.job_id, job.status)
        }
        
        // Si un job vient de se terminer, rafraîchir les données
        if (jobJustCompleted) {
          console.log('🔄 Un job vient de se terminer, rafraîchissement des données...')
          await loadStats()
          await loadOeuvres()
        }
        
        // Mettre à jour le state avec les jobs filtrés
        setJobsState({
          ...data,
          active_jobs: activeJobs,
          recent_jobs: recentJobs
        })
        
        // Afficher le panel si des jobs sont actifs
        if (data.stats?.active_jobs > 0 || data.stats?.pending_jobs > 0) {
          setShowJobsPanel(true)
        }
      }
    } catch (error) {
      console.error('Erreur chargement jobs:', error)
    }
  }, [])

  // Polling des jobs actifs
  useEffect(() => {
    // Charger les jobs au démarrage
    loadJobs()

    // Démarrer le polling si des jobs sont actifs
    const startPolling = () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
      pollingRef.current = setInterval(loadJobs, 2000) // Poll toutes les 2s
    }

    startPolling()

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [loadJobs])

  // Lancer une génération async pour toutes les œuvres
  async function startAsyncGenerateAll(forceRegenerate: boolean = false) {
    try {
      const res = await fetch('/api/admin/generate-async/all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force_regenerate: forceRegenerate })
      })
      const data = await res.json()
      if (data.success) {
        setShowJobsPanel(true)
        await loadJobs()
      } else {
        alert(`❌ Erreur: ${data.error}`)
      }
    } catch (error) {
      console.error('Erreur démarrage génération async:', error)
      alert(`❌ Erreur: ${error}`)
    }
  }

  // Lancer une génération async pour une œuvre spécifique
  async function startAsyncGenerateArtwork(oeuvreId: number) {
    if (!oeuvreId || oeuvreId === undefined) {
      console.error('Erreur: oeuvreId est undefined')
      alert('❌ Impossible de générer: ID de l\'œuvre manquant')
      return
    }
    try {
      console.log(`🚀 Lancement génération async pour œuvre ${oeuvreId}`)
      const res = await fetch(`/api/admin/generate-async/artwork/${oeuvreId}`, {
        method: 'POST'
      })
      const data = await res.json()
      if (data.success) {
        setShowJobsPanel(true)
        await loadJobs()
      } else {
        alert(`❌ Erreur: ${data.error}`)
      }
    } catch (error) {
      console.error('Erreur démarrage génération async œuvre:', error)
      alert(`❌ Erreur: ${error}`)
    }
  }

  // Lancer une génération async par profil
  async function startAsyncGenerateByProfile(combination: Record<string, number>) {
    try {
      const res = await fetch('/api/admin/generate-async/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ criteria_combination: combination })
      })
      const data = await res.json()
      if (data.success) {
        setShowJobsPanel(true)
        await loadJobs()
        setShowGenerateByProfileModal(false)
      } else {
        alert(`❌ Erreur: ${data.error}`)
      }
    } catch (error) {
      console.error('Erreur démarrage génération async profil:', error)
      alert(`❌ Erreur: ${error}`)
    }
  }

  // Annuler un job (force=true pour arrêter même les jobs en cours)
  async function cancelJob(jobId: string, force: boolean = true) {
    if (!jobId) {
      console.error('Erreur: jobId est undefined ou null')
      alert('❌ Impossible d\'annuler: ID du job manquant')
      return
    }
    try {
      console.log(`🛑 Annulation job ${jobId} (force=${force})`)
      const res = await fetch(`/api/admin/generation-jobs/${jobId}?force=${force}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.success) {
        console.log(`✅ Job ${jobId} annulé`)
        await loadJobs()
      } else {
        console.error(`❌ Échec annulation job ${jobId}:`, data.error)
        alert(`❌ Erreur: ${data.error}`)
      }
    } catch (error) {
      console.error('Erreur annulation job:', error)
      alert(`❌ Erreur réseau lors de l'annulation`)
    }
  }

  // Annuler tous les jobs
  async function cancelAllJobs() {
    if (!confirm('Annuler TOUS les jobs en cours ?\n\nCette action est irréversible.')) {
      return
    }
    try {
      const res = await fetch('/api/admin/generation-jobs/cancel-all', {
        method: 'POST'
      })
      const data = await res.json()
      if (data.success) {
        alert(`✅ ${data.cancelled_count} job(s) annulé(s)`)
        await loadJobs()
      } else {
        alert(`❌ Erreur: ${data.error}`)
      }
    } catch (error) {
      console.error('Erreur annulation en masse:', error)
    }
  }

  // Formatage du temps restant
  function formatDuration(seconds: number | null): string {
    if (seconds === null || seconds < 0) return '--'
    if (seconds < 60) return `${Math.round(seconds)}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  // ==========================================
  // NAVIGATION
  // ==========================================

  function viewOeuvreDetails(oeuvre: Oeuvre) {
    setSelectedOeuvre(oeuvre)
    loadPregenerationsForOeuvre(oeuvre.oeuvre_id)
    setActiveTab('narrations')
  }

  // ==========================================
  // HELPERS
  // ==========================================

  function getCompletionColor(count: number, expected: number): string {
    if (count === 0) return 'bg-neutral-100 text-neutral-600'
    if (count === expected) return 'bg-green-100 text-green-700'
    return 'bg-yellow-100 text-yellow-700'
  }

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <AdminLayout 
      title="Dashboard Narrations" 
      description="Gérer les narrations générées par l'IA"
      showBackButton
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Actions */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2">
            {/* Job indicator */}
            {jobsState && (jobsState.stats.active_jobs > 0 || jobsState.stats.pending_jobs > 0) && (
              <button
                onClick={() => setShowJobsPanel(!showJobsPanel)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors",
                  showJobsPanel ? "bg-black text-white" : "bg-neutral-100 text-black hover:bg-neutral-200"
                )}
              >
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                {jobsState.stats.active_jobs + jobsState.stats.pending_jobs} job(s)
              </button>
            )}
          </div>
          <button
            onClick={loadInitialData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-neutral-200 text-sm font-medium hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Actualiser
          </button>
        </div>

        {/* Jobs Panel */}
        {showJobsPanel && jobsState && (
          <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
                <h2 className="font-semibold text-black">Générations en cours</h2>
              </div>
              <div className="flex items-center gap-2">
                {(jobsState.stats.active_jobs > 0 || jobsState.stats.pending_jobs > 0) && (
                  <button
                    onClick={cancelAllJobs}
                    className="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <XCircle className="h-4 w-4 inline mr-1" />
                    Tout arrêter
                  </button>
                )}
                <button
                  onClick={() => setShowJobsPanel(false)}
                  className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {jobsState.active_jobs.map(job => (
                <div key={job.job_id} className="bg-neutral-50 rounded-xl p-4 border border-neutral-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {job.status === 'running' ? (
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      ) : job.status === 'pending' ? (
                        <Clock className="h-4 w-4 text-yellow-600" />
                      ) : job.status === 'completed' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="font-medium text-black">
                        {job.job_type.includes('all') ? 'Toutes les œuvres' :
                         job.job_type.includes('artwork') ? `Œuvre #${job.params.oeuvre_id}` :
                         job.job_type.includes('profile') ? 'Par profil' : job.job_type}
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 text-xs rounded-full font-medium",
                        job.status === 'running' ? 'bg-black text-white' :
                        job.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        job.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      )}>
                        {job.status}
                      </span>
                    </div>
                    {(job.status === 'running' || job.status === 'pending') && job.job_id && (
                      <button
                        onClick={() => cancelJob(job.job_id)}
                        className="text-sm text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                      >
                        Annuler
                      </button>
                    )}
                  </div>

                  {job.status === 'running' && (
                    <>
                      <div className="mb-2">
                        <div className="flex justify-between text-sm text-neutral-500 mb-1">
                          <span>{job.progress.completed} / {job.progress.total}</span>
                          <span>{job.progress.percentage.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-neutral-200 rounded-full h-2">
                          <div
                            className="bg-black h-2 rounded-full transition-all duration-300"
                            style={{ width: `${job.progress.percentage}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-neutral-400">
                        <span>Écoulé: {formatDuration(job.elapsed_seconds)}</span>
                        <span>Restant: ~{formatDuration(job.estimated_remaining_seconds)}</span>
                      </div>
                    </>
                  )}

                  {job.status === 'completed' && (
                    <div className="flex gap-4 text-sm">
                      <span className="text-green-600">✓ {job.stats.generated} générées</span>
                      <span className="text-neutral-500">⊘ {job.stats.skipped} ignorées</span>
                      {job.stats.errors > 0 && (
                        <span className="text-red-600">✗ {job.stats.errors} erreurs</span>
                      )}
                    </div>
                  )}

                  {job.status === 'failed' && job.error && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">
                      {job.error}
                    </div>
                  )}
                </div>
              ))}

              {jobsState.active_jobs.length === 0 && (
                <div className="text-center text-neutral-400 py-6">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  Aucune génération en cours
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-neutral-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-neutral-500">Œuvres</span>
                <ImageIcon className="h-5 w-5 text-neutral-400" />
              </div>
              <p className="text-3xl font-bold text-black">{stats.total_oeuvres}</p>
              <p className="text-xs text-neutral-400 mt-1">dans la base</p>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-neutral-500">Narrations</span>
                <Database className="h-5 w-5 text-neutral-400" />
              </div>
              <p className="text-3xl font-bold text-black">{stats.total_pregenerations}</p>
              <p className="text-xs text-neutral-400 mt-1">sur {stats.expected_pregenerations} attendues</p>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-neutral-500">Complétion</span>
                {stats.completion_rate === 100 ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}
              </div>
              <p className="text-3xl font-bold text-black">{stats.completion_rate.toFixed(1)}%</p>
              <p className="text-xs text-neutral-400 mt-1">{stats.expected_pregenerations - stats.total_pregenerations} manquantes</p>
            </div>

            <div className="bg-white rounded-2xl border border-neutral-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-neutral-500">Critères</span>
                <Layers className="h-5 w-5 text-neutral-400" />
              </div>
              <p className="text-3xl font-bold text-black">{criteriaTypes.length}</p>
              <p className="text-xs text-neutral-400 mt-1">{allCriterias.length} options au total</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('oeuvres')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors",
              activeTab === 'oeuvres' ? "bg-black text-white" : "bg-white border border-neutral-200 hover:bg-neutral-50"
            )}
          >
            <ImageIcon className="h-4 w-4" />
            Œuvres
          </button>
          <button
            onClick={() => setActiveTab('narrations')}
            disabled={!selectedOeuvre}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50",
              activeTab === 'narrations' ? "bg-black text-white" : "bg-white border border-neutral-200 hover:bg-neutral-50"
            )}
          >
            <Database className="h-4 w-4" />
            Narrations {selectedOeuvre && `(${selectedOeuvre.title.slice(0, 20)}...)`}
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors",
              activeTab === 'actions' ? "bg-black text-white" : "bg-white border border-neutral-200 hover:bg-neutral-50"
            )}
          >
            <Zap className="h-4 w-4" />
            Actions
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6">
            {/* TAB: OEUVRES */}
            {activeTab === 'oeuvres' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-black">Liste des œuvres</h2>
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-neutral-400" />
                    <p className="mt-2 text-neutral-500">Chargement...</p>
                  </div>
                ) : oeuvres.length === 0 ? (
                  <div className="text-center py-12 text-neutral-500">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2 text-neutral-300" />
                    <p>Aucune œuvre trouvée</p>
                    <p className="text-sm">Créez des œuvres dans l'éditeur</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-neutral-200 bg-neutral-50">
                        <tr>
                          <th className="text-left p-3 font-medium text-sm text-neutral-600">ID</th>
                          <th className="text-left p-3 font-medium text-sm text-neutral-600">Titre</th>
                          <th className="text-left p-3 font-medium text-sm text-neutral-600">Artiste</th>
                          <th className="text-left p-3 font-medium text-sm text-neutral-600">Date</th>
                          <th className="text-left p-3 font-medium text-sm text-neutral-600">Salle</th>
                          <th className="text-left p-3 font-medium text-sm text-neutral-600">Narrations</th>
                          <th className="text-left p-3 font-medium text-sm text-neutral-600">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {oeuvres.map((oeuvre) => (
                          <tr key={oeuvre.oeuvre_id} className="border-b border-neutral-100 hover:bg-neutral-50">
                            <td className="p-3 text-sm text-neutral-500">{oeuvre.oeuvre_id}</td>
                            <td className="p-3 font-medium text-black">{oeuvre.title}</td>
                            <td className="p-3 text-sm text-neutral-600">{oeuvre.artist}</td>
                            <td className="p-3 text-sm text-neutral-600">{oeuvre.date_oeuvre}</td>
                            <td className="p-3 text-sm">{oeuvre.room || '-'}</td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getCompletionColor(oeuvre.pregeneration_count || 0, expectedNarrationsPerOeuvre)}`}>
                                {oeuvre.pregeneration_count || 0}/{expectedNarrationsPerOeuvre}
                              </span>
                            </td>
                            <td className="p-3 space-x-2">
                              <button
                                onClick={() => viewOeuvreDetails(oeuvre)}
                                className="px-3 py-1.5 rounded-lg border border-neutral-200 text-sm hover:bg-neutral-50 transition-colors"
                              >
                                <Eye className="h-3 w-3 inline mr-1" />
                                Voir
                              </button>
                              {oeuvre.pdf_link && (
                                <button
                                  onClick={() => window.open(getUploadUrl(oeuvre.pdf_link!), '_blank')}
                                  className="px-3 py-1.5 rounded-lg border border-neutral-200 text-sm hover:bg-neutral-50 transition-colors"
                                >
                                  <FileText className="h-3 w-3 inline mr-1" />
                                  PDF
                                </button>
                              )}
                              <button
                                onClick={() => startAsyncGenerateArtwork(oeuvre.oeuvre_id)}
                                title="Lance la génération en arrière-plan"
                                className="px-3 py-1.5 rounded-lg bg-black text-white text-sm hover:bg-neutral-800 transition-colors"
                              >
                                <Play className="h-3 w-3 inline mr-1" />
                                Générer
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB: NARRATIONS */}
            {activeTab === 'narrations' && selectedOeuvre && (
              <div>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-black mb-1">
                    {selectedOeuvre.title}
                  </h2>
                  <p className="text-sm text-neutral-600">
                    {selectedOeuvre.artist} • {selectedOeuvre.date_oeuvre}
                  </p>
                  <p className="text-sm text-neutral-500 mt-2">
                    {pregenerations.length}/{expectedNarrationsPerOeuvre} narrations générées
                  </p>
                </div>

                {pregenerations.length === 0 ? (
                  <div className="text-center py-12">
                    <Database className="h-12 w-12 mx-auto mb-2 text-neutral-300" />
                    <p className="text-neutral-500 mb-4">Aucune narration pour cette œuvre</p>
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => generateNarrationsForOeuvre(selectedOeuvre.oeuvre_id)}
                        disabled={loading}
                        className="px-4 py-2 rounded-xl bg-black text-white text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        <Zap className="h-4 w-4" />
                        Générer toutes les narrations
                      </button>
                      <button
                        onClick={() => setShowGeneratePreciseModal(true)}
                        disabled={loading}
                        className="px-4 py-2 rounded-xl border border-neutral-200 text-sm font-medium hover:bg-neutral-50 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        <Sparkles className="h-4 w-4" />
                        Générer 1 narration précise
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-sm text-neutral-600">
                        Cliquez sur une narration pour la voir ou la régénérer
                      </p>
                      <button
                        onClick={() => setShowGeneratePreciseModal(true)}
                        disabled={loading}
                        className="px-3 py-1.5 rounded-lg border border-neutral-200 text-sm font-medium hover:bg-neutral-50 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        <Sparkles className="h-4 w-4" />
                        Générer 1 narration
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
                      {pregenerations.map((pregen) => (
                        <div 
                          key={pregen.pregeneration_id}
                          className="cursor-pointer hover:shadow-md transition-shadow group relative border border-neutral-200 rounded-xl overflow-hidden"
                        >
                          <div onClick={() => setModalPregen(pregen)}>
                            <div className="px-4 py-3 border-b border-neutral-100">
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(pregen.criteria_labels || {}).map(([type, label]) => (
                                  <span
                                    key={type}
                                    className="px-2 py-0.5 bg-neutral-100 text-black rounded text-xs font-medium"
                                  >
                                    {label}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="p-4">
                              <p className="text-sm text-neutral-700 line-clamp-3">
                                {pregen.pregeneration_text.substring(0, 150)}...
                              </p>
                              <p className="text-xs text-neutral-400 mt-2">
                                Cliquer pour voir en entier
                              </p>
                            </div>
                          </div>
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              className="p-1.5 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50"
                              onClick={(e) => {
                                e.stopPropagation()
                                regenerateSingleNarration(pregen)
                              }}
                              disabled={loading}
                            >
                              <RefreshCw className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: ACTIONS */}
            {activeTab === 'actions' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-black">Actions globales</h2>

                {/* Génération avec suivi en temps réel - Section principale */}
                <div className="bg-neutral-50 rounded-2xl border border-neutral-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-neutral-100">
                    <h3 className="font-semibold text-black flex items-center gap-2">
                      <Play className="h-5 w-5" />
                      Générer les narrations
                    </h3>
                    <p className="text-sm text-neutral-500 mt-1">
                      Lance les générations en arrière-plan. Vous pouvez naviguer ou rafraîchir la page, 
                      la génération continue et vous pouvez suivre sa progression en temps réel.
                    </p>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Générer manquantes */}
                      <div className="p-4 bg-white rounded-xl border border-neutral-200">
                        <h4 className="font-medium mb-2 flex items-center gap-2 text-black">
                          <Play className="h-4 w-4 text-green-600" />
                          Toutes les œuvres (manquantes)
                        </h4>
                        <p className="text-sm text-neutral-600 mb-3">
                          Génère uniquement les narrations qui n'existent pas encore
                        </p>
                        <button 
                          onClick={() => startAsyncGenerateAll(false)}
                          className="w-full px-4 py-2 rounded-xl bg-black text-white text-sm font-medium hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
                        >
                          <Play className="h-4 w-4" />
                          Lancer la génération
                        </button>
                      </div>

                      {/* Régénérer tout */}
                      <div className="p-4 bg-white rounded-xl border border-neutral-200">
                        <h4 className="font-medium mb-2 flex items-center gap-2 text-black">
                          <RefreshCw className="h-4 w-4 text-orange-600" />
                          Tout régénérer (forcer)
                        </h4>
                        <p className="text-sm text-neutral-600 mb-3">
                          Remplace toutes les narrations existantes par de nouvelles
                        </p>
                        <button 
                          onClick={() => startAsyncGenerateAll(true)}
                          className="w-full px-4 py-2 rounded-xl border border-neutral-200 text-sm font-medium hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Forcer régénération
                        </button>
                      </div>
                    </div>

                    {/* Indicateur d'état des jobs */}
                    {jobsState && (
                      <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-neutral-200">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            jobsState.stats.active_jobs > 0 ? 'bg-green-500 animate-pulse' : 'bg-neutral-300'
                          }`} />
                          <span className="text-sm text-neutral-700">
                            {jobsState.stats.active_jobs > 0 
                              ? `${jobsState.stats.active_jobs} génération(s) en cours`
                              : 'Aucune génération active'}
                          </span>
                        </div>
                        {!showJobsPanel && jobsState.stats.active_jobs > 0 && (
                          <button
                            onClick={() => setShowJobsPanel(true)}
                            className="px-3 py-1.5 rounded-lg border border-neutral-200 text-sm font-medium hover:bg-neutral-50 transition-colors"
                          >
                            Voir progression
                          </button>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-neutral-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      La progression s'affiche automatiquement en haut de la page quand une génération est active
                    </p>
                  </div>
                </div>

                {/* Génération par profil */}
                <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-neutral-100">
                    <h3 className="font-semibold text-black flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      Génération par profil
                    </h3>
                    <p className="text-sm text-neutral-500 mt-1">
                      Générez toutes les narrations pour un profil spécifique dans toutes les œuvres.
                    </p>
                  </div>
                  <div className="p-6">
                    <button 
                      onClick={() => setShowGenerateByProfileModal(true)} 
                      className="px-4 py-2 rounded-xl bg-black text-white text-sm font-medium hover:bg-neutral-800 transition-colors flex items-center gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      Générer par profil
                    </button>
                    <p className="text-xs text-neutral-500 mt-3">
                      Choisissez un profil et générez cette combinaison pour toutes les œuvres
                    </p>
                  </div>
                </div>

                {/* Suppression */}
                <div className="bg-white rounded-2xl border border-red-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-red-100 bg-red-50">
                    <h3 className="font-semibold text-red-700 flex items-center gap-2">
                      <Trash2 className="h-5 w-5" />
                      Zone dangereuse
                    </h3>
                    <p className="text-sm text-red-600 mt-1">
                      Actions irréversibles. Utilisez avec précaution.
                    </p>
                  </div>
                  <div className="p-6">
                    <button 
                      onClick={deleteAllNarrations} 
                      disabled={loading}
                      className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Supprimer toutes les narrations
                    </button>
                  </div>
                </div>

                {/* Info critères */}
                <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-neutral-100">
                    <h3 className="font-semibold text-black flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      Informations sur les critères
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-3 text-sm">
                      <p className="font-medium text-black">Types de critères actifs :</p>
                      <ul className="space-y-2">
                        {criteriaTypes.map(type => {
                          const count = allCriterias.filter(c => c.type === type.type).length
                          return (
                            <li key={type.type} className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-neutral-100 rounded text-xs font-medium">
                                {type.label}
                              </span>
                              <span className="text-neutral-600">
                                {count} options
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                      <p className="text-neutral-600 mt-4">
                        Combinaisons totales par œuvre : <strong className="text-black">{expectedNarrationsPerOeuvre}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
        </div>

      {/* Modal Prévisualisation */}
      {modalPregen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-neutral-100 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-black mb-3">Prévisualisation Narration</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(modalPregen.criteria_labels || {}).map(([type, label]) => (
                    <span
                      key={type}
                      className="px-3 py-1 bg-neutral-100 text-black rounded-lg text-sm font-medium"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setModalPregen(null)}
                className="p-2 hover:bg-neutral-100 rounded-xl transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content scrollable */}
            <div className="p-6 overflow-y-auto flex-1">
              <p className="text-neutral-800 leading-relaxed whitespace-pre-wrap">
                {modalPregen.pregeneration_text}
              </p>
              
              <div className="mt-6 pt-4 border-t border-neutral-100 space-y-1 text-sm text-neutral-500">
                <p>Longueur : {modalPregen.pregeneration_text.length} caractères</p>
                <p>Mots : ~{Math.round(modalPregen.pregeneration_text.split(/\s+/).length)}</p>
                <p>Créé le : {new Date(modalPregen.created_at).toLocaleString('fr-FR')}</p>
                {modalPregen.voice_link && (
                  <p className="text-green-600">Audio généré disponible</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex justify-end gap-2">
              <button 
                onClick={() => {
                  if (selectedOeuvre && confirm('Régénérer cette narration ?')) {
                    regenerateSingleNarration(modalPregen)
                    setModalPregen(null)
                  }
                }}
                disabled={loading || !selectedOeuvre}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-sm font-medium hover:bg-neutral-100 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Régénérer
              </button>
              <button 
                onClick={() => setModalPregen(null)}
                className="px-4 py-2 rounded-xl bg-black text-white text-sm font-medium hover:bg-neutral-800 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Génération Précise */}
      {showGeneratePreciseModal && selectedOeuvre && (
        <ProfileSelectorModal
          title="Générer une narration précise"
          description={`Sélectionnez un profil pour générer une narration pour "${selectedOeuvre.title}"`}
          criteriaTypes={criteriaTypes}
          allCriterias={allCriterias}
          onConfirm={(combination) => {
            generatePreciseNarration(selectedOeuvre.oeuvre_id, combination)
          }}
          onCancel={() => setShowGeneratePreciseModal(false)}
          loading={loading}
        />
      )}

      {/* Modal Génération par Profil */}
      {showGenerateByProfileModal && (
        <ProfileSelectorModal
          title="Générer par profil"
          description="Sélectionnez un profil pour générer cette combinaison dans TOUTES les œuvres"
          criteriaTypes={criteriaTypes}
          allCriterias={allCriterias}
          onConfirm={(combination) => {
            generateNarrationsByProfile(combination)
          }}
          onConfirmAsync={(combination) => {
            startAsyncGenerateByProfile(combination)
          }}
          onCancel={() => setShowGenerateByProfileModal(false)}
          loading={loading}
        />
      )}
      </div>
    </AdminLayout>
  )
}

// ==========================================
// COMPOSANT: ProfileSelectorModal
// ==========================================

interface ProfileSelectorModalProps {
  title: string
  description: string
  criteriaTypes: CriteriaType[]
  allCriterias: Criteria[]
  onConfirm: (combination: Record<string, number>) => void
  onConfirmAsync?: (combination: Record<string, number>) => void
  onCancel: () => void
  loading: boolean
}

function ProfileSelectorModal({
  title,
  description,
  criteriaTypes,
  allCriterias,
  onConfirm,
  onConfirmAsync,
  onCancel,
  loading
}: ProfileSelectorModalProps) {
  const [selectedCombination, setSelectedCombination] = useState<Record<string, number>>({})

  // Grouper les critères par type
  const criteriaByType = criteriaTypes.reduce((acc, type) => {
    acc[type.type] = allCriterias.filter(c => c.type === type.type)
    return acc
  }, {} as Record<string, Criteria[]>)

  const isComplete = criteriaTypes
    .every(t => selectedCombination[t.type])

  const handleConfirm = () => {
    if (isComplete) {
      onConfirm(selectedCombination)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-neutral-100">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold text-black mb-2">{title}</h3>
              <p className="text-sm text-neutral-600">{description}</p>
            </div>
            <button
              onClick={onCancel}
              disabled={loading}
              className="p-2 hover:bg-neutral-100 rounded-xl transition-colors disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content scrollable */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            {criteriaTypes.map(type => {
              const options = criteriaByType[type.type] || []
              const selected = selectedCombination[type.type]

              return (
                <div key={type.type}>
                  <label className="block text-sm font-medium text-black mb-2">
                    {type.label}
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {options.map(criteria => (
                      <button
                        key={criteria.criteria_id}
                        onClick={() => {
                          setSelectedCombination(prev => ({
                            ...prev,
                            [type.type]: criteria.criteria_id
                          }))
                        }}
                        className={cn(
                          "p-3 border rounded-xl text-left transition-all",
                          selected === criteria.criteria_id
                            ? 'border-black bg-neutral-100'
                            : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                        )}
                      >
                        <div className="font-medium text-black">{criteria.label}</div>
                        {criteria.description && (
                          <div className="text-xs text-neutral-500 mt-1">
                            {criteria.description}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex justify-between items-center">
          <p className="text-sm">
            {isComplete ? (
              <span className="text-green-600 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Profil complet
              </span>
            ) : (
              <span className="text-amber-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                Sélectionnez tous les critères requis
              </span>
            )}
          </p>
          <div className="flex gap-2">
            <button 
              onClick={onCancel} 
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-neutral-200 text-sm font-medium hover:bg-neutral-100 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button 
              onClick={() => {
                if (isComplete) {
                  // Préférer async si disponible
                  if (onConfirmAsync) {
                    onConfirmAsync(selectedCombination)
                  } else {
                    onConfirm(selectedCombination)
                  }
                }
              }}
              disabled={!isComplete || loading}
              className="px-4 py-2 rounded-xl bg-black text-white text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Lancer la génération
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
