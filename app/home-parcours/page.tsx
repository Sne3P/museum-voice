export default function AccueilParcours() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            🎭 Museum Voice - Parcours
          </h1>
          <p className="text-xl text-gray-600">
            Système de parcours personnalisés pour musées
          </p>
        </div>

        {/* Navigation Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Générateur QR Code */}
          <a href="/qrcode-generator" className="group">
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-300 border-2 border-transparent group-hover:border-indigo-200">
              <div className="text-6xl mb-6 text-center">📱</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">
                Générateur QR Code
              </h3>
              <p className="text-gray-600 mb-6 text-center">
                Créez des QR codes pour accéder directement aux parcours personnalisés depuis n'importe quel appareil mobile
              </p>
              <div className="text-indigo-600 font-medium text-center group-hover:text-indigo-800 text-lg">
                Générer un QR Code →
              </div>
            </div>
          </a>

          {/* Exemple de Parcours */}
          <a href="/parcours?id=de5f0bd6" className="group">
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-300 border-2 border-transparent group-hover:border-purple-200">
              <div className="text-6xl mb-6 text-center">🎨</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">
                Parcours Exemple
              </h3>
              <p className="text-gray-600 mb-6 text-center">
                Découvrez un exemple de parcours personnalisé généré automatiquement avec notre système intelligent
              </p>
              <div className="text-purple-600 font-medium text-center group-hover:text-purple-800 text-lg">
                Voir le parcours →
              </div>
            </div>
          </a>
        </div>

        {/* Status du système */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            📊 État du Système
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-green-50 rounded-lg p-6 text-center">
              <div className="text-green-600 font-bold text-4xl mb-2">3</div>
              <div className="text-green-700 text-lg font-medium">Parcours Générés</div>
              <div className="text-green-600 text-sm mt-1">Prêts pour QR code</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-6 text-center">
              <div className="text-blue-600 font-bold text-4xl mb-2">9</div>
              <div className="text-blue-700 text-lg font-medium">Segments TTS</div>
              <div className="text-blue-600 text-sm mt-1">Optimisés pour audio</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-6 text-center">
              <div className="text-purple-600 font-bold text-4xl mb-2">108</div>
              <div className="text-purple-700 text-lg font-medium">Prégénérations</div>
              <div className="text-purple-600 text-sm mt-1">Base de contenus</div>
            </div>
          </div>
        </div>

        {/* Quick Actions - Parcours disponibles */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            ⚡ Parcours Disponibles
          </h2>
          <p className="text-gray-600 text-center mb-6">
            Cliquez sur un parcours pour l'ouvrir directement ou scannez le QR code correspondant
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <a href="/parcours?id=de5f0bd6" className="bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 p-4 rounded-lg hover:from-purple-200 hover:to-purple-300 transition-all duration-300 text-center">
              <div className="font-bold text-lg mb-2">Parcours #1</div>
              <div className="text-sm opacity-80">ID: de5f0bd6</div>
              <div className="text-sm opacity-80">3 segments • ~15 min</div>
            </a>
            <a href="/parcours?id=8df6f906" className="bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 p-4 rounded-lg hover:from-blue-200 hover:to-blue-300 transition-all duration-300 text-center">
              <div className="font-bold text-lg mb-2">Parcours #2</div>
              <div className="text-sm opacity-80">ID: 8df6f906</div>
              <div className="text-sm opacity-80">3 segments • ~15 min</div>
            </a>
            <a href="/parcours?id=4f1935d2" className="bg-gradient-to-r from-green-100 to-green-200 text-green-800 p-4 rounded-lg hover:from-green-200 hover:to-green-300 transition-all duration-300 text-center">
              <div className="font-bold text-lg mb-2">Parcours #3</div>
              <div className="text-sm opacity-80">ID: 4f1935d2</div>
              <div className="text-sm opacity-80">3 segments • ~15 min</div>
            </a>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-12 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            📝 Comment utiliser le système ?
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                📱 Pour les visiteurs :
              </h3>
              <ol className="list-decimal list-inside text-gray-700 space-y-2">
                <li>Scanner le QR code avec votre smartphone</li>
                <li>Ouvrir le lien dans votre navigateur</li>
                <li>Suivre le parcours personnalisé étape par étape</li>
                <li>Profiter du contenu adapté à vos préférences</li>
              </ol>
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                🎯 Pour les administrateurs :
              </h3>
              <ol className="list-decimal list-inside text-gray-700 space-y-2">
                <li>Aller sur "Générateur QR Code"</li>
                <li>Sélectionner le parcours approprié</li>
                <li>Générer et imprimer le QR code</li>
                <li>Placer le code dans l'espace du musée</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}