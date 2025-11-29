import type { GameState } from './types';
import { updateUnitMovement } from './movement';
import { updateCombat } from './combat';
// 移除不存在的resources模块导入
import { updateBuildingProgress, updateUnitProduction } from './buildings';
import { updateGameState as updateGameFlowState } from './gameFlow';

export function updateGameState(state: GameState, deltaTimeMs: number): void {
  if (state.isPaused) return;

  state.gameTimeMs += deltaTimeMs;

  // 移除空间网格相关代码，简化游戏循环

  // 更新所有单位的状态
  state.units.forEach((unit) => {
    if (unit.hp > 0) {
      // 先更新移动
      updateUnitMovement(unit, deltaTimeMs);

      // 更新资源采集（优先级高于战斗）
      if (!unit.attackTargetId) {
        // 移除不存在的updateResourceCollection调用
      }
    }
  });

  // 更新建筑建造进度
  updateBuildingProgress(state, deltaTimeMs);

  // 更新单位生产
  updateUnitProduction(state, deltaTimeMs);

  // 更新游戏状态
  updateGameFlowState(state, deltaTimeMs);

  // 直接更新战斗系统
  updateCombat(state, deltaTimeMs);

  // 移除死亡的单位
  state.units = state.units.filter((unit) => unit.hp > 0);
}

// 重置游戏循环状态
export function resetGameLoopState(): void {
  // 重置游戏循环所需的状态
}
