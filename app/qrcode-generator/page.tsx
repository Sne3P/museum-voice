'use client';

import { useState, useEffect } from 'react';

interface ParcoursInfo {
  group_id: string;
  segment_count: number;
  age_cible: string;
  thematique: string;
}

export default function QRCodePage() {
  const [parcoursList, setParcoursList] = useState<ParcoursInfo[]>([]);
  const [selectedParcours, setSelectedParcours] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Récupérer la liste des parcours disponibles
    fetch('/api/parcours/list')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setParcoursList(data);
          if (data.length > 0) {
            setSelectedParcours(data[0].group_id);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const generateQRCode = () => {
    if (!selectedParcours) return;
    
    const baseUrl = window.location.origin;
    const parcoursUrl = `${baseUrl}/parcours?id=${selectedParcours}`;
    
    // Utiliser un service QR code gratuit
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(parcoursUrl)}`;
    setQrCodeUrl(qrUrl);
  };

  const copyUrl = () => {
    if (!selectedParcours) return;
    
    const baseUrl = window.location.origin;
    const parcoursUrl = `${baseUrl}/parcours?id=${selectedParcours}`;
    navigator.clipboard.writeText(parcoursUrl);
    
    // Visual feedback
    const button = document.getElementById('copy-btn');
    if (button) {
      const original = button.textContent;
      button.textContent = 'Copié !';
      button.classList.add('bg-green-500');
      setTimeout(() => {
        button.textContent = original;
        button.classList.remove('bg-green-500');
      }, 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des parcours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            📱 Générateur de QR Code
          </h1>
          <p className="text-gray-600 text-lg">
            Générez un QR code pour accéder à un parcours personnalisé
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Configuration */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              ⚙️ Configuration
            </h2>

            {parcoursList.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-4">🎭</div>
                <p className="text-gray-600">Aucun parcours disponible</p>
                <p className="text-sm text-gray-500 mt-2">
                  Générez d'abord des parcours avec le système de prégénération
                </p>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sélectionnez un parcours :
                  </label>
                  <select 
                    value={selectedParcours}
                    onChange={(e) => setSelectedParcours(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {parcoursList.map((parcours) => (
                      <option key={parcours.group_id} value={parcours.group_id}>
                        {parcours.group_id} - {parcours.age_cible} / {parcours.thematique} ({parcours.segment_count} segments)
                      </option>
                    ))}
                  </select>
                </div>

                {selectedParcours && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-800 mb-2">Aperçu du parcours :</h3>
                    {(() => {
                      const parcours = parcoursList.find(p => p.group_id === selectedParcours);
                      return parcours ? (
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><span className="font-medium">ID :</span> {parcours.group_id}</p>
                          <p><span className="font-medium">Segments :</span> {parcours.segment_count}</p>
                          <p><span className="font-medium">Âge cible :</span> {parcours.age_cible}</p>
                          <p><span className="font-medium">Thématique :</span> {parcours.thematique}</p>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    onClick={generateQRCode}
                    disabled={!selectedParcours}
                    className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                  >
                    🎯 Générer le QR Code
                  </button>
                  
                  <button
                    onClick={copyUrl}
                    disabled={!selectedParcours}
                    id="copy-btn"
                    className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                  >
                    📋 Copier l'URL
                  </button>
                </div>
              </>
            )}
          </div>

          {/* QR Code */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              📱 QR Code
            </h2>

            {qrCodeUrl ? (
              <div className="text-center">
                <div className="bg-gray-50 p-6 rounded-lg mb-4">
                  <img 
                    src={qrCodeUrl} 
                    alt="QR Code du parcours"
                    className="mx-auto border rounded-lg shadow-sm"
                  />
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Scannez ce QR code pour accéder au parcours
                </p>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-xs text-blue-700 break-all">
                    {window.location.origin}/parcours?id={selectedParcours}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-300 text-6xl mb-4">📱</div>
                <p className="text-gray-500">
                  Sélectionnez un parcours et cliquez sur "Générer le QR Code"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-12 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            📋 Instructions d'utilisation
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">📱 Pour l'utilisateur :</h3>
              <ol className="list-decimal list-inside text-gray-600 space-y-1 text-sm">
                <li>Scanner le QR code avec l'appareil photo</li>
                <li>Ouvrir le lien dans le navigateur</li>
                <li>Profiter du parcours personnalisé</li>
              </ol>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">🎯 Pour l'administrateur :</h3>
              <ol className="list-decimal list-inside text-gray-600 space-y-1 text-sm">
                <li>Sélectionner le parcours approprié</li>
                <li>Générer et imprimer le QR code</li>
                <li>Placer le QR code dans le musée</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}