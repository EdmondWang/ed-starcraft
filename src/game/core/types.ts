export type FactionId = 'protoss' | 'zerg';

export type ResourceType = 'minerals' | 'gas';
export type TerrainType = 'grass' | 'water' | 'mountain' | 'forest';

export interface Tile {
  terrainType: TerrainType;
  isWalkable: boolean;
}

export interface Vec2 {
  x: number;
  y: number;
}

export type UnitKind = 'worker' | 'basic-infantry';

export type BuildingKind = 'town-hall' | 'barracks' | 'defense-tower';

export interface UnitStats {
  maxHp: number;
  moveSpeed: number;
  attackDamage?: number;
  attackRange?: number;
}

export interface BuildingStats {
  maxHp: number;
  isDefensive?: boolean;
}

export interface Unit {
  id: string;
  ownerId: string;
  factionId: FactionId;
  kind: UnitKind;
  position: Vec2;
  hp: number;
  stats: UnitStats;
  selected?: boolean;
  moveTarget?: Vec2; // 移动目标位置
  attackTargetId?: string; // 攻击目标单位ID
  attackCooldown?: number; // 攻击冷却时间（毫秒）
  gatheringTargetId?: string; // 资源采集目标ID
  gatheringProgress?: number; // 资源采集进度（毫秒）
  carryingResource?: { type: ResourceType; amount: number }; // 携带的资源
}

export interface Building {
  id: string;
  ownerId: string;
  factionId: FactionId;
  kind: BuildingKind;
  position: Vec2;
  hp: number;
  stats: BuildingStats;
  isTownHall?: boolean;
  isBuilding: boolean; // 是否正在建造中
  buildProgress: number; // 建造进度 (0-100)
  producing?: {
    type: UnitKind;
    progress: number; // 生产进度 (0-100)
  };
  productionQueue?: UnitKind[]; // 生产队列
  supplyProvided?: number; // 提供的补给人口
}

export interface ResourceNode {
  id: string;
  type: ResourceType;
  position: Vec2;
  amount: number;
}

export interface PlayerState {
  id: string;
  name: string;
  factionId: FactionId;
  resources: Record<ResourceType, number>;
}

export interface GameMap {
  id: string;
  name: string;
  size: Vec2;
  playerSpawnPoints: Vec2[];
  resourceNodes: ResourceNode[];
  tiles?: Tile[][]; // 二维数组表示地图瓦片
}

export interface GameState {
  map: GameMap;
  players: PlayerState[];
  units: Unit[];
  buildings: Building[];
  localPlayerId: string;
  isPaused: boolean;
  gameTimeMs: number;
}
