import type { GameState, Unit, Building, Vec2 } from './types';
import { startBuilding, queueUnitProduction } from './buildings';
import { setUnitMoveTarget } from './movement';
import { setUnitAttackTarget } from './combat';

/**
 * 命令移动选中的单位
 */
export function commandMoveSelectedUnits(
  gameState: GameState,
  targetPos: { x: number; y: number },
): void {
  const selectedUnits = gameState.units.filter(
    (unit) => unit.selected && unit.ownerId === gameState.localPlayerId,
  );

  // 检查目标位置是否有资源节点
  const resourceNode = gameState.map.resourceNodes.find(
    (node) =>
      Math.abs(node.position.x - targetPos.x) < 1 && Math.abs(node.position.y - targetPos.y) < 1,
  );

  selectedUnits.forEach((unit) => {
    if (resourceNode && unit.kind === 'worker') {
      // 如果是工人点击资源节点，开始采集
      unit.gatheringTargetId = resourceNode.id;
      unit.gatheringProgress = 0;
      unit.moveTarget = undefined;
      unit.attackTargetId = undefined;
    } else {
      // 否则移动到目标位置
      setUnitMoveTarget(unit, targetPos);
    }
  });
}

/**
 * 命令建造建筑
 */
export function commandBuildStructure(
  gameState: GameState,
  buildingKind: string,
  targetPos: { x: number; y: number },
): Building | null {
  // 确保有选中的工人
  const selectedWorkers = gameState.units.filter(
    (unit) => unit.selected && unit.ownerId === gameState.localPlayerId && unit.kind === 'worker',
  );

  if (selectedWorkers.length === 0) {
    console.log('需要选中工人来建造建筑');
    return null;
  }

  // 开始建造
  return startBuilding(gameState, buildingKind, targetPos, gameState.localPlayerId);
}

/**
 * 命令建筑生产单位
 */
export function commandTrainUnit(
  gameState: GameState,
  buildingId: string,
  unitKind: string,
): boolean {
  return queueUnitProduction(gameState, buildingId, unitKind as any);
}

/**
 * 右键点击单位：攻击目标
 */
export function commandAttackTarget(state: GameState, targetUnitId: string): void {
  const selectedUnits = state.units.filter(
    (u) => u.selected && u.ownerId === state.localPlayerId && u.hp > 0,
  );

  const targetUnit = state.units.find((u) => u.id === targetUnitId);
  if (!targetUnit || targetUnit.hp <= 0) return;

  // 检查是否是敌方单位
  const isEnemy = targetUnit.ownerId !== state.localPlayerId;
  if (!isEnemy) return;

  // 检查选中单位是否有攻击能力
  selectedUnits.forEach((unit) => {
    if (unit.stats.attackDamage && unit.stats.attackRange) {
      setUnitAttackTarget(unit, targetUnitId);
    }
  });
}

/**
 * Right click building: Attack target building
 */
export function commandAttackBuilding(state: GameState, targetBuildingId: string): void {
  const selectedUnits = state.units.filter(
    (u) => u.selected && u.ownerId === state.localPlayerId && u.hp > 0,
  );

  const targetBuilding = state.buildings.find((b) => b.id === targetBuildingId);
  if (!targetBuilding || targetBuilding.hp <= 0) return;

  // 检查是否是敌方建筑
  const isEnemy = targetBuilding.ownerId !== state.localPlayerId;
  if (!isEnemy) return;

  // 命令单位攻击建筑
  selectedUnits.forEach((unit) => {
    if (unit.stats.attackDamage && unit.stats.attackRange) {
      // 移动到建筑附近，同时设置攻击目标
      setUnitMoveTarget(unit, targetBuilding.position);
      unit.attackTargetId = targetBuildingId; // 设置攻击目标为建筑
    }
  });
}

/**
 * 左键点击：选择单位
 */
export function commandSelectUnit(state: GameState, unitId: string): void {
  const unit = state.units.find((u) => u.id === unitId);
  if (!unit || unit.ownerId !== state.localPlayerId) return;

  // 清除所有选中状态
  state.units.forEach((u) => {
    u.selected = false;
  });

  // 选中目标单位
  unit.selected = true;
}

/**
 * Left click empty space: Deselect all
 */
export function commandDeselectAll(state: GameState): void {
  state.units.forEach((u) => {
    u.selected = false;
  });
}

/**
 * Convert screen coordinates to world coordinates
 */
export function screenToWorld(
  screenX: number,
  screenY: number,
  cameraX: number,
  cameraY: number,
  tileSize: number,
  cameraZoom: number = 1,
): { x: number; y: number } {
  return {
    x: screenX / (tileSize * cameraZoom) + cameraX,
    y: screenY / (tileSize * cameraZoom) + cameraY,
  };
}

/**
 * Convert world coordinates to screen coordinates
 */
export function worldToScreen(
  worldX: number,
  worldY: number,
  cameraX: number,
  cameraY: number,
  tileSize: number,
  cameraZoom: number = 1,
): Vec2 {
  return {
    x: (worldX - cameraX) * tileSize * cameraZoom,
    y: (worldY - cameraY) * tileSize * cameraZoom,
  };
}
