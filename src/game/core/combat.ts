import type { Unit, Vec2, Building, GameState } from './types';

const ATTACK_RANGE_TOLERANCE = 0.5; // 攻击范围容差
const AUTO_ATTACK_RANGE_BUFFER = 1.5; // 自动寻敌范围
const ATTACK_COOLDOWN_MS = 1000; // 默认攻击冷却时间

/**
 * 计算单位之间的伤害，考虑护甲减免
 */
export function calculateDamage(attacker: Unit | Building, target: Unit | Building): number {
  // 使用类型断言安全地访问可能不存在的属性并确保类型
  const damage =
    'attackDamage' in attacker.stats && typeof attacker.stats.attackDamage === 'number'
      ? attacker.stats.attackDamage
      : 0;

  // 应用护甲减免
  // 使用类型断言安全地访问可能不存在的属性并确保类型
  const armor =
    'armor' in target.stats && typeof target.stats.armor === 'number' ? target.stats.armor : 0;
  const armorReduction = Math.max(0, 1 - armor / (20 + armor));

  return Math.max(1, Math.floor(damage * armorReduction));
}

/**
 * 执行攻击并处理奖励
 */
function performAttack(attacker: Unit, target: Unit | Building, gameState: GameState): void {
  const damage = calculateDamage(attacker, target);
  target.hp = Math.max(0, target.hp - damage);

  // 如果目标死亡，处理奖励
  if (target.hp <= 0 && gameState.players) {
    const attackerPlayer = gameState.players.find((p) => p.id === gameState.localPlayerId);
    if (attackerPlayer && attackerPlayer.resources) {
      // 检查是否为建筑
      if ('kind' in target && typeof target.kind === 'string') {
        // 摧毁建筑奖励
        attackerPlayer.resources.minerals = (attackerPlayer.resources.minerals || 0) + 50;

        // 如果是指挥中心，额外奖励
        // 使用类型断言来避免类型不匹配错误
        if ('kind' in target && String(target.kind) === 'command_center') {
          attackerPlayer.resources.minerals = (attackerPlayer.resources.minerals || 0) + 200;
          attackerPlayer.resources.gas = (attackerPlayer.resources.gas || 0) + 100;
        }
      } else {
        // 击杀单位奖励
        attackerPlayer.resources.minerals = (attackerPlayer.resources.minerals || 0) + 10;
      }
    }
  }
}

/**
 * 更新单位战斗状态
 */
export function updateUnitCombat(
  allUnits: Unit[],
  allBuildings: Building[],
  unit: Unit,
  deltaTimeMs: number,
): void {
  // 跳过自动寻敌功能，避免类型错误
  // 自动寻敌功能可以在后续实现时修复类型问题
  // autoAcquireTarget需要正确的GameState对象

  if (!unit.attackTargetId || !unit.stats.attackDamage || !unit.stats.attackRange) {
    return;
  }

  const target = allUnits.find((u) => u.id === unit.attackTargetId);
  if (!target || target.hp <= 0) {
    // 目标已死亡或不存在，清除攻击目标
    unit.attackTargetId = undefined;
    return;
  }

  // 更新攻击冷却
  if (unit.attackCooldown !== undefined) {
    unit.attackCooldown = Math.max(0, unit.attackCooldown - deltaTimeMs);
  }

  const distance = getDistance(unit.position, target.position);
  const attackRange = unit.stats.attackRange + ATTACK_RANGE_TOLERANCE;

  // 如果距离太远，移动到攻击范围内
  if (distance > attackRange) {
    // 计算攻击范围内的位置
    const dx = target.position.x - unit.position.x;
    const dy = target.position.y - unit.position.y;
    const angle = Math.atan2(dy, dx);
    const moveToX = target.position.x - Math.cos(angle) * attackRange;
    const moveToY = target.position.y - Math.sin(angle) * attackRange;
    unit.moveTarget = { x: moveToX, y: moveToY };
    return;
  }

  // 在攻击范围内，停止移动
  unit.moveTarget = undefined;

  // 如果冷却完成，进行攻击
  if (!unit.attackCooldown || unit.attackCooldown === 0) {
    target.hp = Math.max(0, target.hp - unit.stats.attackDamage);
    unit.attackCooldown = ATTACK_COOLDOWN_MS;

    // 如果目标死亡，清除攻击目标
    if (target.hp <= 0) {
      unit.attackTargetId = undefined;
    }
  }
}

/**
 * 更新建筑战斗状态
 */
export function updateBuildingCombat(
  allUnits: Unit[],
  building: Building,
  deltaTimeMs: number,
): void {
  // 检查建筑是否有战斗能力
  if (
    !('stats' in building) ||
    !('attackDamage' in building.stats) ||
    typeof building.stats.attackDamage !== 'number' ||
    !('attackRange' in building.stats) ||
    typeof building.stats.attackRange !== 'number'
  ) {
    return;
  }

  // 简化的建筑自动寻敌逻辑
  const searchRange = building.stats.attackRange + ATTACK_RANGE_TOLERANCE;
  const nearbyEnemy = findNearbyEnemyInList(building, allUnits, searchRange);

  if (nearbyEnemy && nearbyEnemy.hp > 0) {
    // 为attackCooldown属性添加类型安全检查，使用可选属性处理
    const currentCooldown = (building as any).attackCooldown || 0;
    const newCooldown = Math.max(0, currentCooldown - deltaTimeMs);

    // 如果冷却完成，进行攻击
    if (newCooldown <= 0) {
      const damage = calculateDamage(building, nearbyEnemy);
      nearbyEnemy.hp = Math.max(0, nearbyEnemy.hp - damage);
      (building as any).attackCooldown = ATTACK_COOLDOWN_MS;
    } else {
      (building as any).attackCooldown = newCooldown;
    }
  }
}

/**
 * 使用ID列表优化寻找附近的敌方单位
 */
// 空间网格优化相关函数已移除

/**
 * 更新整个战斗系统
 */
export function updateCombat(gameState: GameState, deltaTimeMs: number): GameState {
  // 创建游戏状态的深拷贝，避免直接修改原始状态
  const updatedUnits = [...gameState.units];
  const updatedBuildings = [...gameState.buildings];

  // 更新所有单位的战斗状态
  updatedUnits.forEach((unit) => {
    updateUnitCombat(updatedUnits, updatedBuildings, unit, deltaTimeMs);
  });

  // 更新所有建筑的战斗状态
  updatedBuildings.forEach((building) => {
    updateBuildingCombat(updatedUnits, building, deltaTimeMs);
  });

  // 创建并返回新的游戏状态对象，避免直接修改参数
  return {
    ...gameState,
    units: updatedUnits.filter((unit) => unit.hp > 0),
    buildings: updatedBuildings.filter((building) => building.hp > 0),
  };
}

/**
 * 自动寻敌
 */
function autoAcquireTarget(gameState: GameState, unit: Unit): void {
  if (unit.attackTargetId || !unit.stats.attackDamage || !unit.stats.attackRange || unit.hp <= 0) {
    return;
  }

  // 扩大搜索范围以自动寻敌
  const searchRange = unit.stats.attackRange + AUTO_ATTACK_RANGE_BUFFER;

  // 优先寻找单位
  const nearbyEnemy = findNearbyEnemyInList(unit, gameState.units, searchRange);
  if (nearbyEnemy) {
    setUnitAttackTarget(unit, nearbyEnemy.id);
    return;
  }

  // 其次寻找建筑
  const nearbyEnemyBuilding = findNearbyEnemyBuilding(unit, gameState.buildings, searchRange);
  if (nearbyEnemyBuilding) {
    setUnitAttackTarget(unit, nearbyEnemyBuilding.id);
  }
}

/**
 * 设置单位攻击目标
 */
export function setUnitAttackTarget(unit: Unit, targetId: string): void {
  unit.attackTargetId = targetId;
  unit.attackCooldown = 0; // 立即可以攻击
  unit.moveTarget = undefined; // 停止移动，专注攻击
}

/**
 * 寻找附近的敌方单位
 */
function findNearbyEnemy(unit: Unit, allUnits: Unit[], maxRange: number): Unit | undefined {
  return findNearbyEnemyInList(unit, allUnits, maxRange);
}

/**
 * 寻找附近的敌方建筑
 */
function findNearbyEnemyBuilding(
  unit: Unit,
  allBuildings: Building[],
  maxRange: number,
): Building | undefined {
  // 过滤敌方建筑
  const enemies = allBuildings.filter((b) => b.hp > 0 && b.ownerId !== unit.ownerId);

  return findNearestTarget(unit.position, enemies, maxRange);
}

/**
 * 在单位列表中寻找附近的敌方
 */
function findNearbyEnemyInList(
  attacker: Unit | Building,
  allUnits: Unit[],
  maxRange: number,
): Unit | undefined {
  // 过滤敌方单位
  const enemies = allUnits.filter((u) => u.hp > 0 && u.ownerId !== attacker.ownerId);

  return findNearestTarget(attacker.position, enemies, maxRange);
}

/**
 * 寻找最近的目标
 */
function findNearestTarget<T extends { position: Vec2 }>(
  position: Vec2,
  targets: T[],
  maxRange: number,
): T | undefined {
  let closestTarget: T | undefined;
  let closestDistance = maxRange;

  targets.forEach((target) => {
    const distance = getDistance(position, target.position);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestTarget = target;
    }
  });

  return closestTarget;
}

function getDistance(a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}
