import type { GameMap, ResourceNode, Vec2 } from './types';

const mapSize: Vec2 = { x: 160, y: 90 };

const resourceNodes: ResourceNode[] = [
  {
    id: 'res-1',
    type: 'minerals',
    position: { x: 40, y: 45 },
    amount: 2000,
  },
  {
    id: 'res-2',
    type: 'minerals',
    position: { x: 120, y: 45 },
    amount: 2000,
  },
];

export const simpleMap: GameMap = {
  id: 'simple-01',
  name: 'Simple Duel',
  size: mapSize,
  playerSpawnPoints: [
    { x: 24, y: 45 },
    { x: 136, y: 45 },
  ],
  resourceNodes,
};


