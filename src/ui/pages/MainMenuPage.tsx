import { Link } from 'react-router-dom';
import { ParticleGalaxy } from '../components/ParticleGalaxy';

export function MainMenuPage() {
  return (
    <div className="menu relative min-h-screen">
      <ParticleGalaxy />
      <h2>Main Menu</h2>
      <div className="menu-buttons">
        <Link to="/game" className="btn primary">
          Start Game
        </Link>
        <Link to="/tutorial" className="btn">
          Tutorial
        </Link>
        <button className="btn disabled" disabled>
          Load Game (Placeholder)
        </button>
        <button className="btn disabled" disabled>
          Settings (Placeholder)
        </button>
      </div>
    </div>
  );
}
