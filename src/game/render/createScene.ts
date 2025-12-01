import { Container, Graphics, Text } from 'pixi.js';
import type { GameState, ResourceNode, Unit, Building, Tile } from '../core/types';
// Remove non-existent CameraState import
import { factionColors, resourceColor, mapBackgroundColor } from './colors';

const TILE_SIZE = 8; // pixels per logical unit

// Terrain color mapping
const terrainColors: Record<string, number> = {
  grass: 0x22c55e,
  water: 0x0ea5e9,
  mountain: 0x6b7280,
  forest: 0x15803d,
};

export interface SceneData {
  root: Container;
  mapLayer: Container;
  resourceLayer: Container;
  buildingLayer: Container;
  unitLayer: Container;
  selectionLayer: Container;
  unitGraphics: Map<string, Graphics>;
  buildingGraphics: Map<string, Graphics>;
  selectionGraphics: Map<string, Graphics>;
}

function toScreen(
  x: number,
  y: number,
  cameraX: number,
  cameraY: number,
  zoom: number,
): { x: number; y: number } {
  const screenX = (x - cameraX) * TILE_SIZE * zoom;
  const screenY = (y - cameraY) * TILE_SIZE * zoom;
  return { x: screenX, y: screenY };
}

function drawMapBackground(
  mapContainer: Container,
  state: GameState,
  cameraX: number,
  cameraY: number,
  zoom: number,
) {
  const g = new Graphics();

  // Clear existing content
  mapContainer.removeChildren();

  // If tile data exists, render tiles
  if (state.map.tiles) {
    const tileSize = TILE_SIZE * zoom;
    // Render tiles in a range around the camera
    const startX = Math.floor(cameraX - 30); // Increase render range to 30 to show more units
    const startY = Math.floor(cameraY - 30);
    const endX = Math.ceil(cameraX + 30);
    const endY = Math.ceil(cameraY + 30);

    for (let y = Math.max(0, startY); y < Math.min(state.map.tiles.length, endY); y++) {
      for (let x = Math.max(0, startX); x < Math.min(state.map.tiles[y].length, endX); x++) {
        const tile = state.map.tiles[y][x];
        const screenPos = toScreen(x, y, cameraX, cameraY, zoom);

        // 绘制瓦片
        g.rect(screenPos.x, screenPos.y, tileSize, tileSize);
        g.fill(terrainColors[tile.terrainType] || mapBackgroundColor);

        // 为不可行走的地形添加边框
        if (!tile.isWalkable) {
          g.stroke({ color: 0x000000, width: 1, alpha: 0.8 });
        } else {
          // 为可行走的地形添加浅色边框
          g.stroke({ color: 0xffffff, width: 0.5, alpha: 0.2 });
        }
      }
    }
  } else {
    // 回退到简单背景
    const width = state.map.size.x * TILE_SIZE * zoom;
    const height = state.map.size.y * TILE_SIZE * zoom;
    const centerX = -cameraX * TILE_SIZE * zoom + mapContainer.width / 2;
    const centerY = -cameraY * TILE_SIZE * zoom + mapContainer.height / 2;

    g.rect(centerX - width / 2, centerY - height / 2, width, height);
    g.fill(mapBackgroundColor);
    g.stroke({ color: 0x1f2937, width: 1, alpha: 0.6 });
  }

  mapContainer.addChild(g);
}

function drawResourceNode(
  container: Container,
  node: ResourceNode,
  cameraX: number,
  cameraY: number,
  zoom: number,
) {
  const g = new Graphics();
  const pos = toScreen(node.position.x, node.position.y, cameraX, cameraY, zoom);
  const radius = 6 * zoom;

  g.circle(pos.x, pos.y, radius);
  g.fill(resourceColor);
  g.stroke({ color: 0x16a34a, width: 1.5 });

  container.addChild(g);
}

function createUnitGraphics(unit: Unit, cameraX: number, cameraY: number, zoom: number): Graphics {
  const g = new Graphics();
  const pos = toScreen(unit.position.x, unit.position.y, cameraX, cameraY, zoom);
  const color = factionColors[unit.factionId];
  const baseRadius = unit.kind === 'worker' ? 5 : 7;
  const radius = baseRadius * zoom;

  g.circle(pos.x, pos.y, radius);
  g.fill(color);
  g.stroke({ color: 0x000000, width: 1.5, alpha: 0.7 });

  // 显示携带资源状态
  if (unit.carryingResource) {
    g.circle(pos.x, pos.y, radius - 1 * zoom);
    g.fill(resourceColor);
    g.stroke({ color: 0x000000, width: 1, alpha: 0.5 });
  }

  return g;
}

function createBuildingGraphics(
  building: Building,
  cameraX: number,
  cameraY: number,
  zoom: number,
): Graphics {
  const g = new Graphics();
  const pos = toScreen(building.position.x, building.position.y, cameraX, cameraY, zoom);
  const baseColor = factionColors[building.factionId];
  // Building should always display faction color, isBuilding property only identifies it as a building object
  const color = baseColor;
  const baseSize = building.isTownHall ? 14 : 10;
  const size = baseSize * zoom;

  g.roundRect(pos.x - size, pos.y - size, size * 2, size * 2, 4);
  g.fill(color);
  g.stroke({ color: 0x000000, width: 2, alpha: 0.7 });

  // 建造进度条
  if (building.isBuilding && 'buildProgress' in building) {
    const barWidth = size * 2;
    const barHeight = 2 * zoom;
    const barX = pos.x - size;
    const barY = pos.y - size - barHeight * 2;

    // 背景条
    g.rect(barX, barY, barWidth, barHeight);
    g.fill(0x000000);

    // 进度条
    g.rect(barX, barY, barWidth * (building.buildProgress / 100), barHeight);
    g.fill(0x00ffff);
  }

  // 生产进度条
  if (building.producing && 'progress' in building.producing) {
    const barWidth = size * 2;
    const barHeight = 2 * zoom;
    const barX = pos.x - size;
    const barY = pos.y + size + barHeight;

    // 背景条
    g.rect(barX, barY, barWidth, barHeight);
    g.fill(0x000000);

    // 进度条
    g.rect(barX, barY, barWidth * (building.producing.progress / 100), barHeight);
    g.fill(0xff00ff);
  }

  // 生命值条
  if ('hp' in building && 'stats' in building && 'maxHp' in building.stats) {
    const hpRatio = building.hp / building.stats.maxHp;
    const barWidth = size * 2;
    const barHeight = 2 * zoom;
    const barX = pos.x - size;
    const barY = pos.y - size - barHeight * 4;

    // 背景条
    g.rect(barX, barY, barWidth, barHeight);
    g.fill(0x000000);

    // 生命值条
    const hpColor = hpRatio > 0.5 ? 0x00ff00 : hpRatio > 0.25 ? 0xffff00 : 0xff0000;
    g.rect(barX, barY, barWidth * hpRatio, barHeight);
    g.fill(hpColor);
  }

  return g;
}

function createSelectionHighlight(
  unit: Unit,
  cameraX: number,
  cameraY: number,
  zoom: number,
): Graphics {
  const g = new Graphics();
  const pos = toScreen(unit.position.x, unit.position.y, cameraX, cameraY, zoom);
  const baseRadius = unit.kind === 'worker' ? 5 : 7;
  const radius = (baseRadius + 3) * zoom;

  g.circle(pos.x, pos.y, radius);
  g.stroke({ color: 0xffff00, width: 2, alpha: 0.8 });

  return g;
}

export function createScene(state: GameState): Container {
  const sceneData: SceneData = {
    root: new Container(),
    mapLayer: new Container(),
    resourceLayer: new Container(),
    buildingLayer: new Container(),
    unitLayer: new Container(),
    selectionLayer: new Container(),
    unitGraphics: new Map(),
    buildingGraphics: new Map(),
    selectionGraphics: new Map(),
  };

  sceneData.root.sortableChildren = true;
  sceneData.root.addChild(
    sceneData.mapLayer,
    sceneData.resourceLayer,
    sceneData.buildingLayer,
    sceneData.unitLayer,
    sceneData.selectionLayer,
  );

  // Initial camera position set to local player's spawn point instead of map center
  const localPlayerSpawn = state.map.playerSpawnPoints[0]; // Assume first spawn point is local player
  const cameraX = localPlayerSpawn.x;
  const cameraY = localPlayerSpawn.y;
  const zoom = 1.5; // Increase zoom to see units and buildings more clearly

  drawMapBackground(sceneData.mapLayer, state, cameraX, cameraY, zoom);

  state.map.resourceNodes.forEach((node) =>
    drawResourceNode(sceneData.resourceLayer, node, cameraX, cameraY, zoom),
  );

  state.buildings.forEach((building) => {
    const g = createBuildingGraphics(building, cameraX, cameraY, zoom);
    sceneData.buildingGraphics.set(building.id, g);
    sceneData.buildingLayer.addChild(g);
  });

  state.units.forEach((unit) => {
    const g = createUnitGraphics(unit, cameraX, cameraY, zoom);
    sceneData.unitGraphics.set(unit.id, g);
    sceneData.unitLayer.addChild(g);
  });

  // Save sceneData and camera state to root's userData
  (
    sceneData.root as Container & {
      __sceneData?: SceneData;
      __camera?: { x: number; y: number; zoom: number };
    }
  ).__sceneData = sceneData;

  (
    sceneData.root as Container & {
      __sceneData?: SceneData;
      __camera?: { x: number; y: number; zoom: number };
    }
  ).__camera = { x: cameraX, y: cameraY, zoom };

  return sceneData.root;
}

export function updateScene(root: Container, state: GameState): void {
  const sceneData: SceneData | undefined = (root as Container & { __sceneData?: SceneData })
    .__sceneData;
  const camera: { x: number; y: number; zoom: number } | undefined = (
    root as Container & {
      __camera?: { x: number; y: number; zoom: number };
    }
  ).__camera;

  if (!sceneData || !camera) return;

  // 更新地图背景
  drawMapBackground(sceneData.mapLayer, state, camera.x, camera.y, camera.zoom);

  // Update resource nodes
  sceneData.resourceLayer.removeChildren();
  state.map.resourceNodes.forEach((node) => {
    // Only render resource nodes within camera view
    const distanceX = Math.abs(node.position.x - camera.x);
    const distanceY = Math.abs(node.position.y - camera.y);
    const visibleRadius = 40 / camera.zoom; // Increase visible radius to show more nodes

    if (distanceX < visibleRadius && distanceY < visibleRadius) {
      drawResourceNode(sceneData.resourceLayer, node, camera.x, camera.y, camera.zoom);
    }
  });

  // Update buildings
  sceneData.buildingLayer.removeChildren();
  sceneData.buildingGraphics.clear();
  state.buildings.forEach((building) => {
    // Only render buildings within camera view
    const distanceX = Math.abs(building.position.x - camera.x);
    const distanceY = Math.abs(building.position.y - camera.y);
    const visibleRadius = 40 / camera.zoom; // Increase visible radius to show more buildings

    if (distanceX < visibleRadius && distanceY < visibleRadius) {
      const g = createBuildingGraphics(building, camera.x, camera.y, camera.zoom);
      sceneData.buildingGraphics.set(building.id, g);
      sceneData.buildingLayer.addChild(g);
    }
  });

  // Update unit positions and selection states
  sceneData.unitLayer.removeChildren();
  sceneData.unitGraphics.clear();
  sceneData.selectionLayer.removeChildren();
  sceneData.selectionGraphics.clear();

  state.units.forEach((unit) => {
    // Only render units within camera view
    const distanceX = Math.abs(unit.position.x - camera.x);
    const distanceY = Math.abs(unit.position.y - camera.y);
    const visibleRadius = 40 / camera.zoom; // Increase visible radius to show more units

    if (distanceX < visibleRadius && distanceY < visibleRadius) {
      const g = createUnitGraphics(unit, camera.x, camera.y, camera.zoom);
      sceneData.unitGraphics.set(unit.id, g);
      sceneData.unitLayer.addChild(g);

      // Update selection highlight
      if (unit.selected) {
        const sel = createSelectionHighlight(unit, camera.x, camera.y, camera.zoom);
        sceneData.selectionGraphics.set(unit.id, sel);
        sceneData.selectionLayer.addChild(sel);
      }
    }
  });
}
