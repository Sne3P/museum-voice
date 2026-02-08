"use client"

import { useState, useRef } from 'react'
import { useAuth } from '@/components/auth-context'
import { AdminLayout } from '../components'
import { cn } from '@/lib/utils'
import { QrCode, Maximize2, X, Copy, ExternalLink, Check, Trash2, AlertTriangle } from 'lucide-react'
import QRCodeLib from 'qrcode'

export default function QRCodePage() {
  const { currentUser, hasPermission } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const modalCanvasRef = useRef<HTMLCanvasElement>(null)
  const [qrCodeData, setQrCodeData] = useState('')
  const [tokenData, setTokenData] = useState<any>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isCleaningAll, setIsCleaningAll] = useState(false)

  const generateQRCode = async () => {
    setIsGenerating(true)
    setError('')
    
    try {
      const response = await fetch('/api/qrcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      
      if (canvasRef.current && data.url) {
        await QRCodeLib.toCanvas(canvasRef.current, data.url, {
          width: 280,
          margin: 2,
          color: { dark: '#000000', light: '#FFFFFF' }
        })
        setQrCodeData(data.url)
      }
      
    } catch (error) {
      console.error('Erreur génération QR:', error)
      setError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setIsGenerating(false)
    }
  }

  const showLargeQRCode = async () => {
    setShowModal(true)
    setTimeout(async () => {
      if (modalCanvasRef.current && qrCodeData) {
        await QRCodeLib.toCanvas(modalCanvasRef.current, qrCodeData, {
          width: 400,
          margin: 2,
          color: { dark: '#000000', light: '#FFFFFF' }
        })
      }
    }, 100)
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

  const cleanupAllSessions = async () => {
    if (!confirm('⚠️ Cette action supprime TOUTES les sessions actives.\n\nVoulez-vous continuer ?')) {
      return
    }

    setIsCleaningAll(true)
    setError('')

    try {
      const response = await fetch('/api/admin/cleanup-all-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du nettoyage')
      }

      alert(`✅ Nettoyage terminé!\n\n${data.deleted_sessions} sessions supprimées\n${data.deleted_audio_folders} dossiers audio supprimés`)
      
    } catch (error) {
      console.error('Erreur nettoyage:', error)
      setError(error instanceof Error ? error.message : 'Erreur lors du nettoyage')
    } finally {
      setIsCleaningAll(false)
    }
  }

  return (
    <AdminLayout 
      title="Générateur QR Code" 
      description="Créer des QR codes pour l'audioguide visiteurs"
      showBackButton
    >
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Génération */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center">
                <QrCode className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-black">Générer un QR Code</h2>
                <p className="text-sm text-neutral-500">Token unique pour l'audioguide</p>
              </div>
            </div>

            {/* Info box */}
            <div className="bg-neutral-50 rounded-xl p-4 mb-6">
              <h4 className="font-medium text-black text-sm mb-2">Comment ça fonctionne</h4>
              <ul className="text-sm text-neutral-600 space-y-1">
                <li>• Chaque QR code génère un token unique</li>
                <li>• Le visiteur scanne pour accéder à l'audioguide</li>
                <li>• Token à usage unique, traçabilité complète</li>
              </ul>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button 
              onClick={generateQRCode} 
              disabled={isGenerating}
              className={cn(
                "w-full py-3 px-4 rounded-xl font-medium text-sm transition-all",
                "bg-black text-white hover:bg-neutral-800",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isGenerating ? 'Génération en cours...' : 'Générer un Nouveau QR Code'}
            </button>

            {/* Admin cleanup section */}
            {hasPermission('manage_admin_musee') && (
              <div className="mt-6 pt-6 border-t border-neutral-200">
                <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl mb-4">
                  <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-900 text-sm">Zone Administration</h4>
                    <p className="text-xs text-red-700 mt-1">
                      Supprime toutes les sessions actives et fichiers audio associés.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={cleanupAllSessions} 
                  disabled={isCleaningAll}
                  className={cn(
                    "w-full py-3 px-4 rounded-xl font-medium text-sm transition-all",
                    "bg-white text-red-600 border border-red-200 hover:bg-red-50",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <Trash2 className="h-4 w-4 inline mr-2" />
                  {isCleaningAll ? 'Nettoyage en cours...' : 'Supprimer Toutes les Sessions'}
                </button>
              </div>
            )}
          </div>

          {/* Aperçu QR Code */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-6">
            <h2 className="font-semibold text-black mb-6">Aperçu du QR Code</h2>
            
            <div className="flex justify-center mb-6">
              <div className={cn(
                "w-72 h-72 rounded-xl border-2 border-dashed flex items-center justify-center",
                qrCodeData ? "border-neutral-300 bg-white p-4" : "border-neutral-200 bg-neutral-50"
              )}>
                <canvas
                  ref={canvasRef}
                  className={qrCodeData ? 'block' : 'hidden'}
                />
                {!qrCodeData && (
                  <QrCode className="h-16 w-16 text-neutral-300" />
                )}
              </div>
            </div>

            {qrCodeData && (
              <>
                {/* Actions */}
                <div className="flex gap-2 justify-center mb-6">
                  <button 
                    onClick={showLargeQRCode}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200 text-sm font-medium transition-all"
                  >
                    <Maximize2 className="h-4 w-4" />
                    Agrandir
                  </button>
                  <button 
                    onClick={copyToClipboard}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200 text-sm font-medium transition-all"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copié!' : 'Copier'}
                  </button>
                  <button 
                    onClick={() => window.open(qrCodeData, '_blank')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200 text-sm font-medium transition-all"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Ouvrir
                  </button>
                </div>

                {/* URL */}
                <div className="bg-neutral-50 rounded-xl p-4">
                  <p className="text-xs text-neutral-500 mb-2">Lien d'accès</p>
                  <p className="font-mono text-xs text-black break-all">{qrCodeData}</p>
                </div>
              </>
            )}

            {!qrCodeData && (
              <p className="text-center text-sm text-neutral-400">
                Générez un QR code pour voir l'aperçu
              </p>
            )}
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-black">QR Code - Grand Format</h3>
                <button 
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex justify-center">
                <canvas ref={modalCanvasRef} />
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}