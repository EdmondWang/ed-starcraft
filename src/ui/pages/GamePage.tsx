import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { UnitKind, GameState, Unit } from '@/game';
import { Application } from 'pixi.js';
import {
  createInitialGameState,
  createScene,
  updateScene,
  updateGameState,
  commandMoveSelectedUnits,
  commandAttackTarget,
  commandSelectUnit,
  commandDeselectAll,
  screenToWorld,
} from '@/game';
import GameOverScreen from '../components/GameOverScreen';

const TILE_SIZE = 8;
const CAMERA_X = 0;
const CAMERA_Y = 0;

export function GamePage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const sceneRef = useRef<ReturnType<typeof createScene> | null>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectionBox, setSelectionBox] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [cameraState, setCameraState] = useState({ x: 25, y: 25, zoom: 1 });
  const [gameOver, setGameOver] = useState(false);
  const [gameTimeDisplay, setGameTimeDisplay] = useState('0:00');
  const [gameStatus, setGameStatus] = useState<string | null>(null);

  // 建造模式状态
  const [buildMode, setBuildMode] = useState<string | null>(null);
  const [buildPreview, setBuildPreview] = useState<{ x: number; y: number } | null>(null);

  // 顶层函数定义
  const handleRestart = () => {
    if (gameStateRef.current) {
      // 简单重置游戏状态
      setGameOver(false);
    }
  };

  const handleMainMenu = () => {
    navigate('/');
  };

  const handleTrainUnitCommand = (kind: UnitKind) => {
    if (!gameStateRef.current) return;
    const selectedBuilding = gameStateRef.current.buildings.find((b: any) => b.selected);
    if (
      !selectedBuilding ||
      selectedBuilding.isBuilding ||
      selectedBuilding.ownerId !== gameStateRef.current.localPlayerId
    ) {
      alert('请选择一个已完成的己方建筑');
      return;
    }

    // commandTrainUnit 不存在，暂时注释掉
  };

  const navigate = useNavigate();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isMounted = true;
    const app = new Application();

    // 等待容器有尺寸后再初始化
    const initApp = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
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

          // 创建完整的初始游戏状态
          const initialState = createInitialGameState();
          // 确保gameTimeMs属性存在并初始化为0
          initialState.gameTimeMs = 0;
          gameStateRef.current = initialState;
          const scene = createScene(initialState);
          sceneRef.current = scene;
          app.stage.addChild(scene);

          // 鼠标事件处理
          const handleMouseDown = (e: MouseEvent) => {
            if (!gameStateRef.current || !container) return;

            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // 鼠标中键拖拽开始
            if (e.button === 1) {
              setIsPanning(true);
              setPanStart({ x, y });
              container.style.cursor = 'grabbing';
              return;
            }

            const worldPos = screenToWorld(
              x,
              y,
              cameraState.x,
              cameraState.y,
              TILE_SIZE,
              cameraState.zoom,
            );

            // 检查是否点击到单位
            const clickedUnit = gameStateRef.current.units.find((unit: Unit) => {
              const dx = unit.position.x - worldPos.x;
              const dy = unit.position.y - worldPos.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              const radius = unit.kind === 'worker' ? 0.625 : 0.875; // 逻辑单位半径
              return distance <= radius;
            });

            if (e.button === 0) {
              // 左键：选择单位
              if (clickedUnit && clickedUnit.ownerId === gameStateRef.current.localPlayerId) {
                commandSelectUnit(gameStateRef.current, clickedUnit.id);
                setSelectedUnit(clickedUnit);
              } else {
                commandDeselectAll(gameStateRef.current);
                setSelectedUnit(null);
              }
            } else if (e.button === 2) {
              // 右键：移动或攻击
              e.preventDefault();
              if (clickedUnit && clickedUnit.ownerId !== gameStateRef.current.localPlayerId) {
                // 攻击敌方单位
                commandAttackTarget(gameStateRef.current, clickedUnit.id);
              } else {
                // 检查是否点击了敌方建筑
                const clickedBuilding = gameStateRef.current.buildings.find((building: any) => {
                  const dx = building.position.x - worldPos.x;
                  const dy = building.position.y - worldPos.y;
                  const distance = Math.sqrt(dx * dx + dy * dy);
                  return distance <= 1.5; // 建筑点击范围
                });

                if (
                  clickedBuilding &&
                  clickedBuilding.ownerId !== (gameStateRef.current?.localPlayerId || '')
                ) {
                  // 攻击敌方建筑
                  // commandAttackBuilding 不存在，暂时注释掉
                } else {
                  // 移动到地面
                  commandMoveSelectedUnits(gameStateRef.current, worldPos);
                }
              }
            }
          };

          const handleMouseMove = (e: MouseEvent) => {
            if (!isPanning || !container) return;

            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const dx = x - panStart.x;
            const dy = y - panStart.y;

            setCameraState((prev) => ({
              x: prev.x - dx / (TILE_SIZE * prev.zoom),
              y: prev.y - dy / (TILE_SIZE * prev.zoom),
              zoom: prev.zoom,
            }));

            setPanStart({ x, y });
          };

          const handleMouseUp = () => {
            if (isPanning && container) {
              setIsPanning(false);
              container.style.cursor = 'default';
            }
          };

          const handleWheel = (e: WheelEvent) => {
            e.preventDefault();

            const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
            setCameraState((prev) => {
              const newZoom = Math.max(0.5, Math.min(3, prev.zoom * scaleFactor));
              return { ...prev, zoom: newZoom };
            });
          };

          const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
          };

          // 处理建造预览
          const handleBuildPreview = (e: MouseEvent) => {
            if (!buildMode || !container) return;

            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const worldPos = screenToWorld(
              x,
              y,
              cameraState.x,
              cameraState.y,
              TILE_SIZE,
              cameraState.zoom,
            );
            setBuildPreview({ x: Math.round(worldPos.x), y: Math.round(worldPos.y) });
          };

          // 处理建造确认
          const handleBuildConfirm = (e: MouseEvent) => {
            if (!buildMode || !buildPreview || !gameStateRef.current || !container) return;

            const selectedWorker = gameStateRef.current.units.find(
              (u: any) => u.selected && u.kind === 'worker',
            );
            if (!selectedWorker) return;

            // commandBuildStructure 不存在，暂时注释掉
            setBuildMode(null);
            setBuildPreview(null);
          };

          // 处理训练单位

          container.addEventListener('mousemove', handleBuildPreview);
          container.addEventListener('click', handleBuildConfirm);

          // 保存引用以便清理
          (app as any)._handleBuildPreview = handleBuildPreview;
          (app as any)._handleBuildConfirm = handleBuildConfirm;

          container.addEventListener('mousedown', handleMouseDown);
          container.addEventListener('mousemove', handleMouseMove);
          container.addEventListener('mouseup', handleMouseUp);
          container.addEventListener('mouseleave', handleMouseUp);
          container.addEventListener('wheel', handleWheel);
          container.addEventListener('contextmenu', handleContextMenu);

          // 重新开始游戏
          const handleRestart = () => {
            if (gameStateRef.current) {
              // 重置游戏循环状态
              // 不再需要重置游戏循环状态
              // 简化的游戏重置逻辑
              setGameStatus(null);
              setGameTimeDisplay('00:00');
            }
          };

          // 返回主菜单
          const handleMainMenu = () => {
            navigate('/');
          };

          // 游戏循环
          const gameLoop = (currentTime: number) => {
            if (!isMounted || !gameStateRef.current || !sceneRef.current) return;

            const deltaTime = lastFrameTimeRef.current
              ? currentTime - lastFrameTimeRef.current
              : 16; // 第一帧假设 16ms
            lastFrameTimeRef.current = currentTime;

            // 更新游戏状态
            updateGameState(gameStateRef.current, deltaTime);

            // 更新游戏时间显示
            if (gameStateRef.current.gameTimeMs !== undefined) {
              // 简单的时间格式化
              const seconds = Math.floor(gameStateRef.current.gameTimeMs / 1000);
              const minutes = Math.floor(seconds / 60);
              const remainingSeconds = seconds % 60;
              setGameTimeDisplay(`${minutes}:${remainingSeconds.toString().padStart(2, '0')}`);
            }

            // 检查游戏状态
            // 不再检查gameStatus属性，因为它不存在于GameState类型中

            // 更新渲染
            updateScene(sceneRef.current, gameStateRef.current);

            // 更新选中单位信息
            if (gameStateRef.current) {
              const selected = gameStateRef.current.units.find((u: any) => u.selected);
              if (selected) {
                setSelectedUnit(selected);
              } else if (selectedUnit) {
                setSelectedUnit(null);
              }
            }

            // 渲染
            app.renderer.render(app.stage);

            animationFrameRef.current = requestAnimationFrame(gameLoop);
          };

          lastFrameTimeRef.current = performance.now();
          animationFrameRef.current = requestAnimationFrame(gameLoop);

          // 监听容器尺寸变化
          const resizeObserver = new ResizeObserver(() => {
            if (!isMounted || !app) return;
            const newRect = container.getBoundingClientRect();
            app.renderer.resize(newRect.width, newRect.height);
          });
          resizeObserver.observe(container);

          // 保存引用以便清理
          (
            app as Application & {
              _resizeObserver?: ResizeObserver;
              _handleMouseDown?: (e: MouseEvent) => void;
              _handleMouseMove?: (e: MouseEvent) => void;
              _handleMouseUp?: () => void;
              _handleWheel?: (e: WheelEvent) => void;
              _handleContextMenu?: (e: MouseEvent) => void;
            }
          )._resizeObserver = resizeObserver;
          (
            app as Application & {
              _resizeObserver?: ResizeObserver;
              _handleMouseDown?: (e: MouseEvent) => void;
              _handleMouseMove?: (e: MouseEvent) => void;
              _handleMouseUp?: () => void;
              _handleWheel?: (e: WheelEvent) => void;
              _handleContextMenu?: (e: MouseEvent) => void;
            }
          )._handleMouseDown = handleMouseDown;
          (
            app as Application & {
              _resizeObserver?: ResizeObserver;
              _handleMouseDown?: (e: MouseEvent) => void;
              _handleMouseMove?: (e: MouseEvent) => void;
              _handleMouseUp?: () => void;
              _handleWheel?: (e: WheelEvent) => void;
              _handleContextMenu?: (e: MouseEvent) => void;
            }
          )._handleMouseMove = handleMouseMove;
          (
            app as Application & {
              _resizeObserver?: ResizeObserver;
              _handleMouseDown?: (e: MouseEvent) => void;
              _handleMouseMove?: (e: MouseEvent) => void;
              _handleMouseUp?: () => void;
              _handleWheel?: (e: WheelEvent) => void;
              _handleContextMenu?: (e: MouseEvent) => void;
            }
          )._handleMouseUp = handleMouseUp;
          (
            app as Application & {
              _resizeObserver?: ResizeObserver;
              _handleMouseDown?: (e: MouseEvent) => void;
              _handleMouseMove?: (e: MouseEvent) => void;
              _handleMouseUp?: () => void;
              _handleWheel?: (e: WheelEvent) => void;
              _handleContextMenu?: (e: MouseEvent) => void;
            }
          )._handleWheel = handleWheel;
          (
            app as Application & {
              _resizeObserver?: ResizeObserver;
              _handleMouseDown?: (e: MouseEvent) => void;
              _handleMouseMove?: (e: MouseEvent) => void;
              _handleMouseUp?: () => void;
              _handleWheel?: (e: WheelEvent) => void;
              _handleContextMenu?: (e: MouseEvent) => void;
            }
          )._handleContextMenu = handleContextMenu;
        })
        .catch((error) => {
          console.error('Failed to initialize PixiJS application:', error);
        });
    };

    initApp();

    return () => {
      isMounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (sceneRef.current) {
        sceneRef.current.destroy({ children: true });
        sceneRef.current = null;
      }
      if (appRef.current) {
        // 不再尝试访问和修改PIXI.js的私有方法
        const app = appRef.current;
        const resizeObserver = (app as any)._resizeObserver;

        if (resizeObserver) {
          resizeObserver.disconnect();
        }
        // 不再尝试移除PIXI.js的默认事件监听器，让PIXI.js自己处理清理

        app.destroy(true);
        appRef.current = null;
      }
    };
  }, []);

  return (
    <div className="game-page">
      <div className="hud-top">
        <div className="game-time">{gameTimeDisplay}</div>
        <div className="resource-bar">
          <div className="resource-item">
            <div className="resource-icon minerals-icon"></div>
            <span>
              矿物:{' '}
              {gameStateRef.current?.players.find(
                (p: any) => p.id === gameStateRef.current?.localPlayerId,
              )?.resources.minerals || 0}
            </span>
          </div>
          <div className="resource-item">
            <div className="resource-icon gas-icon"></div>
            <span>
              气体:{' '}
              {gameStateRef.current?.players.find(
                (p: any) => p.id === gameStateRef.current?.localPlayerId,
              )?.resources.gas || 0}
            </span>
          </div>
        </div>
      </div>
      <div className="game-layout">
        <div className="game-canvas" ref={containerRef} />
        <aside className="side-panel">
          <h3>单位/建筑信息</h3>
          {selectedUnit ? (
            <div className="selection-info">
              <h3>{selectedUnit.kind === 'worker' ? '工人' : '陆战队员'}</h3>
              <div className="status-bar">
                <div
                  className="health-bar"
                  style={{ width: `${(selectedUnit.hp / selectedUnit.stats.maxHp) * 100}%` }}
                />
              </div>
              <div className="unit-stats">
                <div>
                  生命值: {selectedUnit.hp} / {selectedUnit.stats.maxHp}
                </div>
                {selectedUnit.stats.attackDamage && (
                  <div>攻击力: {selectedUnit.stats.attackDamage}</div>
                )}
                {selectedUnit.stats.attackRange && (
                  <div>攻击范围: {selectedUnit.stats.attackRange}</div>
                )}
                {selectedUnit.stats.moveSpeed && (
                  <div>移动速度: {selectedUnit.stats.moveSpeed}</div>
                )}
              </div>
              {selectedUnit.moveTarget && (
                <div style={{ fontSize: '11px', marginTop: '4px', color: '#9ca3af' }}>
                  状态: 移动中
                </div>
              )}
              {selectedUnit.attackTargetId && (
                <p>
                  <strong>状态：</strong>攻击中
                </p>
              )}
              {selectedUnit.gatheringTargetId && (
                <p>
                  <strong>状态：</strong>采集资源中
                </p>
              )}
              {selectedUnit.carryingResource && (
                <p>
                  <strong>携带：</strong>
                  {selectedUnit.carryingResource.amount} 单位{' '}
                  {selectedUnit.carryingResource.type === 'minerals' ? '矿物' : '气体'}
                </p>
              )}

              {/* 建造菜单 - 仅当选择工人时显示 */}
              {selectedUnit.kind === 'worker' && gameStateRef.current && (
                <div className="control-group">
                  <h4>建造</h4>
                  <div className="build-menu">
                    <div
                      className={`build-option ${(gameStateRef.current?.players?.find((p: any) => p.id === gameStateRef.current?.localPlayerId)?.resources?.minerals || 0) < 100 ? 'disabled' : ''}`}
                      onClick={() => {
                        if (
                          (gameStateRef.current?.players?.find(
                            (p: any) => p.id === gameStateRef.current?.localPlayerId,
                          )?.resources?.minerals || 0) >= 100
                        ) {
                          setBuildMode('command_center');
                          setBuildPreview(null);
                        }
                      }}
                    >
                      <div className="build-icon">🏢</div>
                      <div className="build-name">指挥中心</div>
                      <div className="build-cost">
                        <div className="resource-icon minerals-icon"></div>
                        <span>100</span>
                      </div>
                    </div>

                    <div
                      className={`build-option ${(gameStateRef.current?.players?.find((p: any) => p.id === gameStateRef.current?.localPlayerId)?.resources?.minerals || 0) < 150 ? 'disabled' : ''}`}
                      onClick={() => {
                        if (
                          (gameStateRef.current?.players?.find(
                            (p: any) => p.id === gameStateRef.current?.localPlayerId,
                          )?.resources?.minerals || 0) >= 150
                        ) {
                          setBuildMode('barracks');
                          setBuildPreview(null);
                        }
                      }}
                    >
                      <div className="build-icon">🏛️</div>
                      <div className="build-name">兵营</div>
                      <div className="build-cost">
                        <div className="resource-icon minerals-icon"></div>
                        <span>150</span>
                      </div>
                    </div>

                    <div
                      className={`build-option ${(gameStateRef.current?.players?.find((p: any) => p.id === gameStateRef.current?.localPlayerId)?.resources?.minerals || 0) < 50 ? 'disabled' : ''}`}
                      onClick={() => {
                        if (
                          (gameStateRef.current?.players?.find(
                            (p: any) => p.id === gameStateRef.current?.localPlayerId,
                          )?.resources?.minerals || 0) >= 50
                        ) {
                          setBuildMode('mining_facility');
                          setBuildPreview(null);
                        }
                      }}
                    >
                      <div className="build-icon">⛏️</div>
                      <div className="build-name">采矿设施</div>
                      <div className="build-cost">
                        <div className="resource-icon minerals-icon"></div>
                        <span>50</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p>当前无选中单位</p>

              {/* 建筑信息和训练菜单 */}
              {gameStateRef.current &&
                gameStateRef.current.buildings.some((b: any) => b.selected) && (
                  <div>
                    {gameStateRef.current.buildings
                      .filter((b: any) => b.selected)
                      .map((building: any) => (
                        <div key={building.id} className="selection-info">
                          <h3>
                            {building.kind === 'command_center'
                              ? '指挥中心'
                              : building.kind === 'barracks'
                                ? '兵营'
                                : building.kind === 'mining_facility'
                                  ? '采矿设施'
                                  : '建筑'}
                          </h3>
                          <div className="status-bar">
                            <div
                              className="health-bar"
                              style={{ width: `${(building.hp / building.stats.maxHp) * 100}%` }}
                            />
                          </div>
                          <div className="unit-stats">
                            <div>
                              生命值: {building.hp} / {building.stats.maxHp}
                            </div>
                            {building.stats.attackDamage && (
                              <div>攻击力: {building.stats.attackDamage}</div>
                            )}
                            {building.stats.attackRange && (
                              <div>攻击范围: {building.stats.attackRange}</div>
                            )}
                          </div>
                          {building.isBuilding && (
                            <div className="build-progress">
                              <div className="progress-bar-bg"></div>
                              <div
                                className="progress-bar-fill"
                                style={{ width: `${building.buildProgress * 100}%` }}
                              />
                              <div className="progress-text">
                                {Math.round(building.buildProgress * 100)}%
                              </div>
                            </div>
                          )}

                          {/* 训练菜单 - 仅当选择兵营时显示 */}
                          {building.kind === 'barracks' && !building.isBuilding && (
                            <div className="control-group">
                              <h4>训练</h4>
                              <div className="build-menu">
                                <div
                                  className={`build-option ${(gameStateRef.current?.players?.find((p: any) => p.id === gameStateRef.current?.localPlayerId)?.resources?.minerals || 0) < 50 ? 'disabled' : ''}`}
                                  onClick={() => {
                                    if (
                                      (gameStateRef.current?.players?.find(
                                        (p: any) => p.id === gameStateRef.current?.localPlayerId,
                                      )?.resources?.minerals || 0) >= 50
                                    ) {
                                      handleTrainUnitCommand('marine' as UnitKind);
                                    }
                                  }}
                                >
                                  <div className="build-icon">🔫</div>
                                  <div className="build-name">陆战队员</div>
                                  <div className="build-cost">
                                    <div className="resource-icon minerals-icon"></div>
                                    <span>50</span>
                                  </div>
                                </div>

                                <div
                                  className={`build-option ${(gameStateRef.current?.players?.find((p: any) => p.id === gameStateRef.current?.localPlayerId)?.resources?.minerals || 0) < 50 ? 'disabled' : ''}`}
                                  onClick={() => {
                                    if (
                                      (gameStateRef.current?.players?.find(
                                        (p: any) => p.id === gameStateRef.current?.localPlayerId,
                                      )?.resources?.minerals || 0) >= 50
                                    ) {
                                      handleTrainUnitCommand('worker' as UnitKind);
                                    }
                                  }}
                                >
                                  <div className="build-icon">👷</div>
                                  <div className="build-name">工人</div>
                                  <div className="build-cost">
                                    <div className="resource-icon minerals-icon"></div>
                                    <span>50</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
            </div>
          )}
        </aside>
      </div>
      {gameStatus && gameStatus !== 'in_progress' && (
        <GameOverScreen
          gameStatus={gameStatus as any}
          onRestart={handleRestart}
          onMainMenu={handleMainMenu}
          gameTime={gameTimeDisplay}
        />
      )}
    </div>
  );
}
