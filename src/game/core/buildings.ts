import type { GameState, Building, Unit, UnitKind } from './types';

// 建筑成本配置
export const BUILDING_COSTS = {
  'town-hall': { minerals: 400, gas: 0 },
  'barracks': { minerals: 150, gas: 0 },
  'defense-tower': { minerals: 100, gas: 50 }
};

// 单位成本配置
export const UNIT_COSTS = {
  'worker': { minerals: 50, gas: 0 },
  'basic-infantry': { minerals: 100, gas: 0 }
};

// 建造时间配置 (毫秒)
export const CONSTRUCTION_TIMES = {
  'town-hall': 6000,
  'barracks': 3000,
  'defense-tower': 2000
};

// 生产时间配置 (毫秒)
export const PRODUCTION_TIMES = {
  'worker': 1500,
  'basic-infantry': 2000
};

/**
 * Check if a structure can be built
 */
export function canBuildStructure(
  gameState: GameState,
  buildingKind: string,
  position: { x: number; y: number },
  playerId: string
): { canBuild: boolean; reason?: string } {
  const player = gameState.players.find(p => p.id === playerId);
  if (!player) {
    return { canBuild: false, reason: 'Player does not exist' };
  }

  // 检查资源
  const cost = BUILDING_COSTS[buildingKind as keyof typeof BUILDING_COSTS];
  if (!cost) {
    return { canBuild: false, reason: 'Unknown building type' };
  }

  if (player.resources.minerals < cost.minerals || player.resources.gas < cost.gas) {
    return { canBuild: false, reason: 'Insufficient resources' };
  }

  // 检查位置是否已被占据
  const occupied = gameState.buildings.some(
    b => Math.abs(b.position.x - position.x) < 1 && Math.abs(b.position.y - position.y) < 1
  ) || gameState.units.some(
    u => Math.abs(u.position.x - position.x) < 0.5 && Math.abs(u.position.y - position.y) < 0.5
  );

  if (occupied) {
    return { canBuild: false, reason: 'Position is occupied' };
  }

  // 检查地形
  if (gameState.map.tiles) {
    const tileX = Math.floor(position.x);
    const tileY = Math.floor(position.y);
    if (tileX >= 0 && tileX < gameState.map.tiles[0].length && 
        tileY >= 0 && tileY < gameState.map.tiles.length) {
      const tile = gameState.map.tiles[tileY][tileX];
      if (!tile.isWalkable) {
        return { canBuild: false, reason: 'Cannot build on this terrain' };
      }
    }
  }

  return { canBuild: true };
}

/**
 * Start building construction
 */
export function startBuilding(
  gameState: GameState,
  buildingKind: string,
  position: { x: number; y: number },
  playerId: string
): Building | null {
  const canBuildCheck = canBuildStructure(gameState, buildingKind, position, playerId);
  if (!canBuildCheck.canBuild) {
    console.log(`Cannot build: ${canBuildCheck.reason}`);
    return null;
  }

  const player = gameState.players.find(p => p.id === playerId);
  const cost = BUILDING_COSTS[buildingKind as keyof typeof BUILDING_COSTS];

  // 扣除资源
  if (player) {
    player.resources.minerals -= cost.minerals;
    player.resources.gas -= cost.gas;
  }

  // 创建建筑
  const newBuilding: Building = {
    id: `building_${Date.now()}_${Math.random()}`,
    ownerId: playerId,
    factionId: player?.factionId || 'protoss',
    kind: buildingKind as any,
    position,
    hp: 1, // 初始生命值
    stats: {
      maxHp: 1000, // 临时值，实际应根据建筑类型设置
    },
    isBuilding: true,
    buildProgress: 0,
    productionQueue: [],
    supplyProvided: buildingKind === 'town-hall' ? 10 : buildingKind === 'barracks' ? 5 : 0
  };

  gameState.buildings.push(newBuilding);
  return newBuilding;
}

/**
 * 更新建筑建造进度
 */
export function updateBuildingProgress(gameState: GameState, deltaTimeMs: number): void {
  gameState.buildings.forEach(building => {
    if (building.isBuilding && building.buildProgress < 100) {
      const buildTime = CONSTRUCTION_TIMES[building.kind as keyof typeof CONSTRUCTION_TIMES];
      building.buildProgress += (deltaTimeMs / buildTime) * 100;
      
      if (building.buildProgress >= 100) {
        building.isBuilding = false;
        building.buildProgress = 100;
        building.hp = building.stats.maxHp; // 建造完成后生命值充满
      } else {
        // 根据建造进度更新生命值
        building.hp = Math.floor((building.buildProgress / 100) * building.stats.maxHp);
      }
    }
  });
}

/**
 * 检查建筑是否可以生产单位
 */
export function canProduceUnit(
  building: Building,
  unitKind: UnitKind,
  playerResources: Record<string, number>
): boolean {
  // 建筑必须建造完成
  if (building.isBuilding) {
    return false;
  }

  // 检查建筑类型是否支持生产该单位
  if (unitKind === 'worker' && building.kind !== 'town-hall') {
    return false;
  }
  if (unitKind === 'basic-infantry' && building.kind !== 'barracks') {
    return false;
  }

  // 检查资源
  const cost = UNIT_COSTS[unitKind];
  if (playerResources.minerals < cost.minerals || playerResources.gas < cost.gas) {
    return false;
  }

  return true;
}

/**
 * 向建筑生产队列添加单位
 */
export function queueUnitProduction(
  gameState: GameState,
  buildingId: string,
  unitKind: UnitKind
): boolean {
  const building = gameState.buildings.find(b => b.id === buildingId);
  if (!building) {
    return false;
  }

  const player = gameState.players.find(p => p.id === building.ownerId);
  if (!player) {
    return false;
  }

  if (!canProduceUnit(building, unitKind, player.resources)) {
    return false;
  }

  // 扣除资源
  const cost = UNIT_COSTS[unitKind];
  player.resources.minerals -= cost.minerals;
  player.resources.gas -= cost.gas;

  // 添加到生产队列
  if (!building.productionQueue) {
    building.productionQueue = [];
  }
  building.productionQueue.push(unitKind);

  // 如果当前没有在生产单位，立即开始生产第一个
  if (!building.producing) {
    startUnitProduction(building);
  }

  return true;
}

/**
 * 开始生产队列中的下一个单位
 */
function startUnitProduction(building: Building): void {
  if (!building.productionQueue || building.productionQueue.length === 0) {
    return;
  }

  const nextUnit = building.productionQueue.shift();
  if (nextUnit) {
    building.producing = {
      type: nextUnit,
      progress: 0
    };
  }
}

/**
 * 更新单位生产进度
 */
export function updateUnitProduction(gameState: GameState, deltaTimeMs: number): void {
  gameState.buildings.forEach(building => {
    if (building.producing) {
      const productionTime = PRODUCTION_TIMES[building.producing.type];
      building.producing.progress += (deltaTimeMs / productionTime) * 100;

      if (building.producing.progress >= 100) {
        // 生产完成，创建单位
        spawnUnit(gameState, building);
        
        // 清除当前生产，开始下一个
        building.producing = undefined;
        startUnitProduction(building);
      }
    }
  });
}

/**
 * Spawn unit near building
 */
function spawnUnit(gameState: GameState, building: Building): void {
  if (!building.producing) return;

  const unitKind = building.producing.type;
  
  // 生成在建筑周围
  const spawnOffset = 1.5; // 距离建筑的偏移量
  const newUnit: Unit = {
    id: `unit_${Date.now()}_${Math.random()}`,
    ownerId: building.ownerId,
    factionId: building.factionId,
    kind: unitKind,
    position: {
      x: building.position.x + (Math.random() > 0.5 ? spawnOffset : -spawnOffset),
      y: building.position.y + (Math.random() > 0.5 ? spawnOffset : -spawnOffset)
    },
    hp: 100, // 临时值
    stats: {
      maxHp: 100,
      moveSpeed: unitKind === 'worker' ? 3 : 2,
      attackDamage: unitKind === 'basic-infantry' ? 10 : undefined,
      attackRange: unitKind === 'basic-infantry' ? 1 : undefined
    }
  };

  gameState.units.push(newUnit);
}

/**
 * Get total supply capacity for player
 */
export function getTotalSupplyCapacity(gameState: GameState, playerId: string): number {
  return gameState.buildings
    .filter(b => b.ownerId === playerId && !b.isBuilding)
    .reduce((total, b) => total + (b.supplyProvided || 0), 0);
}

/**
 * Get current supply used by player
 */
export function getCurrentSupplyUsed(gameState: GameState, playerId: string): number {
  return gameState.units.filter(u => u.ownerId === playerId).length;
}
