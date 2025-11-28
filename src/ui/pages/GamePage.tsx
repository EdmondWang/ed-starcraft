import { useEffect, useRef } from 'react';
import { Application } from 'pixi.js';
import { createInitialGameState, createScene } from '@/game';

export function GamePage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const sceneRef = useRef<ReturnType<typeof createScene> | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isMounted = true;
    const app = new Application();

    // 等待容器有尺寸后再初始化
    const initApp = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        // 如果容器还没有尺寸，等待下一帧
        requestAnimationFrame(initApp);
        return;
      }

      app
        .init({
          width: rect.width,
          height: rect.height,
          background: '#101018',
          antialias: true,
        })
        .then(() => {
          if (!isMounted || !container) return;

          container.appendChild(app.canvas);
          appRef.current = app;

          const initialState = createInitialGameState();
          const scene = createScene(initialState);
          sceneRef.current = scene;
          app.stage.addChild(scene);

          // 强制渲染一次
          app.renderer.render(app.stage);
          console.log('Scene created:', {
            stageChildren: app.stage.children.length,
            sceneChildren: scene.children.length,
            mapSize: initialState.map.size,
          });

          // 监听容器尺寸变化
          const resizeObserver = new ResizeObserver(() => {
            if (!isMounted || !app) return;
            const newRect = container.getBoundingClientRect();
            app.renderer.resize(newRect.width, newRect.height);
          });
          resizeObserver.observe(container);

          // 保存 resizeObserver 以便清理
          (app as any)._resizeObserver = resizeObserver;
        })
        .catch((error) => {
          console.error('Failed to initialize PixiJS application:', error);
        });
    };

    initApp();

    return () => {
      isMounted = false;
      if (sceneRef.current) {
        sceneRef.current.destroy({ children: true });
        sceneRef.current = null;
      }
      if (appRef.current) {
        const resizeObserver = (appRef.current as any)._resizeObserver;
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
        appRef.current.destroy(true);
        appRef.current = null;
      }
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
