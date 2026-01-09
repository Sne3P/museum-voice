"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, QrCode, Maximize2, X, Copy, ExternalLink, Check } from 'lucide-react'
import QRCodeLib from 'qrcode'

export default function QRCodePage() {
  const { isAuthenticated, currentUser, hasPermission, isLoading } = useAuth()
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const modalCanvasRef = useRef<HTMLCanvasElement>(null)
  const [qrCodeData, setQrCodeData] = useState('')
  const [tokenData, setTokenData] = useState<any>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isCleaningAll, setIsCleaningAll] = useState(false)

  useEffect(() => {
    if (isLoading) return
    
    if (!isAuthenticated || (!hasPermission('edit_maps') && !hasPermission('manage_accueil') && !hasPermission('view_only'))) {
      router.push('/admin')
    }
  }, [isLoading, isAuthenticated, hasPermission, router])

  const generateQRCode = async () => {
    setIsGenerating(true)
    setError('')
    
    try {
      // Appeler l'API pour créer un nouveau token
      const response = await fetch('/api/qrcode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser?.id,
          userName: currentUser?.username
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la génération du token')
      }

      setTokenData(data)
      
      // Générer le QR code avec l'URL retournée
      if (canvasRef.current && data.url) {
        const qrSize = window.innerWidth < 640 ? 300 : 350;
        await QRCodeLib.toCanvas(canvasRef.current, data.url, {
          width: qrSize,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        })
        setQrCodeData(data.url)
      }
      
    } catch (error) {
      console.error('Erreur lors de la génération du QR code:', error)
      setError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setIsGenerating(false)
    }
  }

  const showLargeQRCode = async () => {
    setShowModal(true)
    // Attendre que le modal soit rendu
    setTimeout(async () => {
      if (modalCanvasRef.current && qrCodeData) {
        await QRCodeLib.toCanvas(modalCanvasRef.current, qrCodeData, {
          width: 500,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        })
      }
    }, 100)
  }

  const closeModal = () => {
    setShowModal(false)
  }

  const copyToClipboard = async () => {
    if (qrCodeData) {
      try {
        await navigator.clipboard.writeText(qrCodeData)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('Erreur copie:', err)
      }
    }
  }

  const openInNewTab = () => {
    if (qrCodeData) {
      window.open(qrCodeData, '_blank')
    }
  }

  const cleanupAllSessions = async () => {
    if (!confirm('⚠️ ATTENTION : Cette action va supprimer TOUTES les sessions actives et leurs fichiers audio associés.\n\nCette action est irréversible.\n\nVoulez-vous continuer ?')) {
      return
    }

    setIsCleaningAll(true)
    setError('')

    try {
      const response = await fetch('/api/admin/cleanup-all-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du nettoyage')
      }

      alert(`✅ Nettoyage terminé avec succès!\n\n${data.deleted_sessions} sessions supprimées\n${data.deleted_audio_folders} dossiers audio supprimés`)
      
    } catch (error) {
      console.error('Erreur nettoyage:', error)
      setError(error instanceof Error ? error.message : 'Erreur lors du nettoyage')
    } finally {
      setIsCleaningAll(false)
    }
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 sm:mb-8 gap-4">
          <Button 
            variant="outline" 
            onClick={() => router.back()}
            className="flex items-center gap-2 self-start sm:self-center"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <div className="text-center flex-1 order-first sm:order-none">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Génération de QR Code</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Créer des QR codes pour l'audioguide du musée</p>
          </div>
          <div className="hidden sm:block w-20"></div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
          {/* Paramètres */}
          <Card className="w-full">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <QrCode className="h-5 w-5" />
                Paramètres du QR Cod
              </CardTitle>
              <CardDescription className="text-sm">
                Configurez l'URL et les paramètres pour générer le QR code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pb-6">
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Fonctionnement</h4>
                <div className="text-sm text-green-800 space-y-1">
                  <p>• Chaque QR code génère un token unique</p>
                  <p>• Le visiteur accède à l'audioguide via le token</p>
                  <p>• Une fois utilisé, le token devient invalide</p>
                  <p>• Traçabilité complète des accès</p>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-800">
                    <strong>Erreur:</strong> {error}
                  </p>
                </div>
              )}

              <Button 
                onClick={generateQRCode} 
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? 'Génération du token...' : 'Générer un Nouveau QR Code'}
              </Button>

              {hasPermission('manage_admin_musee') && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="p-4 bg-red-50 rounded-lg mb-3">
                    <h4 className="font-medium text-red-900 mb-2">⚠️ Zone Administration</h4>
                    <p className="text-sm text-red-800">
                      Cette action supprime toutes les sessions actives et leurs fichiers audio. 
                      À utiliser uniquement en cas de besoin (maintenance, tests, etc.)
                    </p>
                  </div>
                  <Button 
                    onClick={cleanupAllSessions} 
                    disabled={isCleaningAll}
                    variant="destructive"
                    className="w-full"
                  >
                    {isCleaningAll ? 'Nettoyage en cours...' : '🗑️ Supprimer Toutes les Sessions'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Aperçu et téléchargement */}
          <Card className="w-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">QR Code Généré</CardTitle>
              <CardDescription className="text-sm">
                Aperçu et options de téléchargement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pb-6">
              <div className="flex justify-center w-full overflow-hidden">
                <div className="p-4 bg-white border-2 border-dashed border-gray-300 rounded-lg w-full max-w-md">
                  <div className="flex justify-center">
                    <canvas
                      ref={canvasRef}
                      className={qrCodeData ? 'block w-full h-auto max-w-[300px] sm:max-w-[350px]' : 'hidden'}
                    />
                  </div>
                  {!qrCodeData && (
                    <div className="w-full aspect-square max-w-[300px] sm:max-w-[350px] mx-auto flex items-center justify-center text-gray-400">
                      <QrCode className="h-16 w-16 sm:h-20 sm:w-20" />
                    </div>
                  )}
                </div>
              </div>

              {qrCodeData && (
                <div className="flex justify-center">
                  <Button onClick={showLargeQRCode} className="px-4 sm:px-8 text-sm sm:text-base">
                    <Maximize2 className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Afficher en Plus Grand</span>
                    <span className="sm:hidden">Agrandir</span>
                  </Button>
                </div>
              )}

              {qrCodeData && (
                <div className="space-y-3 p-4 bg-blue-50 rounded-lg">
                  <Label className="text-sm font-medium text-blue-900">Lien d'accès</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={qrCodeData} 
                      readOnly 
                      className="font-mono text-xs bg-white"
                    />
                    <Button 
                      onClick={copyToClipboard} 
                      variant="outline" 
                      size="sm"
                      className="shrink-0"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Copié
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" />
                          Copier
                        </>
                      )}
                    </Button>
                    <Button 
                      onClick={openInNewTab} 
                      variant="outline" 
                      size="sm"
                      className="shrink-0"
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Ouvrir
                    </Button>
                  </div>
                  <p className="text-xs text-blue-700">
                    💡 Copiez ce lien ou ouvrez-le dans un nouvel onglet pour tester sans scanner le QR code
                  </p>
                </div>
              )}

              <div className="text-xs text-gray-500 space-y-1 p-3 bg-gray-50 rounded">
                <p><strong>Utilisation:</strong></p>
                <p>• Imprimez le QR code sur des supports physiques</p>
                <p>• Les visiteurs scannent pour accéder à l'audioguide</p>
                <p>• Le token permet de tracer l'utilisation</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modal pour afficher le QR code en grand */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">QR Code - Affichage Grand Format</h3>
                <Button variant="outline" size="sm" onClick={closeModal}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex justify-center">
                <canvas ref={modalCanvasRef} className="max-w-full h-auto" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}