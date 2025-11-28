export type FactionId = 'protoss' | 'zerg';

export type ResourceType = 'minerals' | 'gas';

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


