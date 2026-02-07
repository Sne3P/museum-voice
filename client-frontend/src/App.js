import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Accueil from './pages/accueil/Accueil';
import MesChoix from './pages/mes_choix/MesChoix';
import Resume from './pages/resume/Resume';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Accueil />} />
          <Route path="/mes-choix" element={<MesChoix />} />
          <Route path="/resume" element={<Resume />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
