import { Routes, Route } from 'react-router-dom';
import { MainLayout } from './layout/MainLayout';
import { MainMenuPage } from './pages/MainMenuPage';
import { GamePage } from './pages/GamePage';
import { TutorialPage } from './pages/TutorialPage';

export function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<MainMenuPage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/tutorial" element={<TutorialPage />} />
      </Routes>
    </MainLayout>
  );
}
