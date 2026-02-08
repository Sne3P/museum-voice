"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-context'
import { AdminLayout } from '../components'
import { cn } from '@/lib/utils'
import { Save, Clock, Building2, Timer, Image as ImageIcon } from 'lucide-react'
import type { OpeningHours, MuseumSetting } from '@/core/entities/museum-settings.types'
import { getUploadUrl } from '@/lib/uploads'

export default function SystemSettingsPage() {
  const { isAuthenticated, hasPermission, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [settings, setSettings] = useState<MuseumSetting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [museumName, setMuseumName] = useState('')
  const [museumTitle, setMuseumTitle] = useState('')
  const [museumImageUrl, setMuseumImageUrl] = useState('')
  const [openingHours, setOpeningHours] = useState<OpeningHours>({})
  const [centresInterets, setCentresInterets] = useState<string[]>([])
  const [mouvementsPreferes, setMouvementsPreferes] = useState<string[]>([])
  
  // Paramètres de temps de parcours
  const [parcoursMaxDuration, setParcoursMaxDuration] = useState(5) // en heures
  const [parcoursTimeStep, setParcoursTimeStep] = useState(0.5) // intervalle en heures
  const [parcoursDefaultDuration, setParcoursDefaultDuration] = useState(1) // valeur par défaut


  const daysOfWeek = [
    { key: 'lundi', label: 'Lundi' },
    { key: 'mardi', label: 'Mardi' },
    { key: 'mercredi', label: 'Mercredi' },
    { key: 'jeudi', label: 'Jeudi' },
    { key: 'vendredi', label: 'Vendredi' },
    { key: 'samedi', label: 'Samedi' },
    { key: 'dimanche', label: 'Dimanche' }
  ]

  useEffect(() => {
    if (authLoading) return
    
    if (!isAuthenticated || !hasPermission('system_settings')) {
      router.push('/admin')
      return
    }
    loadSettings()
  }, [authLoading, isAuthenticated, hasPermission, router])

  // Initialiser les horaires par défaut si vides
  useEffect(() => {
    if (Object.keys(openingHours).length === 0) {
      const defaultHours = {
        lundi: { open: '09:00', close: '18:00', closed: false },
        mardi: { open: '09:00', close: '18:00', closed: false },
        mercredi: { open: '09:00', close: '18:00', closed: false },
        jeudi: { open: '09:00', close: '18:00', closed: false },
        vendredi: { open: '09:00', close: '18:00', closed: false },
        samedi: { open: '10:00', close: '19:00', closed: false },
        dimanche: { open: '10:00', close: '18:00', closed: false }
      }
      setOpeningHours(defaultHours)
    }
  }, [openingHours])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/museum-settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
        
        // Extraire les valeurs spécifiques
        data.forEach((setting: MuseumSetting) => {
          switch (setting.setting_key) {
            case 'museum_name':
              if (typeof setting.setting_value === 'string') {
                setMuseumName(setting.setting_value)
              }
              break
            case 'museum_title':
              if (typeof setting.setting_value === 'string') {
                setMuseumTitle(setting.setting_value)
              }
              break
            case 'museum_image_url':
              if (typeof setting.setting_value === 'string') {
                setMuseumImageUrl(setting.setting_value)
              }
              break
            case 'opening_hours':
              if (typeof setting.setting_value === 'object' && !Array.isArray(setting.setting_value)) {
                setOpeningHours(setting.setting_value as OpeningHours)
              }
              break
            case 'centres_interets':
              try {
                if (Array.isArray(setting.setting_value)) {
                  setCentresInterets(setting.setting_value)
                } else if (typeof setting.setting_value === 'string') {
                  setCentresInterets(JSON.parse(setting.setting_value))
                }
              } catch {
                setCentresInterets([])
              }
              break
            case 'mouvements_preferes':
              try {
                if (Array.isArray(setting.setting_value)) {
                  setMouvementsPreferes(setting.setting_value)
                } else if (typeof setting.setting_value === 'string') {
                  setMouvementsPreferes(JSON.parse(setting.setting_value))
                }
              } catch {
                setMouvementsPreferes([])
              }
              break
            case 'parcours_max_duration':
              if (typeof setting.setting_value === 'number') {
                setParcoursMaxDuration(setting.setting_value)
              } else if (typeof setting.setting_value === 'string') {
                setParcoursMaxDuration(parseFloat(setting.setting_value) || 5)
              }
              break
            case 'parcours_time_step':
              if (typeof setting.setting_value === 'number') {
                setParcoursTimeStep(setting.setting_value)
              } else if (typeof setting.setting_value === 'string') {
                setParcoursTimeStep(parseFloat(setting.setting_value) || 0.5)
              }
              break
            case 'parcours_default_duration':
              if (typeof setting.setting_value === 'number') {
                setParcoursDefaultDuration(setting.setting_value)
              } else if (typeof setting.setting_value === 'string') {
                setParcoursDefaultDuration(parseFloat(setting.setting_value) || 1)
              }
              break
          }
        })
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error)
    }
    setIsLoading(false)
  }

  const handleSaveMuseumName = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/museum-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          setting_key: 'museum_name',
          setting_value: museumName,
        }),
      })

      if (response.ok) {
        console.log('Nom du musée sauvegardé')
        alert('Nom du musée sauvegardé avec succès!')
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      alert('Erreur lors de la sauvegarde')
    }
    setIsSaving(false)
  }

  const handleSaveMuseumTitle = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/museum-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          setting_key: 'museum_title',
          setting_value: museumTitle,
        }),
      })

      if (response.ok) {
        console.log('Titre du musée sauvegardé')
        alert('Titre d\'accueil sauvegardé avec succès!')
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      alert('Erreur lors de la sauvegarde')
    }
    setIsSaving(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsSaving(true)
    try {
      const formData = new FormData()
      formData.append('image', file)

      const uploadResponse = await fetch('/api/museum-image', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error('Erreur lors de l\'upload')
      }

      const { imageUrl } = await uploadResponse.json()
      
      // Mettre à jour la DB avec l'URL
      const saveResponse = await fetch('/api/museum-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          setting_key: 'museum_image_url',
          setting_value: imageUrl,
        }),
      })

      if (saveResponse.ok) {
        setMuseumImageUrl(imageUrl)
        alert('Image d\'accueil mise à jour avec succès!')
      }
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error)
      alert('Erreur lors de l\'upload de l\'image')
    }
    setIsSaving(false)
  }

  const handleSaveOpeningHours = async () => {
    setIsSaving(true)
    try {
      console.log('Sauvegarde des horaires:', openingHours)
      
      const response = await fetch('/api/museum-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          setting_key: 'opening_hours',
          setting_value: openingHours,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Horaires sauvegardés avec succès:', result)
        alert('Horaires d\'ouverture sauvegardés avec succès!')
      } else {
        const error = await response.text()
        console.error('Erreur API:', error)
        alert('Erreur lors de la sauvegarde des horaires')
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      alert('Erreur de connexion lors de la sauvegarde')
    }
    setIsSaving(false)
  }

  const handleSaveParcoursSettings = async () => {
    setIsSaving(true)
    try {
      // Sauvegarder les 3 paramètres
      const savePromises = [
        fetch('/api/museum-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            setting_key: 'parcours_max_duration',
            setting_value: parcoursMaxDuration,
          }),
        }),
        fetch('/api/museum-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            setting_key: 'parcours_time_step',
            setting_value: parcoursTimeStep,
          }),
        }),
        fetch('/api/museum-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            setting_key: 'parcours_default_duration',
            setting_value: parcoursDefaultDuration,
          }),
        }),
      ]

      const results = await Promise.all(savePromises)
      const allOk = results.every(r => r.ok)

      if (allOk) {
        console.log('Paramètres de parcours sauvegardés')
        alert('Paramètres de temps de parcours sauvegardés avec succès!')
      } else {
        throw new Error('Une ou plusieurs sauvegardes ont échoué')
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      alert('Erreur lors de la sauvegarde des paramètres')
    }
    setIsSaving(false)
  }



  const updateOpeningHours = (day: string, field: 'open' | 'close' | 'closed', value: string | boolean) => {
    setOpeningHours(prev => ({
      ...prev,
      [day]: {
        open: prev[day]?.open || '09:00',
        close: prev[day]?.close || '18:00',
        closed: prev[day]?.closed || false,
        ...prev[day],
        [field]: value
      }
    }))
  }

  if (isLoading) {
    return (
      <AdminLayout title="Paramètres Système" description="Chargement..." showBackButton>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout 
      title="Paramètres Système" 
      description="Configurer les paramètres globaux du musée"
      showBackButton
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Nom du musée */}
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-black">Informations générales</h2>
              <p className="text-sm text-neutral-500">Nom et identité du musée</p>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-black mb-2">Nom du musée</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={museumName}
                  onChange={(e) => setMuseumName(e.target.value)}
                  placeholder="Nom du musée"
                  className="flex-1 px-4 py-3 rounded-xl border border-neutral-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                />
                <button 
                  onClick={handleSaveMuseumName} 
                  disabled={isSaving}
                  className="px-4 py-3 rounded-xl bg-black text-white text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Sauvegarder
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">Titre d'accueil</label>
              <div className="flex gap-2">
                <textarea
                  value={museumTitle}
                  onChange={(e) => setMuseumTitle(e.target.value)}
                  placeholder="Bienvenue au musée..."
                  className="flex-1 px-4 py-3 rounded-xl border border-neutral-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all resize-none"
                  rows={3}
                />
                <button 
                  onClick={handleSaveMuseumTitle} 
                  disabled={isSaving}
                  className="px-4 py-3 rounded-xl bg-black text-white text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50 h-fit flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Sauvegarder
                </button>
              </div>
              <p className="text-xs text-neutral-400 mt-2">Texte affiché sur la page d'accueil des visiteurs</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">Image d'accueil</label>
              {museumImageUrl && museumImageUrl !== '/placeholder.svg' && (
                <div className="mb-3">
                  <img 
                    src={getUploadUrl(museumImageUrl)} 
                    alt="Aperçu" 
                    className="max-w-xs rounded-xl border border-neutral-200"
                  />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={isSaving}
                className="text-sm text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-neutral-100 file:text-black hover:file:bg-neutral-200 disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Horaires d'ouverture */}
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-neutral-600" />
            </div>
            <div>
              <h2 className="font-semibold text-black">Horaires d'ouverture</h2>
              <p className="text-sm text-neutral-500">Configurez les horaires d'ouverture et de fermeture</p>
            </div>
          </div>
          <div className="p-6 space-y-3">
            {daysOfWeek.map(({ key, label }) => (
              <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 rounded-xl bg-neutral-50 border border-neutral-100">
                <div className="w-full sm:w-24 font-medium text-black">{label}</div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={openingHours[key]?.closed || false}
                      onChange={(e) => updateOpeningHours(key, 'closed', e.target.checked)}
                      className="w-4 h-4 rounded border-neutral-300"
                    />
                    <span className="text-sm text-neutral-600">Fermé</span>
                  </label>
                  
                  {!openingHours[key]?.closed && (
                    <div className="flex flex-wrap gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-neutral-500">De</span>
                        <input
                          type="time"
                          value={openingHours[key]?.open || '09:00'}
                          onChange={(e) => updateOpeningHours(key, 'open', e.target.value)}
                          className="px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-neutral-500">à</span>
                        <input
                          type="time"
                          value={openingHours[key]?.close || '18:00'}
                          onChange={(e) => updateOpeningHours(key, 'close', e.target.value)}
                          className="px-3 py-2 rounded-lg border border-neutral-200 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div className="flex justify-end pt-4">
              <button 
                onClick={handleSaveOpeningHours} 
                disabled={isSaving}
                className="px-4 py-3 rounded-xl bg-black text-white text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Sauvegarder les horaires
              </button>
            </div>
          </div>
        </div>

        {/* Paramètres de temps de parcours */}
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center">
              <Timer className="h-5 w-5 text-neutral-600" />
            </div>
            <div>
              <h2 className="font-semibold text-black">Temps de parcours</h2>
              <p className="text-sm text-neutral-500">Options de durée des visites guidées</p>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-black mb-2">Durée maximum (heures)</label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  step="0.5"
                  value={parcoursMaxDuration}
                  onChange={(e) => setParcoursMaxDuration(parseFloat(e.target.value) || 5)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">Intervalle (heures)</label>
                <select
                  value={parcoursTimeStep}
                  onChange={(e) => setParcoursTimeStep(parseFloat(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                >
                  <option value={0.25}>15 minutes</option>
                  <option value={0.5}>30 minutes</option>
                  <option value={1}>1 heure</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">Durée par défaut (heures)</label>
                <input
                  type="number"
                  min="0.5"
                  max={parcoursMaxDuration}
                  step={parcoursTimeStep}
                  value={parcoursDefaultDuration}
                  onChange={(e) => setParcoursDefaultDuration(parseFloat(e.target.value) || 1)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all"
                />
              </div>
            </div>

            {/* Prévisualisation */}
            <div className="bg-neutral-50 rounded-xl p-4">
              <p className="text-sm font-medium text-black mb-3">Prévisualisation du curseur</p>
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <span>0h</span>
                <div className="flex-1 h-2 bg-neutral-200 rounded-full relative">
                  <div 
                    className="absolute h-2 bg-black rounded-full"
                    style={{ width: `${(parcoursDefaultDuration / parcoursMaxDuration) * 100}%` }}
                  />
                </div>
                <span>{parcoursMaxDuration}h</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button 
                onClick={handleSaveParcoursSettings} 
                disabled={isSaving}
                className="px-4 py-3 rounded-xl bg-black text-white text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Sauvegarder
              </button>
            </div>
          </div>
        </div>

        {/* Résumé */}
        <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-6">
          <h3 className="font-semibold text-black mb-4">Résumé de la configuration</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-neutral-500">Nom du musée:</span>
              <span className="ml-2 font-medium text-black">{museumName || 'Non défini'}</span>
            </div>
            <div>
              <span className="text-neutral-500">Image:</span>
              <span className="ml-2 font-medium text-black">{museumImageUrl ? 'Configurée' : 'Non définie'}</span>
            </div>
            <div>
              <span className="text-neutral-500">Horaires:</span>
              <span className="ml-2 font-medium text-black">{Object.keys(openingHours).length} jour(s)</span>
            </div>
            <div>
              <span className="text-neutral-500">Paramètres:</span>
              <span className="ml-2 font-medium text-black">{settings.length} éléments</span>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}