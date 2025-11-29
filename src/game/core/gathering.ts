import type { GameState, Unit, ResourceNode } from './types';

const GATHERING_TIME_MS = 3000; // 每次采集需要3秒
const CARRY_CAPACITY = 8; // 工人携带容量
const DEPOSIT_TIME_MS = 1000; // 资源交付需要1秒

/**
 * 更新单位的资源采集行为
 */
export function updateUnitGathering(unit: Unit, gameState: GameState, deltaTimeMs: number): void {
  // 只有工人可以采集资源
  if (unit.kind !== 'worker') return;
  
  // 如果正在携带资源，需要返回主基地交付
  if (unit.carryingResource) {
    updateReturningToDeposit(unit, gameState, deltaTimeMs);
    return;
  }
  
  // 如果有采集目标，继续采集
  if (unit.gatheringTargetId) {
    updateGatheringResource(unit, gameState, deltaTimeMs);
    return;
  }
}

/**
 * 开始采集资源
 */
export function startGathering(unit: Unit, resourceNodeId: string): void {
  if (unit.kind !== 'worker') return;
  
  unit.gatheringTargetId = resourceNodeId;
  unit.gatheringProgress = 0;
  unit.moveTarget = undefined;
  unit.attackTargetId = undefined;
}

/**
 * 更新资源采集进度
 */
function updateGatheringResource(unit: Unit, gameState: GameState, deltaTimeMs: number): void {
  const resourceNode = gameState.map.resourceNodes.find(node => node.id === unit.gatheringTargetId);
  if (!resourceNode || resourceNode.amount <= 0) {
    // 资源点枯竭
    unit.gatheringTargetId = undefined;
    unit.gatheringProgress = undefined;
    return;
  }
  
  // 检查是否在资源点附近
  const distance = getDistance(unit.position, resourceNode.position);
  if (distance > 2) { // 资源采集范围
    // 需要移动到资源点
    if (!unit.moveTarget) {
      unit.moveTarget = { ...resourceNode.position };
    }
    return;
  }
  
  // 停止移动，开始采集
  unit.moveTarget = undefined;
  
  // 更新采集进度
  unit.gatheringProgress = (unit.gatheringProgress || 0) + deltaTimeMs;
  
  // 采集完成
  if (unit.gatheringProgress >= GATHERING_TIME_MS) {
    const gatherAmount = Math.min(CARRY_CAPACITY, resourceNode.amount);
    
    // 更新资源点数量
    resourceNode.amount -= gatherAmount;
    
    // 设置携带的资源
    unit.carryingResource = {
      type: resourceNode.type,
      amount: gatherAmount
    };
    
    // 清除采集目标
    unit.gatheringTargetId = undefined;
    unit.gatheringProgress = undefined;
    
    // 寻找最近的主基地
    const playerBuildings = gameState.buildings.filter(
      building => building.ownerId === unit.ownerId && building.isTownHall
    );
    
    if (playerBuildings.length > 0) {
      // 移动到最近的主基地
      const nearestTownHall = findNearestBuilding(unit.position, playerBuildings);
      unit.moveTarget = { ...nearestTownHall.position };
    }
  }
}

/**
 * 更新返回交付资源的行为
 */
function updateReturningToDeposit(unit: Unit, gameState: GameState, deltaTimeMs: number): void {
  // 寻找玩家的主基地
  const playerBuildings = gameState.buildings.filter(
    building => building.ownerId === unit.ownerId && building.isTownHall
  );
  
  if (playerBuildings.length === 0) {
    // 没有主基地，无法交付资源
    unit.carryingResource = undefined;
    return;
  }
  
  const nearestTownHall = findNearestBuilding(unit.position, playerBuildings);
  const distance = getDistance(unit.position, nearestTownHall.position);
  
  // 检查是否到达主基地
  if (distance <= 2) { // 交付范围
    // 停止移动
    unit.moveTarget = undefined;
    
    // 交付资源
    const player = gameState.players.find(p => p.id === unit.ownerId);
    if (player && unit.carryingResource) {
      player.resources[unit.carryingResource.type] += unit.carryingResource.amount;
    }
    
    // 清除携带的资源
    unit.carryingResource = undefined;
  }
}

/**
 * 计算两点之间的距离
 */
function getDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 寻找最近的建筑
 */
function findNearestBuilding(position: { x: number; y: number }, buildings: Array<{ position: { x: number; y: number } }>): { position: { x: number; y: number } } {
  let nearest = buildings[0];
  let minDistance = getDistance(position, nearest.position);
  
  for (let i = 1; i < buildings.length; i++) {
    const distance = getDistance(position, buildings[i].position);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = buildings[i];
    }
  }
  
  return nearest;
}
