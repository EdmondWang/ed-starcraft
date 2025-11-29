import type {
  Building,
  BuildingKind,
  BuildingStats,
  FactionId,
  GameState,
  PlayerState,
  ResourceType,
  Unit,
  UnitKind,
  UnitStats,
  Vec2,
} from './types';
import { simpleMap } from './simpleMap';

function createPlayer(id: string, name: string, factionId: FactionId): PlayerState {
  const zeroResources: Record<ResourceType, number> = {
    minerals: 50,
    gas: 0,
  };

  return {
    id,
    name,
    factionId,
    resources: zeroResources,
  };
}

const baseTownHallStats: BuildingStats = {
  maxHp: 1500,
};

const baseBarracksStats: BuildingStats = {
  maxHp: 1000,
};

const baseWorkerStats: UnitStats = {
  maxHp: 40,
  moveSpeed: 2.5,
};

const baseInfantryStats: UnitStats = {
  maxHp: 60,
  moveSpeed: 2.2,
  attackDamage: 6,
  attackRange: 4,
};

function createBuilding(
  id: string,
  ownerId: string,
  factionId: FactionId,
  kind: BuildingKind,
  position: Vec2,
): Building {
  const statsByKind: Record<BuildingKind, BuildingStats> = {
    'town-hall': baseTownHallStats,
    barracks: baseBarracksStats,
    'defense-tower': {
      maxHp: 800,
      isDefensive: true,
    },
  };

  const stats = statsByKind[kind];

  return {
    id,
    ownerId,
    factionId,
    kind,
    position,
    hp: stats.maxHp,
    stats,
    isTownHall: kind === 'town-hall',
    isBuilding: false,
    buildProgress: 100,
  };
}

function createUnit(
  id: string,
  ownerId: string,
  factionId: FactionId,
  kind: UnitKind,
  position: Vec2,
): Unit {
  const statsByKind: Record<UnitKind, UnitStats> = {
    worker: baseWorkerStats,
    'basic-infantry': baseInfantryStats,
  };

  const stats = statsByKind[kind];

  return {
    id,
    ownerId,
    factionId,
    kind,
    position,
    hp: stats.maxHp,
    stats,
  };
}

export function createInitialGameState(): GameState {
  const players: PlayerState[] = [
    createPlayer('p1', 'Player', 'protoss'),
    createPlayer('p2', 'AI', 'zerg'),
  ];

  const [p1Spawn, p2Spawn] = simpleMap.playerSpawnPoints;

  const buildings: Building[] = [
    createBuilding('b-p1-townhall', 'p1', 'protoss', 'town-hall', p1Spawn),
    createBuilding('b-p2-townhall', 'p2', 'zerg', 'town-hall', p2Spawn),
  ];

  const units: Unit[] = [
    // P1 单位
    createUnit('u-p1-worker-1', 'p1', 'protoss', 'worker', { x: p1Spawn.x + 4, y: p1Spawn.y + 2 }),
    createUnit('u-p1-worker-2', 'p1', 'protoss', 'worker', { x: p1Spawn.x - 3, y: p1Spawn.y - 2 }),
    createUnit('u-p1-infantry-1', 'p1', 'protoss', 'basic-infantry', {
      x: p1Spawn.x + 6,
      y: p1Spawn.y,
    }),
    createUnit('u-p1-infantry-2', 'p1', 'protoss', 'basic-infantry', {
      x: p1Spawn.x + 8,
      y: p1Spawn.y,
    }),
    // P2 单位
    createUnit('u-p2-worker-1', 'p2', 'zerg', 'worker', { x: p2Spawn.x - 4, y: p2Spawn.y + 1 }),
    createUnit('u-p2-infantry-1', 'p2', 'zerg', 'basic-infantry', {
      x: p2Spawn.x - 6,
      y: p2Spawn.y,
    }),
    createUnit('u-p2-infantry-2', 'p2', 'zerg', 'basic-infantry', {
      x: p2Spawn.x - 8,
      y: p2Spawn.y,
    }),
  ];

  const initialState: GameState = {
    map: simpleMap,
    players,
    units,
    buildings,
    localPlayerId: 'p1',
    isPaused: false,
    gameTimeMs: 0,
  };

  return initialState;
}
