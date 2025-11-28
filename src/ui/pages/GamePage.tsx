import { useEffect, useRef } from 'react';
import { Application } from 'pixi.js';

export function GamePage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const app = new Application();
    appRef.current = app;

    app
      .init({
        resizeTo: containerRef.current,
        background: '#101018',
        antialias: true,
      })
      .then(() => {
        if (!containerRef.current) return;
        containerRef.current.appendChild(app.canvas);
      })
      .catch((error) => {
        console.error('Failed to initialize PixiJS application:', error);
      });

    return () => {
      app.destroy(true, { children: true, texture: true, baseTexture: true });
      appRef.current = null;
    };
  }, []);

  return (
    <div className="game-page">
      <div className="hud-top">
        <div className="resource-bar">资源：矿物 0</div>
      </div>
      <div className="game-layout">
        <div className="game-canvas" ref={containerRef} />
        <aside className="side-panel">
          <h3>单位/建筑信息</h3>
          <p>当前无选中单位（占位）</p>
        </aside>
      </div>
    </div>
  );
}


