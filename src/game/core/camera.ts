import type { Vec2 } from './types';

interface Camera {
  x: number; // 摄像机位置（逻辑坐标）
  y: number;
  zoom: number; // 缩放级别
  minZoom: number; // 最小缩放
  maxZoom: number; // 最大缩放
  mapWidth: number; // 地图宽度（逻辑坐标）
  mapHeight: number; // 地图高度（逻辑坐标）
  screenWidth: number; // 屏幕宽度（像素）
  screenHeight: number; // 屏幕高度（像素）
  tileSize: number; // 瓦片大小（像素）
}

/**
 * 创建新的摄像机实例
 */
export function createCamera(
  mapWidth: number,
  mapHeight: number,
  screenWidth: number,
  screenHeight: number,
  tileSize: number
): Camera {
  return {
    x: 0,
    y: 0,
    zoom: 1,
    minZoom: 0.5,
    maxZoom: 2,
    mapWidth,
    mapHeight,
    screenWidth,
    screenHeight,
    tileSize
  };
}

/**
 * 更新摄像机尺寸
 */
export function updateCameraSize(camera: Camera, screenWidth: number, screenHeight: number): void {
  camera.screenWidth = screenWidth;
  camera.screenHeight = screenHeight;
  
  // 确保摄像机不超出地图范围
  clampCameraPosition(camera);
}

/**
 * 移动摄像机
 */
export function moveCamera(camera: Camera, deltaX: number, deltaY: number): void {
  const moveAmountX = deltaX / (camera.zoom * camera.tileSize);
  const moveAmountY = deltaY / (camera.zoom * camera.tileSize);
  
  camera.x += moveAmountX;
  camera.y += moveAmountY;
  
  // 确保摄像机不超出地图范围
  clampCameraPosition(camera);
}

/**
 * 缩放摄像机
 */
export function zoomCamera(camera: Camera, zoomAmount: number, screenX: number, screenY: number): void {
  // 计算缩放前鼠标在世界坐标系中的位置
  const worldPosBefore = screenToWorld(screenX, screenY, camera);
  
  // 应用缩放
  camera.zoom = Math.max(camera.minZoom, Math.min(camera.maxZoom, camera.zoom + zoomAmount));
  
  // 计算缩放后鼠标在世界坐标系中的位置
  const worldPosAfter = screenToWorld(screenX, screenY, camera);
  
  // 调整摄像机位置，使鼠标指向的世界坐标保持不变
  camera.x += worldPosBefore.x - worldPosAfter.x;
  camera.y += worldPosBefore.y - worldPosAfter.y;
  
  // 确保摄像机不超出地图范围
  clampCameraPosition(camera);
}

/**
 * 将屏幕坐标转换为世界坐标
 */
export function screenToWorld(screenX: number, screenY: number, camera: Camera): Vec2 {
  return {
    x: screenX / (camera.zoom * camera.tileSize) + camera.x,
    y: screenY / (camera.zoom * camera.tileSize) + camera.y
  };
}

/**
 * 将世界坐标转换为屏幕坐标
 */
export function worldToScreen(worldX: number, worldY: number, camera: Camera): Vec2 {
  return {
    x: (worldX - camera.x) * camera.zoom * camera.tileSize,
    y: (worldY - camera.y) * camera.zoom * camera.tileSize
  };
}

/**
 * 确保摄像机位置不会超出地图边界
 */
function clampCameraPosition(camera: Camera): void {
  const halfScreenWorldWidth = (camera.screenWidth / 2) / (camera.zoom * camera.tileSize);
  const halfScreenWorldHeight = (camera.screenHeight / 2) / (camera.zoom * camera.tileSize);
  
  // 限制摄像机X坐标
  camera.x = Math.max(
    halfScreenWorldWidth,
    Math.min(camera.mapWidth - halfScreenWorldWidth, camera.x)
  );
  
  // 限制摄像机Y坐标
  camera.y = Math.max(
    halfScreenWorldHeight,
    Math.min(camera.mapHeight - halfScreenWorldHeight, camera.y)
  );
}
