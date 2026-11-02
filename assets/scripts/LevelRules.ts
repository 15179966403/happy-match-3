import { AnimalType } from './Types';

export type Goal =
    | { kind: 'animal_clear'; animal: AnimalType; required: number }
    | { kind: 'ice_clear'; required: number }
    | { kind: 'vine_free'; required: number };

export interface IcePlacement { row: number; col: number; layers: number }
export interface CellPlacement { row: number; col: number }

export interface LevelConfig {
    id: number;
    goal: Goal;
    maxHealth: number;
    dangerInterval: number;
    damagePerTick: number;
    ice: IcePlacement[];
    vines: CellPlacement[];
    rules?: Array<'chain_shield'>;
}

export interface LevelState {
    health: number;
    shield: number;
    danger: number;
    actions: number;
    goalProgress: number;
    status: 'playing' | 'won' | 'lost';
}

export interface TurnResult {
    state: LevelState;
    damageDue: boolean;
    shieldGained: number;
    shieldUsed: number;
    healthLost: number;
}

const rowIce = (row: number, start: number, end: number, layers = 1): IcePlacement[] =>
    Array.from({ length: end - start + 1 }, (_, i) => ({ row, col: start + i, layers }));

/** 首轮可玩的十关样例；后续迁移到配置资源。 */
export const LEVELS: ReadonlyArray<LevelConfig> = [
    {
        id: 1,
        goal: { kind: 'animal_clear', animal: AnimalType.CHICKEN, required: 12 },
        maxHealth: 5, dangerInterval: 4, damagePerTick: 1,
        ice: [], vines: [],
    },
    {
        id: 2,
        goal: { kind: 'animal_clear', animal: AnimalType.FROG, required: 14 },
        maxHealth: 5, dangerInterval: 4, damagePerTick: 1,
        ice: rowIce(0, 1, 6), vines: [],
    },
    {
        id: 3,
        goal: { kind: 'vine_free', required: 2 },
        maxHealth: 6, dangerInterval: 5, damagePerTick: 1,
        ice: [], vines: [{ row: 3, col: 2 }, { row: 4, col: 5 }],
    },
    {
        id: 4,
        goal: { kind: 'ice_clear', required: 12 },
        maxHealth: 6, dangerInterval: 4, damagePerTick: 1,
        ice: [...rowIce(0, 1, 6), ...rowIce(1, 1, 6)], vines: [],
    },
    {
        id: 5,
        goal: { kind: 'animal_clear', animal: AnimalType.FOX, required: 18 },
        maxHealth: 5, dangerInterval: 3, damagePerTick: 1,
        ice: rowIce(0, 1, 6), vines: [{ row: 3, col: 2 }, { row: 4, col: 5 }],
    },
    {
        id: 6,
        goal: { kind: 'ice_clear', required: 8 },
        maxHealth: 5, dangerInterval: 4, damagePerTick: 1,
        ice: [...rowIce(0, 2, 5), ...rowIce(1, 2, 5)], vines: [],
    },
    {
        id: 7,
        goal: { kind: 'vine_free', required: 2 },
        maxHealth: 6, dangerInterval: 5, damagePerTick: 1,
        ice: [], vines: [{ row: 2, col: 3 }, { row: 5, col: 4 }],
    },
    {
        id: 8,
        goal: { kind: 'animal_clear', animal: AnimalType.OWL, required: 20 },
        maxHealth: 6, dangerInterval: 4, damagePerTick: 1,
        ice: rowIce(0, 1, 6), vines: [],
    },
    {
        id: 9,
        goal: { kind: 'animal_clear', animal: AnimalType.BEAR, required: 22 },
        maxHealth: 5, dangerInterval: 4, damagePerTick: 1,
        ice: [], vines: [], rules: ['chain_shield'],
    },
    {
        id: 10,
        goal: { kind: 'ice_clear', required: 12 },
        maxHealth: 5, dangerInterval: 4, damagePerTick: 1,
        ice: [...rowIce(0, 1, 6), ...rowIce(1, 1, 6)], vines: [], rules: ['chain_shield'],
    },
];

export function getLevel(id: number): LevelConfig {
    return LEVELS[Math.max(0, Math.min(LEVELS.length - 1, id - 1))];
}

export function createLevelState(config: LevelConfig): LevelState {
    return { health: config.maxHealth, shield: 0, danger: 0, actions: 0, goalProgress: 0, status: 'playing' };
}

/** 一次有效交换在棋盘完全稳定后调用。目标完成优先于周期伤害。 */
export function settleAction(config: LevelConfig, before: LevelState, goalDelta: number, cascadeCount = 0): TurnResult {
    if (before.status !== 'playing') {
        return { state: before, damageDue: false, shieldGained: 0, shieldUsed: 0, healthLost: 0 };
    }
    const goalProgress = Math.min(config.goal.required, before.goalProgress + Math.max(0, goalDelta));
    const actions = before.actions + 1;
    const shieldGained = config.rules?.includes('chain_shield') && cascadeCount >= 2
        ? Math.max(0, Math.min(2 - before.shield, 1)) : 0;
    const shield = before.shield + shieldGained;
    if (goalProgress >= config.goal.required) {
        return {
            state: { ...before, goalProgress, actions, shield, status: 'won' },
            damageDue: false, shieldGained, shieldUsed: 0, healthLost: 0,
        };
    }
    const danger = before.danger + 1;
    if (danger < config.dangerInterval) {
        return {
            state: { ...before, goalProgress, actions, danger, shield },
            damageDue: false, shieldGained, shieldUsed: 0, healthLost: 0,
        };
    }
    const shieldUsed = Math.min(shield, config.damagePerTick);
    const healthLost = Math.min(before.health, config.damagePerTick - shieldUsed);
    const health = before.health - healthLost;
    return {
        state: {
            ...before, goalProgress, actions, danger: danger - config.dangerInterval,
            shield: shield - shieldUsed, health,
            status: health === 0 ? 'lost' : 'playing',
        },
        damageDue: true, shieldGained, shieldUsed, healthLost,
    };
}

export function goalName(goal: Goal): string {
    if (goal.kind === 'ice_clear') return '清除冰层';
    if (goal.kind === 'vine_free') return '解开藤蔓';
    return ['小鸡', '青蛙', '小熊', '狐狸', '猫头鹰'][goal.animal] || '动物';
}
