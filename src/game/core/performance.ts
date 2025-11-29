import type { GameState, Unit, Building, BuildingKind } from './types';

// 类型声明
export interface Vec2 {
  x: number;
  y: number;
}

/**
 * 对象池管理器，用于重用游戏对象以减少内存分配和垃圾回收
 */
export class ObjectPool<T extends { reset: () => void }> {
  private pool: T[] = [];
  private factory: () => T;
  private maxSize: number;

  constructor(factory: () => T, maxSize: number = 100) {
    this.factory = factory;
    this.maxSize = maxSize;
  }

  /**
   * 从池中获取对象
   */
  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.factory();
  }

  /**
   * 释放对象回池中
   */
  release(obj: T): void {
    obj.reset();
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj);
    }
  }

  /**
   * 清理池中所有对象
   */
  clear(): void {
    this.pool = [];
  }
}

/**
 * 批量渲染优化，将相同类型的对象合并渲染
 */
export interface BatchRenderItem {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  rotation?: number;
}

/**
 * 收集需要批量渲染的项目
 */
export function collectBatchRenderItems(gameState: GameState): Record<string, BatchRenderItem[]> {
  const batches: Record<string, BatchRenderItem[]> = {};

  // 收集单位
  gameState.units.forEach((unit) => {
    const batchKey = `unit-${unit.kind}`;
    if (!batches[batchKey]) {
      batches[batchKey] = [];
    }
    batches[batchKey].push({
      id: unit.id,
      type: 'unit',
      x: unit.position.x,
      y: unit.position.y,
      width: 2,
      height: 2,
      color: gameState.localPlayerId === '1' ? '#4ade80' : '#ef4444',
      rotation: 0,
    });
  });

  // 收集建筑
  gameState.buildings.forEach((building) => {
    const batchKey = `building-${building.kind}`;
    if (!batches[batchKey]) {
      batches[batchKey] = [];
    }
    batches[batchKey].push({
      id: building.id,
      type: 'building',
      x: building.position.x,
      y: building.position.y,
      width: (building.kind as string) === 'command_center' ? 4 : 3,
      height: (building.kind as string) === 'command_center' ? 4 : 3,
      color: gameState.localPlayerId === '1' ? '#3b82f6' : '#f97316',
      rotation: 0,
    });
  });

  // 收集资源节点（如果在地图中有）
  if (gameState.map && gameState.map.resourceNodes) {
    gameState.map.resourceNodes.forEach((resourceNode) => {
      const batchKey = `resource-${resourceNode.type || 'default'}`;
      if (!batches[batchKey]) {
        batches[batchKey] = [];
      }
      batches[batchKey].push({
        id: resourceNode.id,
        type: 'resource',
        x: resourceNode.position.x,
        y: resourceNode.position.y,
        width: 1.5,
        height: 1.5,
        color: resourceNode.type === 'minerals' ? '#9333ea' : '#06b6d4',
        rotation: 0,
      });
    });
  }

  return batches;
}

/**
 * 空间分区系统，用于优化碰撞检测和可见性判断
 */
export class SpatialGrid {
  private grid: Record<string, string[]> = {};
  private cellSize: number;

  constructor(cellSize: number = 10) {
    this.cellSize = cellSize;
  }

  /**
   * 获取网格键
   */
  private getGridKey(x: number, y: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }

  /**
   * 清除网格
   */
  clear(): void {
    this.grid = {};
  }

  /**
   * 添加对象到网格
   */
  add(id: string, x: number, y: number): void {
    const key = this.getGridKey(x, y);
    if (!this.grid[key]) {
      this.grid[key] = [];
    }
    if (!this.grid[key].includes(id)) {
      this.grid[key].push(id);
    }
  }

  /**
   * 获取指定区域内的所有对象ID
   */
  getInRange(x: number, y: number, range: number): string[] {
    const results = new Set<string>();
    const startX = Math.floor((x - range) / this.cellSize);
    const startY = Math.floor((y - range) / this.cellSize);
    const endX = Math.floor((x + range) / this.cellSize);
    const endY = Math.floor((y + range) / this.cellSize);

    for (let cellX = startX; cellX <= endX; cellX++) {
      for (let cellY = startY; cellY <= endY; cellY++) {
        const key = `${cellX},${cellY}`;
        if (this.grid[key]) {
          this.grid[key].forEach((id) => results.add(id));
        }
      }
    }

    return Array.from(results);
  }
}

/**
 * 实现节流函数，限制函数调用频率
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  return function (this: any, ...args: Parameters<T>): void {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * 实现防抖函数，延迟函数调用
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return function (this: any, ...args: Parameters<T>): void {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * 优化游戏状态更新，只更新必要的数据
 */
export function optimizeGameStateUpdate(
  currentState: GameState,
  updatedState: Partial<GameState>,
): GameState {
  // 创建状态的浅拷贝以避免直接修改
  const newState = { ...currentState };

  // 只更新提供的属性
  Object.keys(updatedState).forEach((key) => {
    const stateKey = key as keyof GameState;
    const value = updatedState[stateKey];
    if (value !== undefined) {
      // 对于复杂对象，进行深拷贝以避免引用问题
      if (typeof value === 'object' && value !== null) {
        (newState as any)[stateKey] = Array.isArray(value) ? [...value] : { ...value };
      } else {
        (newState as any)[stateKey] = value;
      }
    }
  });

  return newState;
}

/**
 * 实现可见性检测，只渲染视图内的对象
 */
export function filterVisibleObjects<T extends { position: { x: number; y: number } }>(
  objects: T[],
  cameraX: number,
  cameraY: number,
  cameraWidth: number,
  cameraHeight: number,
  objectSize: number = 2,
): T[] {
  const visibleObjects: T[] = [];

  // 计算视口边界（增加一些缓冲区以避免物体突然消失）
  const left = cameraX - objectSize;
  const top = cameraY - objectSize;
  const right = cameraX + cameraWidth + objectSize;
  const bottom = cameraY + cameraHeight + objectSize;

  for (const obj of objects) {
    const { x, y } = obj.position;
    if (x >= left && x <= right && y >= top && y <= bottom) {
      visibleObjects.push(obj);
    }
  }

  return visibleObjects;
}
