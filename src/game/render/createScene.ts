import { Container, Graphics } from 'pixi.js';
import type { GameState, ResourceNode, Unit, Building } from '../core/types';
import { factionColors, resourceColor, mapBackgroundColor } from './colors';

const TILE_SIZE = 8; // pixels per logical unit

function toScreen(x: number, y: number): { x: number; y: number } {
  return { x: x * TILE_SIZE, y: y * TILE_SIZE };
}

function drawMapBackground(mapContainer: Container, state: GameState) {
  const g = new Graphics();
  const width = state.map.size.x * TILE_SIZE;
  const height = state.map.size.y * TILE_SIZE;

  g.rect(0, 0, width, height);
  g.fill(mapBackgroundColor);
  g.stroke({ color: 0x1f2937, width: 1, alpha: 0.6 });

  mapContainer.addChild(g);
}

function drawResourceNode(container: Container, node: ResourceNode) {
  const g = new Graphics();
  const pos = toScreen(node.position.x, node.position.y);

  g.circle(pos.x, pos.y, 6);
  g.fill(resourceColor);
  g.stroke({ color: 0x16a34a, width: 1.5 });

  container.addChild(g);
}

function drawBuilding(container: Container, building: Building) {
  const g = new Graphics();
  const pos = toScreen(building.position.x, building.position.y);
  const color = factionColors[building.factionId];
  const size = building.isTownHall ? 14 : 10;

  g.roundRect(pos.x - size, pos.y - size, size * 2, size * 2, 4);
  g.fill(color);
  g.stroke({ color: 0x000000, width: 2, alpha: 0.7 });

  container.addChild(g);
}

function drawUnit(container: Container, unit: Unit) {
  const g = new Graphics();
  const pos = toScreen(unit.position.x, unit.position.y);
  const color = factionColors[unit.factionId];
  const radius = unit.kind === 'worker' ? 5 : 7;

  g.circle(pos.x, pos.y, radius);
  g.fill(color);
  g.stroke({ color: 0x000000, width: 1.5, alpha: 0.7 });

  container.addChild(g);
}

export function createScene(state: GameState): Container {
  const root = new Container();
  root.sortableChildren = true;

  const mapLayer = new Container();
  const resourceLayer = new Container();
  const buildingLayer = new Container();
  const unitLayer = new Container();

  root.addChild(mapLayer, resourceLayer, buildingLayer, unitLayer);

  drawMapBackground(mapLayer, state);

  state.map.resourceNodes.forEach((node) => drawResourceNode(resourceLayer, node));
  state.buildings.forEach((b) => drawBuilding(buildingLayer, b));
  state.units.forEach((u) => drawUnit(unitLayer, u));

  return root;
}


