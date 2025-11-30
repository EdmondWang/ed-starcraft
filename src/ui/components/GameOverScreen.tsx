import React from 'react';
import { GameStatus } from '../../game/core/gameFlow';

interface GameOverScreenProps {
  gameStatus: GameStatus;
  onRestart: () => void;
  onMainMenu: () => void;
  gameTime?: string;
  score?: number;
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({
  gameStatus,
  onRestart,
  onMainMenu,
  gameTime = '00:00',
  score = 0,
}) => {
  // 根据游戏状态确定显示内容
  const getGameOverContent = () => {
    switch (gameStatus) {
      case GameStatus.VICTORY:
        return {
          title: 'Victory!',
          subtitle: 'Congratulations on your victory!',
          color: '#4ade80',
        };
      case GameStatus.DEFEAT:
        return {
          title: 'Defeat',
          subtitle: "Keep trying, you'll win next time!",
          color: '#ef4444',
        };
      case GameStatus.DRAW:
        return {
          title: 'Draw',
          subtitle: 'Battle ended in a draw.',
          color: '#facc15',
        };
      default:
        return {
          title: '',
          subtitle: '',
          color: '#6b7280',
        };
    }
  };

  const content = getGameOverContent();

  return (
    <div className="game-over-screen">
      <div className="game-over-overlay"></div>
      <div className="game-over-content">
        <div className="game-over-header" style={{ borderColor: content.color }}>
          <h1 className="game-over-title" style={{ color: content.color }}>
            {content.title}
          </h1>
          <p className="game-over-subtitle">{content.subtitle}</p>
        </div>

        <div className="game-over-stats">
          <div className="stat-item">
            <span className="stat-label">Game Time</span>
            <span className="stat-value">{gameTime}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Final Score</span>
            <span className="stat-value">{score}</span>
          </div>
        </div>

        <div className="game-over-actions">
          <button className="game-over-btn game-over-btn-primary" onClick={onRestart}>
            Restart
          </button>
          <button className="game-over-btn game-over-btn-secondary" onClick={onMainMenu}>
            Back to Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverScreen;
