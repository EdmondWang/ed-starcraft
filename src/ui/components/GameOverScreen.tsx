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
  score = 0
}) => {
  // 根据游戏状态确定显示内容
  const getGameOverContent = () => {
    switch (gameStatus) {
      case GameStatus.VICTORY:
        return {
          title: '胜利！',
          subtitle: '恭喜你取得了胜利！',
          color: '#4ade80'
        };
      case GameStatus.DEFEAT:
        return {
          title: '失败',
          subtitle: '再接再厉，下次一定能赢！',
          color: '#ef4444'
        };
      case GameStatus.DRAW:
        return {
          title: '平局',
          subtitle: '战斗结束，不分胜负。',
          color: '#facc15'
        };
      default:
        return {
          title: '',
          subtitle: '',
          color: '#6b7280'
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
            <span className="stat-label">游戏时间</span>
            <span className="stat-value">{gameTime}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">最终得分</span>
            <span className="stat-value">{score}</span>
          </div>
        </div>
        
        <div className="game-over-actions">
          <button 
            className="game-over-btn game-over-btn-primary" 
            onClick={onRestart}
          >
            重新开始
          </button>
          <button 
            className="game-over-btn game-over-btn-secondary" 
            onClick={onMainMenu}
          >
            返回主菜单
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverScreen;