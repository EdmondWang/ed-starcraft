import type { GameState, Building, FactionId } from './types';
import { BuildingKind } from './types';

// Game status enum
export enum GameStatus {
  IN_PROGRESS,
  VICTORY,
  DEFEAT,
  DRAW,
}

// Game phase enum
export enum GamePhase {
  PREPARATION,
  BATTLE,
  ENDING,
}

/**
 * 检查游戏胜利条件
 * @param gameState 当前游戏状态
 * @returns 更新后的游戏状态（包含最新的游戏状态）
 */
export function checkVictoryConditions(gameState: GameState): GameState {
  const localPlayer = gameState.players.find((p) => p.id === gameState.localPlayerId);
  if (!localPlayer) return gameState;

  // Check if player still has command center
  const hasCommandCenter = gameState.buildings.some(
    (b) =>
      b.ownerId === localPlayer.id && b.kind === ('command_center' as BuildingKind) && b.hp > 0,
  );

  // Check if enemies still have command centers
  const enemyCommandCenters = gameState.buildings.filter(
    (b) =>
      b.ownerId !== localPlayer.id && b.kind === ('command_center' as BuildingKind) && b.hp > 0,
  );

  // Check if player has any alive units or buildings
  const hasAliveUnits = gameState.units.some((u) => u.ownerId === localPlayer.id && u.hp > 0);
  const hasAliveBuildings = gameState.buildings.some(
    (b) => b.ownerId === localPlayer.id && b.hp > 0,
  );

  // Update game state
  if (!hasCommandCenter && !hasAliveUnits && !hasAliveBuildings) {
    // Player has no surviving units or buildings - defeat
    // No longer setting non-existent gameStatus and gamePhase properties
  } else if (enemyCommandCenters.length === 0) {
    // All enemy command centers destroyed - victory
    // No longer setting non-existent gameStatus and gamePhase properties
  }

  return gameState;
}

/**
 * 初始化游戏状态
 * @param playerName 玩家名称
 * @returns 初始化后的游戏状态
 */
export function initializeGameState(playerName: string = 'Player'): GameState {
  const localPlayerId = 'player-1';
  const enemyPlayerId = 'player-2';

  return {
    localPlayerId,
    players: [
      {
        id: localPlayerId,
        name: 'Player',
        resources: {
          minerals: 50,
          gas: 0,
        },
        factionId: 'terran' as FactionId,
      },
      {
        id: enemyPlayerId,
        name: 'Computer',
        resources: {
          minerals: 50,
          gas: 0,
        },
        factionId: 'terran' as FactionId,
      },
    ],
    units: [
      // Initial worker
      {
        id: 'unit-1',
        ownerId: localPlayerId,
        factionId: 'terran' as FactionId,
        kind: 'worker',
        position: { x: 5, y: 5 },
        hp: 45,
        stats: {
          maxHp: 45,
          attackDamage: 5,
          attackRange: 1.5,
          moveSpeed: 1.2,
        },
        moveTarget: undefined,
        attackTargetId: undefined,
        gatheringTargetId: undefined,
        carryingResource: undefined,
      },
    ],
    buildings: [
      // Initial command center
      {
        id: 'building-1',
        ownerId: localPlayerId,
        factionId: 'terran' as FactionId,
        kind: 'command_center' as BuildingKind,
        position: { x: 4, y: 4 },
        hp: 1500,
        stats: {
          maxHp: 1500,
        },
        isBuilding: false,
        buildProgress: 100,
      },
      // Enemy command center
      {
        id: 'building-2',
        ownerId: enemyPlayerId,
        factionId: 'terran' as FactionId,
        kind: 'command_center' as BuildingKind,
        position: { x: 25, y: 25 },
        hp: 1500,
        stats: {
          maxHp: 1500,
        },
        isBuilding: false,
        buildProgress: 100,
      },
    ],
    // Game time (milliseconds)
    gameTimeMs: 0,
    // Add missing properties
    map: {
      id: 'default-map',
      name: 'Default Map',
      size: { x: 30, y: 30 },
      playerSpawnPoints: [
        { x: 4, y: 4 },
        { x: 25, y: 25 },
      ],
      resourceNodes: [],
    },
    isPaused: false,
  };
}

/**
 * 更新游戏状态，包括资源增长、单位生产进度等
 * @param gameState 当前游戏状态
 * @param deltaTimeMs 时间增量（毫秒）
 * @returns 更新后的游戏状态
 */
export function updateGameState(gameState: GameState, deltaTimeMs: number): GameState {
  // 更新游戏时间
  gameState.gameTimeMs = (gameState.gameTimeMs || 0) + deltaTimeMs;

  // 检查胜利条件
  checkVictoryConditions(gameState);

  // Auto-collect resources (bases generate 10 minerals per minute)
  const resourceGenerationInterval = 60000; // 60 seconds
  if (gameState.gameTimeMs % resourceGenerationInterval < deltaTimeMs) {
    gameState.players.forEach((player) => {
      // Check if player has command center
      const hasCommandCenter = gameState.buildings.some(
        (b) => b.ownerId === player.id && b.kind === ('command_center' as BuildingKind) && b.hp > 0,
      );

      if (hasCommandCenter) {
        player.resources.minerals += 10;
      }
    });
  }

  return gameState;
}

/**
 * 获取游戏时间格式化显示
 * @param gameTimeMs 游戏时间（毫秒）
 * @returns 格式化后的时间字符串（MM:SS）
 */
export function formatGameTime(gameTimeMs: number): string {
  const totalSeconds = Math.floor(gameTimeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * 重置游戏状态
 * @param gameState 当前游戏状态
 * @returns 重置后的游戏状态
 */
export function resetGameState(gameState: GameState): GameState {
  const localPlayer = gameState.players.find((p) => p.id === gameState.localPlayerId);
  return initializeGameState(localPlayer?.name || 'Player');
}
