const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
    const source = fs.readFileSync(filename, 'utf8');
    const output = ts.transpileModule(source, {
        fileName: filename,
        compilerOptions: { target: ts.ScriptTarget.ES2019, module: ts.ModuleKind.CommonJS },
    });
    module._compile(output.outputText, filename);
};

const { LEVELS, createLevelState, settleAction } = require('../assets/scripts/LevelRules.ts');
const { MatchLogic } = require('../assets/scripts/MatchLogic.ts');
const { AnimalType, SpecialType, GAME_CONFIG } = require('../assets/scripts/Types.ts');

test('fourth valid action hurts, but reaching the target wins before damage', () => {
    const level = LEVELS[0];
    let state = createLevelState(level);
    for (let i = 0; i < 3; i++) state = settleAction(level, state, 0).state;
    assert.equal(state.health, 5);
    assert.equal(state.danger, 3);
    const hurt = settleAction(level, state, 0);
    assert.equal(hurt.state.health, 4);
    assert.equal(hurt.state.danger, 0);
    const won = settleAction(level, state, level.goal.required);
    assert.equal(won.state.status, 'won');
    assert.equal(won.state.health, 5);
    assert.equal(won.damageDue, false);
    assert.equal(settleAction(level, won.state, 0).state.actions, won.state.actions);
});

test('shield absorbs damage before health and fatal damage ends the level', () => {
    const level = LEVELS[0];
    const state = { ...createLevelState(level), danger: level.dangerInterval - 1 };
    const blocked = settleAction(level, { ...state, shield: 1 }, 0);
    assert.equal(blocked.shieldUsed, 1);
    assert.equal(blocked.healthLost, 0);
    assert.equal(blocked.state.health, level.maxHealth);
    const fatal = settleAction(level, { ...state, health: 1 }, 0);
    assert.equal(fatal.state.health, 0);
    assert.equal(fatal.state.status, 'lost');
});

test('chain shield requires two elimination waves and never exceeds two stacks', () => {
    const level = LEVELS[8];
    assert.deepEqual(level.rules, ['chain_shield']);
    const start = createLevelState(level);
    assert.equal(settleAction(level, start, 0, 1).state.shield, 0);
    const earned = settleAction(level, start, 0, 2);
    assert.equal(earned.shieldGained, 1);
    assert.equal(earned.state.shield, 1);
    assert.equal(settleAction(level, { ...start, shield: 2 }, 0, 3).state.shield, 2);
    const damageTurn = { ...start, danger: level.dangerInterval - 1 };
    const blocked = settleAction(level, damageTurn, 0, 2);
    assert.equal(blocked.shieldGained, 1);
    assert.equal(blocked.shieldUsed, 1);
    assert.equal(blocked.healthLost, 0);
    assert.equal(settleAction(LEVELS[0], createLevelState(LEVELS[0]), 0, 2).shieldGained, 0);
});

test('all sample level targets can be reached by their placed content', () => {
    for (const level of LEVELS) {
        assert.ok(level.goal.required > 0);
        assert.ok(level.maxHealth > 0 && level.dangerInterval > 0 && level.damagePerTick > 0);
        if (level.goal.kind === 'ice_clear') {
            assert.ok(level.ice.reduce((sum, ice) => sum + ice.layers, 0) >= level.goal.required);
        } else if (level.goal.kind === 'vine_free') {
            assert.ok(level.vines.length >= level.goal.required);
        } else {
            assert.ok(level.goal.animal < GAME_CONFIG.ANIMAL_COUNT);
        }
    }
});

test('seed reproduces board, refill and shuffle including special tile IDs', () => {
    const makeSequence = () => {
        MatchLogic.setSeed(22122);
        const board = MatchLogic.initBoard();
        const initial = board.map(row => row.map(tile => tile.type));
        const special = MatchLogic.createSpecialTile(0, 0, AnimalType.FROG, SpecialType.HORIZONTAL);
        board[0][0] = null;
        MatchLogic.calculateDrop(board);
        const refilled = board.map(row => row.map(tile => [tile.id, tile.type]));
        MatchLogic.shuffle(board);
        const shuffled = board.map(row => row.map(tile => tile.id));
        return { initial, special: special.id, refilled, shuffled };
    };
    assert.deepEqual(makeSequence(), makeSequence());
});

test('locked vine divides gravity into independently refilled segments', () => {
    MatchLogic.setSeed(7);
    const grid = MatchLogic.createEmptyGrid();
    for (let r = 0; r < GAME_CONFIG.ROWS; r++) {
        for (let c = 0; c < GAME_CONFIG.COLS; c++) {
            grid[r][c] = MatchLogic.createRandomTile(r, c);
        }
    }
    const locked = grid[3][2];
    const lower = grid[1][2];
    const upper = grid[5][2];
    grid[0][2] = null;
    grid[4][2] = null;
    const result = MatchLogic.calculateDrop(grid, (r, c) => r === 3 && c === 2);
    assert.equal(grid[0][2], lower);
    assert.equal(lower.row, 0);
    assert.equal(grid[3][2], locked);
    assert.equal(grid[4][2], upper);
    assert.equal(upper.row, 4);
    assert.ok(grid.every(row => row.every(Boolean)));
    assert.equal(result.newTiles.length, 2);
    assert.equal(result.drops.filter(drop => !drop.isNew).length, 5);
});

test('locked animals stay fixed during shuffle and cannot be swapped', () => {
    MatchLogic.setSeed(91);
    const board = MatchLogic.initBoard();
    const locked = board[3][2];
    const isLocked = (r, c) => r === 3 && c === 2;
    MatchLogic.shuffle(board, isLocked);
    assert.equal(board[3][2], locked);
    assert.equal(MatchLogic.canSwap(board, 3, 2, 3, 3, isLocked), false);
});

test('gravity keeps every cell filled and locked animals fixed across seeded boards', () => {
    const isLocked = (r, c) => (r === 3 && c === 2) || (r === 5 && c === 5);
    for (let seed = 1; seed <= 100; seed++) {
        MatchLogic.setSeed(seed);
        const board = MatchLogic.initBoard();
        const lockedA = board[3][2];
        const lockedB = board[5][5];
        for (let r = 0; r < GAME_CONFIG.ROWS; r++) {
            for (let c = 0; c < GAME_CONFIG.COLS; c++) {
                if (!isLocked(r, c) && (r * 17 + c * 11 + seed) % 4 === 0) board[r][c] = null;
            }
        }
        MatchLogic.calculateDrop(board, isLocked);
        assert.equal(board[3][2], lockedA);
        assert.equal(board[5][5], lockedB);
        const ids = new Set();
        for (let r = 0; r < GAME_CONFIG.ROWS; r++) {
            for (let c = 0; c < GAME_CONFIG.COLS; c++) {
                const tile = board[r][c];
                assert.ok(tile, `seed ${seed}: empty cell (${r}, ${c})`);
                assert.equal(tile.row, r);
                assert.equal(tile.col, c);
                assert.ok(!ids.has(tile.id), `seed ${seed}: duplicate tile ID ${tile.id}`);
                ids.add(tile.id);
            }
        }
    }
});
