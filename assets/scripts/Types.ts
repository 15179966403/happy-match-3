export enum AnimalType {
    CHICKEN = 0, // 黄色小鸡
    FROG = 1,    // 绿色青蛙
    BEAR = 2,    // 蓝色小熊
    FOX = 3,     // 红色狐狸
    OWL = 4,     // 紫色猫头鹰
    HIPPO = 5    // 橙色河马
}

export enum SpecialType {
    NONE = 0,
    HORIZONTAL = 1, // 横向消除整行
    VERTICAL = 2,   // 纵向消除整列
    BOMB = 3,       // 3x3 范围爆炸
    RAINBOW = 4     // 魔力鸟 / 彩虹球 (消除全屏同色)
}

export interface TileData {
    id: number;
    type: AnimalType;
    special: SpecialType;
    row: number;
    col: number;
}

export interface MatchGroup {
    tiles: TileData[];
    specialToGenerate: SpecialType;
    targetPos: { row: number; col: number };
    animalType: AnimalType;
}

export interface DropItem {
    fromRow: number;
    fromCol: number;
    toRow: number;
    toCol: number;
    tile: TileData;
    isNew: boolean;
}

export const GAME_CONFIG = {
    ROWS: 8,
    COLS: 8,
    TILE_SIZE: 72,
    TILE_GAP: 4,
    ANIMAL_COUNT: 5, // 常用 5 种动物，手感与连击率最舒适
    MAX_MOVES: 35, // 充裕初始步数，方便长时间畅玩与测试
    TARGET_SCORE: 6000,
};
