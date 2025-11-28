import { Link } from 'react-router-dom';

export function MainMenuPage() {
  return (
    <div className="menu">
      <h2>主菜单</h2>
      <div className="menu-buttons">
        <Link to="/game" className="btn primary">
          开始游戏
        </Link>
        <Link to="/tutorial" className="btn">
          教程
        </Link>
        <button className="btn disabled" disabled>
          读取存档（占位）
        </button>
        <button className="btn disabled" disabled>
          设置（占位）
        </button>
      </div>
    </div>
  );
}


