import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { UnitKind, GameState, Unit } from '@/game';
import { Application } from 'pixi.js';

import type { Building as CoreBuilding } from '@/game';

// Type definitions
interface Position {
  x: number;
  y: number;
}

interface UnitStats {
  maxHp: number;
  attackDamage?: number;
  attackRange?: number;
  speed?: number;
  cost?: ResourceCost;
}

interface BuildingStats {
  maxHp: number;
  buildTime: number;
  cost: ResourceCost;
}

interface ResourceCost {
  minerals: number;
  gas?: number;
  supply?: number;
}

interface ExtendedUnit extends Unit {
  status?: string;
  targetPosition?: Position;
}

// Define extended type interfaces
interface ExtendedApplication extends Application {
  _resizeObserver?: ResizeObserver;
  _handleMouseDown?: (e: MouseEvent) => void;
  _handleMouseMove?: (e: MouseEvent) => void;
  _handleMouseUp?: () => void;
  _handleWheel?: (e: WheelEvent) => void;
  _handleContextMenu?: (e: MouseEvent) => void;
  _handleBuildPreview?: (e: MouseEvent) => void;
  _handleBuildConfirm?: (e: MouseEvent) => void;
}

// Extend the core Building type with UI-specific properties
interface Building extends CoreBuilding {
  selected?: boolean;
  kind: string;
  position: { x: number; y: number };
  hp: number;
  stats: {
    maxHp: number;
    attackDamage?: number;
    attackRange?: number;
  };
  selected: boolean;
  isBuilding: boolean;
  buildProgress?: number;
  ownerId: string;
}

interface Player {
  id: string;
  resources: {
    minerals: number;
    gas: number;
  };
}
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

  const [selectedUnit, setSelectedUnit] = useState<ExtendedUnit | null>(null);
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

  // Build mode state
  const [buildMode, setBuildMode] = useState<string | null>(null);
  const [buildPreview, setBuildPreview] = useState<{ x: number; y: number } | null>(null);

  // Top-level function definitions
  const handleRestart = () => {
    if (gameStateRef.current) {
      // Simple reset of game state
      setGameOver(false);
    }
  };

  const handleMainMenu = () => {
    navigate('/');
  };

  const handleTrainUnitCommand = (kind: UnitKind) => {
    if (!gameStateRef.current) return;
    const selectedBuilding = gameStateRef.current.buildings.find(
      (b: CoreBuilding & { selected?: boolean }) => b.selected,
    );
    if (
      !selectedBuilding ||
      selectedBuilding.isBuilding ||
      selectedBuilding.ownerId !== gameStateRef.current.localPlayerId
    ) {
      alert('Please select a completed friendly building');
      return;
    }

    // commandTrainUnit does not exist, commented out for now
  };

  const navigate = useNavigate();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isMounted = true;
    const app = new Application();

    // Wait for container to have dimensions before initializing
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
          // Ensure gameTimeMs property exists and is initialized to 0
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
              const radius = unit.kind === 'worker' ? 0.625 : 0.875; // Logical unit radius
              return distance <= radius;
            });

            if (e.button === 0) {
              // Left click: Select unit
              if (clickedUnit && clickedUnit.ownerId === gameStateRef.current.localPlayerId) {
                commandSelectUnit(gameStateRef.current, clickedUnit.id);
                setSelectedUnit(clickedUnit);
              } else {
                commandDeselectAll(gameStateRef.current);
                setSelectedUnit(null);
              }
            } else if (e.button === 2) {
              // Right click: Move or attack
              e.preventDefault();
              if (clickedUnit && clickedUnit.ownerId !== gameStateRef.current.localPlayerId) {
                // 攻击敌方单位
                commandAttackTarget(gameStateRef.current, clickedUnit.id);
              } else {
                // 检查是否点击了敌方建筑
                const clickedBuilding = gameStateRef.current.buildings.find(
                  (building: CoreBuilding & { selected?: boolean }) => {
                    const dx = building.position.x - worldPos.x;
                    const dy = building.position.y - worldPos.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    return distance <= 1.5; // Building click range
                  },
                );

                if (
                  clickedBuilding &&
                  clickedBuilding.ownerId !== (gameStateRef.current?.localPlayerId || '')
                ) {
                  // 攻击敌方建筑
                  // commandAttackBuilding does not exist, commented out for now
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
              (u: Unit) => u.selected && u.kind === 'worker',
            );
            if (!selectedWorker) return;

            // commandBuildStructure does not exist, commented out for now
            setBuildMode(null);
            setBuildPreview(null);
          };

          // 处理训练单位

          container.addEventListener('mousemove', handleBuildPreview);
          container.addEventListener('click', handleBuildConfirm);

          // Save references for cleanup
          (app as ExtendedApplication)._handleBuildPreview = handleBuildPreview;
          (app as ExtendedApplication)._handleBuildConfirm = handleBuildConfirm;

          container.addEventListener('mousedown', handleMouseDown);
          container.addEventListener('mousemove', handleMouseMove);
          container.addEventListener('mouseup', handleMouseUp);
          container.addEventListener('mouseleave', handleMouseUp);
          container.addEventListener('wheel', handleWheel);
          container.addEventListener('contextmenu', handleContextMenu);

          // Restart game
          const handleRestart = () => {
            if (gameStateRef.current) {
              // Reset game loop state
              // No longer need to reset game loop state
              // Simplified game reset logic
              setGameStatus(null);
              setGameTimeDisplay('00:00');
            }
          };

          // Return to main menu
          const handleMainMenu = () => {
            navigate('/');
          };

          // 游戏循环
          const gameLoop = (currentTime: number) => {
            if (!isMounted || !gameStateRef.current || !sceneRef.current) return;

            const deltaTime = lastFrameTimeRef.current
              ? currentTime - lastFrameTimeRef.current
              : 16; // Assume 16ms for first frame
            lastFrameTimeRef.current = currentTime;

            // 更新游戏状态
            updateGameState(gameStateRef.current, deltaTime);

            // 更新游戏时间显示
            if (gameStateRef.current.gameTimeMs !== undefined) {
              // Simple time formatting
              const seconds = Math.floor(gameStateRef.current.gameTimeMs / 1000);
              const minutes = Math.floor(seconds / 60);
              const remainingSeconds = seconds % 60;
              setGameTimeDisplay(`${minutes}:${remainingSeconds.toString().padStart(2, '0')}`);
            }

            // Check game state
            // No longer check gameStatus property as it doesn't exist in GameState type

            // 更新渲染
            updateScene(sceneRef.current, gameStateRef.current);

            // 更新选中单位信息
            if (gameStateRef.current) {
              const selected = gameStateRef.current.units.find((u: Unit) => u.selected);
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

          // Listen for container size changes
          const resizeObserver = new ResizeObserver(() => {
            if (!isMounted || !app) return;
            const newRect = container.getBoundingClientRect();
            app.renderer.resize(newRect.width, newRect.height);
          });
          resizeObserver.observe(container);

          // 保存引用以便清理
          (app as ExtendedApplication)._resizeObserver = resizeObserver;
          (app as ExtendedApplication)._handleMouseDown = handleMouseDown;
          (app as ExtendedApplication)._handleMouseMove = handleMouseMove;
          (app as ExtendedApplication)._handleMouseUp = handleMouseUp;
          (app as ExtendedApplication)._handleWheel = handleWheel;
          (app as ExtendedApplication)._handleContextMenu = handleContextMenu;
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
        // No longer attempt to access and modify PIXI.js private methods
        const app = appRef.current as ExtendedApplication;
        const resizeObserver = app._resizeObserver;

        if (resizeObserver) {
          resizeObserver.disconnect();
        }
        // No longer attempt to remove PIXI.js default event listeners, let PIXI.js handle cleanup itself

        app.destroy(true);
        appRef.current = null;
      }
    };
  }, []);

  return (
    <div className="game-page" style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      <div className="hud-top">
        <div className="game-time">{gameTimeDisplay}</div>
        <div className="resource-bar">
          <div className="resource-item">
            <div className="resource-icon minerals-icon"></div>
            <span>
              Minerals:{' '}
              {gameStateRef.current?.players.find(
                (p: Player) => p.id === gameStateRef.current?.localPlayerId,
              )?.resources.minerals || 0}
            </span>
          </div>
          <div className="resource-item">
            <div className="resource-icon gas-icon"></div>
            <span>
              Gas:
              {gameStateRef.current?.players.find(
                (p: Player) => p.id === gameStateRef.current?.localPlayerId,
              )?.resources.gas || 0}
            </span>
          </div>
        </div>
      </div>
      <div className="game-layout">
        <div className="game-canvas" ref={containerRef} />
        <aside className="side-panel">
          <h3>Unit/Building Info</h3>
          {selectedUnit ? (
            <div className="selection-info">
              <h3>{selectedUnit.kind === 'worker' ? 'Worker' : 'Marine'}</h3>
              <div className="status-bar">
                <div
                  className="health-bar"
                  style={{ width: `${(selectedUnit.hp / selectedUnit.stats.maxHp) * 100}%` }}
                />
              </div>
              <div className="unit-stats">
                <div>
                  Health: {selectedUnit.hp} / {selectedUnit.stats.maxHp}
                </div>
                {selectedUnit.stats.attackDamage && (
                  <div>Attack: {selectedUnit.stats.attackDamage}</div>
                )}
                {selectedUnit.stats.attackRange && (
                  <div>Attack Range: {selectedUnit.stats.attackRange}</div>
                )}
                {selectedUnit.stats.moveSpeed && (
                  <div>Move Speed: {selectedUnit.stats.moveSpeed}</div>
                )}
              </div>
              {selectedUnit.status === 'moving' && (
                <div style={{ fontSize: '11px', marginTop: '4px', color: '#9ca3af' }}>
                  Status: Moving
                </div>
              )}
              {selectedUnit.status === 'attacking' && (
                <p>
                  <strong>Status:</strong> Attacking
                </p>
              )}
              {selectedUnit.status === 'mining' && (
                <p>
                  <strong>Status:</strong> Mining
                </p>
              )}
              {selectedUnit.carryingResource && (
                <p>
                  <strong>Carrying:</strong>
                  {selectedUnit.carryingResource.amount} units{' '}
                  {selectedUnit.carryingResource.type === 'minerals' ? 'minerals' : 'gas'}
                </p>
              )}

              {/* Build menu - Only show when worker is selected */}
              {selectedUnit.kind === 'worker' && gameStateRef.current && (
                <div className="control-group">
                  <h4>Build Menu</h4>
                  <div className="build-menu">
                    <div
                      className={`build-option ${(gameStateRef.current?.players?.find((p: Player) => p.id === gameStateRef.current?.localPlayerId)?.resources?.minerals || 0) < 100 ? 'disabled' : ''}`}
                      onClick={() => {
                        if (
                          (gameStateRef.current?.players?.find(
                            (p: Player) => p.id === gameStateRef.current?.localPlayerId,
                          )?.resources?.minerals || 0) >= 100
                        ) {
                          setBuildMode('command_center');
                          setBuildPreview(null);
                        }
                      }}
                    >
                      <div className="build-icon">🏢</div>
                      <div className="build-name">Command Center</div>
                      <div className="build-cost">
                        <div className="resource-icon minerals-icon"></div>
                        <span>100</span>
                      </div>
                    </div>

                    <div
                      className={`build-option ${(gameStateRef.current?.players?.find((p: Player) => p.id === gameStateRef.current?.localPlayerId)?.resources?.minerals || 0) < 150 ? 'disabled' : ''}`}
                      onClick={() => {
                        if (
                          (gameStateRef.current?.players?.find(
                            (p: Player) => p.id === gameStateRef.current?.localPlayerId,
                          )?.resources?.minerals || 0) >= 150
                        ) {
                          setBuildMode('barracks');
                          setBuildPreview(null);
                        }
                      }}
                    >
                      <div className="build-icon">🏛️</div>
                      <div className="build-name">Barracks</div>
                      <div className="build-cost">
                        <div className="resource-icon minerals-icon"></div>
                        <span>150</span>
                      </div>
                    </div>

                    <div
                      className={`build-option ${(gameStateRef.current?.players?.find((p: Player) => p.id === gameStateRef.current?.localPlayerId)?.resources?.minerals || 0) < 50 ? 'disabled' : ''}`}
                      onClick={() => {
                        if (
                          (gameStateRef.current?.players?.find(
                            (p: Player) => p.id === gameStateRef.current?.localPlayerId,
                          )?.resources?.minerals || 0) >= 50
                        ) {
                          setBuildMode('mining_facility');
                          setBuildPreview(null);
                        }
                      }}
                    >
                      <div className="build-icon">⛏️</div>
                      <div className="build-name">Mining Facility</div>
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
              <p>No unit selected</p>

              {/* Building info and training menu */}
              {gameStateRef.current &&
                gameStateRef.current.buildings.some(
                  (b: CoreBuilding & { selected?: boolean }) => b.selected,
                ) && (
                  <div>
                    {gameStateRef.current.buildings
                      .filter((b: CoreBuilding & { selected?: boolean }) => b.selected)
                      .map((building: CoreBuilding & { selected?: boolean }) => (
                        <div key={building.id} className="selection-info">
                          <h3>
                            {building.kind === 'command_center'
                              ? 'Command Center'
                              : building.kind === 'barracks'
                                ? 'Barracks'
                                : building.kind === 'mining_facility'
                                  ? 'Mining Facility'
                                  : 'Building'}
                          </h3>
                          <div className="status-bar">
                            <div
                              className="health-bar"
                              style={{ width: `${(building.hp / building.stats.maxHp) * 100}%` }}
                            />
                          </div>
                          <div className="unit-stats">
                            <div>
                              Health: {building.hp} / {building.stats.maxHp}
                            </div>
                            {building.stats.attackDamage && (
                              <div>Attack: {building.stats.attackDamage}</div>
                            )}
                            {building.stats.attackRange && (
                              <div>Attack Range: {building.stats.attackRange}</div>
                            )}
                          </div>
                          {building.isBuilding && (
                            <div className="build-progress">
                              <div className="progress-bar-bg"></div>
                              <div
                                className="progress-bar-fill"
                                style={{ width: `${(building.buildProgress || 0) * 100}%` }}
                              />
                              <div className="progress-text">
                                {Math.round((building.buildProgress || 0) * 100)}%
                              </div>
                            </div>
                          )}

                          {/* Training menu - Only show when barracks is selected */}
                          {building.kind === 'barracks' && !building.isBuilding && (
                            <div className="control-group">
                              <h4>Train Menu</h4>
                              <div className="build-menu">
                                <div
                                  className={`build-option ${(gameStateRef.current?.players?.find((p: Player) => p.id === gameStateRef.current?.localPlayerId)?.resources?.minerals || 0) < 50 ? 'disabled' : ''}`}
                                  onClick={() => {
                                    if (
                                      (gameStateRef.current?.players?.find(
                                        (p: Player) => p.id === gameStateRef.current?.localPlayerId,
                                      )?.resources?.minerals || 0) >= 50
                                    ) {
                                      handleTrainUnitCommand('marine' as UnitKind);
                                    }
                                  }}
                                >
                                  <div className="build-icon">🔫</div>
                                  <div className="build-name">Marine</div>
                                  <div className="build-cost">
                                    <div className="resource-icon minerals-icon"></div>
                                    <span>50</span>
                                  </div>
                                </div>

                                <div
                                  className={`build-option ${(gameStateRef.current?.players?.find((p: Player) => p.id === gameStateRef.current?.localPlayerId)?.resources?.minerals || 0) < 50 ? 'disabled' : ''}`}
                                  onClick={() => {
                                    if (
                                      (gameStateRef.current?.players?.find(
                                        (p: Player) => p.id === gameStateRef.current?.localPlayerId,
                                      )?.resources?.minerals || 0) >= 50
                                    ) {
                                      handleTrainUnitCommand('worker' as UnitKind);
                                    }
                                  }}
                                >
                                  <div className="build-icon">👷</div>
                                  <div className="build-name">Worker</div>
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
          gameStatus={gameStatus}
          onRestart={handleRestart}
          onMainMenu={handleMainMenu}
          gameTime={gameTimeDisplay}
        />
      )}
    </div>
  );
}
