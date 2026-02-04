"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Save, Clock, Building2, Timer } from 'lucide-react'
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50 overflow-y-auto">
      <div className="container mx-auto p-6 max-w-4xl pb-20">
        {/* Header */}
        <div className="relative flex justify-center mb-8">
          <Button 
            variant="outline" 
            onClick={() => router.push('/admin')}
            className="absolute left-0 top-0 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Paramètres Système</h1>
            <p className="text-gray-600 mt-1">Configurer les paramètres globaux du musée</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Nom du musée */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              <div>
                <CardTitle>Informations générales</CardTitle>
                <CardDescription>Nom et identité du musée</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="museum_name">Nom du musée</Label>
                <div className="flex gap-2">
                  <Input
                    id="museum_name"
                    value={museumName}
                    onChange={(e) => setMuseumName(e.target.value)}
                    placeholder="Nom du musée"
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleSaveMuseumName} 
                    disabled={isSaving}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Sauvegarder
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="museum_title">Titre d'accueil</Label>
                <div className="flex gap-2">
                  <textarea
                    id="museum_title"
                    value={museumTitle}
                    onChange={(e) => setMuseumTitle(e.target.value)}
                    placeholder="Bienvenue au musée..."
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                  />
                  <Button 
                    onClick={handleSaveMuseumTitle} 
                    disabled={isSaving}
                    className="flex items-center gap-2 h-fit"
                  >
                    <Save className="h-4 w-4" />
                    Sauvegarder
                  </Button>
                </div>
                <p className="text-sm text-gray-500">Ce texte sera affiché sur la page d'accueil des visiteurs</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="museum_image">Image d'accueil</Label>
                {museumImageUrl && museumImageUrl !== '/placeholder.svg' && (
                  <div className="mb-2">
                    <img 
                      src={getUploadUrl(museumImageUrl)} 
                      alt="Aperçu" 
                      className="max-w-xs rounded-lg border border-gray-300"
                    />
                  </div>
                )}
                <Input
                  id="museum_image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isSaving}
                />
                <p className="text-sm text-gray-500">Image affichée sur la page d'accueil des visiteurs</p>
              </div>
            </CardContent>
          </Card>

          {/* Horaires d'ouverture */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Clock className="h-5 w-5 text-green-600" />
              <div>
                <CardTitle>Horaires d'ouverture</CardTitle>
                <CardDescription>Configurez les horaires d'ouverture et de fermeture</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {daysOfWeek.map(({ key, label }) => (
                <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 border rounded-lg">
                  <div className="w-full sm:w-20 font-medium">{label}</div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={openingHours[key]?.closed || false}
                        onChange={(e) => updateOpeningHours(key, 'closed', e.target.checked)}
                        className="mr-2"
                      />
                      <Label className="text-sm text-gray-600">Fermé</Label>
                    </div>
                    
                    {!openingHours[key]?.closed && (
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">Ouverture:</Label>
                          <Input
                            type="time"
                            value={openingHours[key]?.open || '09:00'}
                            onChange={(e) => updateOpeningHours(key, 'open', e.target.value)}
                            className="w-32"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">Fermeture:</Label>
                          <Input
                            type="time"
                            value={openingHours[key]?.close || '18:00'}
                            onChange={(e) => updateOpeningHours(key, 'close', e.target.value)}
                            className="w-32"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSaveOpeningHours} 
                  disabled={isSaving}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Sauvegarder les horaires
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Paramètres de temps de parcours */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Timer className="h-5 w-5 text-purple-600" />
              <div>
                <CardTitle>Temps de parcours</CardTitle>
                <CardDescription>Configurer les options de durée des visites guidées</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Durée maximum */}
                <div className="space-y-2">
                  <Label htmlFor="max-duration" className="text-sm font-medium">
                    Durée maximum (heures)
                  </Label>
                  <Input
                    id="max-duration"
                    type="number"
                    min="1"
                    max="24"
                    step="0.5"
                    value={parcoursMaxDuration}
                    onChange={(e) => setParcoursMaxDuration(parseFloat(e.target.value) || 5)}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    Limite maximale que les visiteurs peuvent sélectionner
                  </p>
                </div>

                {/* Intervalle */}
                <div className="space-y-2">
                  <Label htmlFor="time-step" className="text-sm font-medium">
                    Intervalle (heures)
                  </Label>
                  <select
                    id="time-step"
                    value={parcoursTimeStep}
                    onChange={(e) => setParcoursTimeStep(parseFloat(e.target.value))}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value={0.25}>15 minutes (0.25h)</option>
                    <option value={0.5}>30 minutes (0.5h)</option>
                    <option value={1}>1 heure</option>
                  </select>
                  <p className="text-xs text-gray-500">
                    Pas entre chaque option du curseur
                  </p>
                </div>

                {/* Valeur par défaut */}
                <div className="space-y-2">
                  <Label htmlFor="default-duration" className="text-sm font-medium">
                    Durée par défaut (heures)
                  </Label>
                  <Input
                    id="default-duration"
                    type="number"
                    min="0.5"
                    max={parcoursMaxDuration}
                    step={parcoursTimeStep}
                    value={parcoursDefaultDuration}
                    onChange={(e) => setParcoursDefaultDuration(parseFloat(e.target.value) || 1)}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    Valeur initiale du curseur pour les visiteurs
                  </p>
                </div>
              </div>

              {/* Prévisualisation */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-sm mb-2">Prévisualisation du curseur</h4>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>0h</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full relative">
                    <div 
                      className="absolute h-2 bg-purple-500 rounded-full"
                      style={{ width: `${(parcoursDefaultDuration / parcoursMaxDuration) * 100}%` }}
                    />
                  </div>
                  <span>{parcoursMaxDuration}h</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Options disponibles: {Array.from({ length: Math.floor(parcoursMaxDuration / parcoursTimeStep) + 1 }, (_, i) => 
                    `${(i * parcoursTimeStep).toFixed(1)}h`
                  ).join(', ')}
                </p>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSaveParcoursSettings} 
                  disabled={isSaving}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Sauvegarder les paramètres de temps
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Résumé des paramètres */}
          <Card>
            <CardHeader>
              <CardTitle>Résumé des paramètres</CardTitle>
              <CardDescription>Vue d'ensemble de la configuration actuelle</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 text-sm">
                <div>
                  <span className="font-medium">Nom du musée:</span> {museumName || 'Non défini'}
                </div>
                <div>
                  <span className="font-medium">Titre d'accueil:</span> {museumTitle || 'Non défini'}
                </div>
                <div>
                  <span className="font-medium">Image d'accueil:</span> {museumImageUrl ? 'Configurée' : 'Non définie'}
                </div>
              </div>
              <div className="mt-4">
                <span className="font-medium">Horaires d'ouverture:</span>
                <div className="mt-2 text-sm space-y-1">
                  {daysOfWeek.map(({ key, label }) => {
                    const hours = openingHours[key]
                    return (
                      <div key={key} className="flex justify-between">
                        <span>{label}:</span>
                        <span>
                          {hours?.closed ? 'Fermé' : `${hours?.open || '09:00'} - ${hours?.close || '18:00'}`}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>



      {/* Section Résumé */}
      <div className="bg-gray-50 rounded-lg p-6 mt-6">
        <h2 className="text-xl font-semibold text-center mb-6">Résumé de la Configuration</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Informations générales</h3>
            <div className="text-sm text-gray-700 space-y-1">
              <div><strong>Nom du musée:</strong> {museumName || 'Non défini'}</div>
              <div><strong>Horaires configurés:</strong> {Object.keys(openingHours).length} jour(s)</div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Statut du système</h3>
            <div className="text-sm text-gray-700 space-y-1">
              <div><strong>Paramètres chargés:</strong> {settings.length} éléments</div>
              <div><strong>Dernière mise à jour:</strong> En temps réel</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}