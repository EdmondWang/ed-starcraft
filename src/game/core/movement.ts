import type { Unit, Vec2 } from './types';

const STOPPING_DISTANCE = 0.5; // 到达目标的停止距离

/**
 * 设置单位移动目标
 */
export function setUnitMoveTarget(unit: Unit, target: Vec2): void {
  unit.moveTarget = target;
  // 只有在不是追击状态下才清除攻击目标
  if (!unit.attackTargetId) {
    unit.attackTargetId = undefined;
  }
}

/**
 * 更新单位移动
 */
export function updateUnitMovement(unit: Unit, deltaTimeMs: number): void {
  if (!unit.moveTarget || unit.hp <= 0) {
    unit.moveTarget = undefined;
    return;
  }

  // 计算方向向量
  const dx = unit.moveTarget.x - unit.position.x;
  const dy = unit.moveTarget.y - unit.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // 检查是否是追击行为
  const isChasing = !!unit.attackTargetId;
  const stoppingThreshold = isChasing ? unit.stats.attackRange || 1.5 : STOPPING_DISTANCE;

  // 如果已经到达目标附近或攻击范围内，停止移动
  if (distance <= stoppingThreshold) {
    unit.moveTarget = undefined;
    return;
  }

  // 计算移动速度（逻辑单位/秒）
  const moveSpeed = unit.stats.moveSpeed;
  const moveDistance = (moveSpeed * deltaTimeMs) / 1000;

  // 计算新位置
  const newX = unit.position.x + (dx / distance) * moveDistance;
  const newY = unit.position.y + (dy / distance) * moveDistance;

  // 简化移动逻辑，移除空间网格依赖
  let collision = false;
  // 碰撞检测将在游戏主循环中处理

  // 更新位置（实际应用中应根据碰撞检测结果调整）
  if (distance > moveDistance) {
    // 正常移动
    unit.position.x = newX;
    unit.position.y = newY;
  } else {
    // 直接到达目标或攻击范围边缘
    if (isChasing) {
      // 对于追击，停在攻击范围内
      const ratio = stoppingThreshold / distance;
      unit.position.x += dx * ratio;
      unit.position.y += dy * ratio;
    } else {
      // 普通移动，直接到达目标点
      unit.position.x = unit.moveTarget.x;
      unit.position.y = unit.moveTarget.y;
    }
    unit.moveTarget = undefined;
  }
}
