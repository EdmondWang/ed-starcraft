import type { GameMap, ResourceNode, Vec2, Tile, TerrainType } from './types';

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

// 创建地图瓦片数据
function createMapTiles(width: number, height: number): Tile[][] {
  const tiles: Tile[][] = [];
  
  // 默认都是草地
  for (let y = 0; y < height; y++) {
    tiles[y] = [];
    for (let x = 0; x < width; x++) {
      tiles[y][x] = {
        terrainType: 'grass',
        isWalkable: true
      };
    }
  }
  
  // 添加一些水域
  for (let x = 70; x < 90; x++) {
    for (let y = 30; y < 60; y++) {
      tiles[y][x] = {
        terrainType: 'water',
        isWalkable: false
      };
    }
  }
  
  // 添加一些森林
  for (let x = 40; x < 60; x++) {
    for (let y = 10; y < 30; y++) {
      tiles[y][x] = {
        terrainType: 'forest',
        isWalkable: true
      };
    }
  }
  
  for (let x = 100; x < 120; x++) {
    for (let y = 10; y < 30; y++) {
      tiles[y][x] = {
        terrainType: 'forest',
        isWalkable: true
      };
    }
  }
  
  return tiles;
}

// 缩放地图瓦片到逻辑坐标
const TILE_RESOLUTION = 1; // 每个逻辑单位对应一个瓦片
const tileMap = createMapTiles(mapSize.x / TILE_RESOLUTION, mapSize.y / TILE_RESOLUTION);

export const simpleMap: GameMap = {
  id: 'simple-01',
  name: 'Simple Duel',
  size: mapSize,
  playerSpawnPoints: [
    { x: 24, y: 45 },
    { x: 136, y: 45 },
  ],
  resourceNodes,
  tiles: tileMap
};


