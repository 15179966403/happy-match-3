import { AnimalType, SpecialType, TileData, MatchGroup, DropItem, GAME_CONFIG } from './Types';

export class MatchLogic {
    private static nextId: number = 1;

    /**
     * 创建一个空棋盘
     */
    public static createEmptyGrid(): (TileData | null)[][] {
        const grid: (TileData | null)[][] = [];
        for (let r = 0; r < GAME_CONFIG.ROWS; r++) {
            grid[r] = [];
            for (let c = 0; c < GAME_CONFIG.COLS; c++) {
                grid[r][c] = null;
            }
        }
        return grid;
    }

    /**
     * 生成一个随机动物图块
     */
    public static createRandomTile(row: number, col: number, excludeTypes: AnimalType[] = []): TileData {
        const available: AnimalType[] = [];
        for (let i = 0; i < GAME_CONFIG.ANIMAL_COUNT; i++) {
            if (!excludeTypes.includes(i)) {
                available.push(i);
            }
        }
        const picked = available[Math.floor(Math.random() * available.length)];
        return {
            id: this.nextId++,
            type: picked,
            special: SpecialType.NONE,
            row,
            col,
        };
    }

    /**
     * 初始化完整棋盘：确保无现成3消，且至少有一种可消除解法
     */
    public static initBoard(): (TileData | null)[][] {
        let grid: (TileData | null)[][];
        do {
            grid = this.createEmptyGrid();
            for (let r = 0; r < GAME_CONFIG.ROWS; r++) {
                for (let c = 0; c < GAME_CONFIG.COLS; c++) {
                    const exclude: AnimalType[] = [];
                    // 避免水平三连
                    if (c >= 2 && grid[r][c - 1] && grid[r][c - 2] &&
                        grid[r][c - 1]!.type === grid[r][c - 2]!.type) {
                        exclude.push(grid[r][c - 1]!.type);
                    }
                    // 避免垂直三连
                    if (r >= 2 && grid[r - 1][c] && grid[r - 2][c] &&
                        grid[r - 1][c]!.type === grid[r - 2][c]!.type) {
                        exclude.push(grid[r - 1][c]!.type);
                    }
                    grid[r][c] = this.createRandomTile(r, c, exclude);
                }
            }
        } while (!this.hasValidMove(grid));

        return grid;
    }

    /**
     * 检测棋盘中是否存在任何可消匹配 (3连及以上)
     */
    public static findMatches(grid: (TileData | null)[][], focusPos?: { row: number; col: number }): MatchGroup[] {
        const rows = GAME_CONFIG.ROWS;
        const cols = GAME_CONFIG.COLS;

        // 收集水平连续线
        const hLines: TileData[][] = [];
        for (let r = 0; r < rows; r++) {
            let currentLine: TileData[] = [];
            for (let c = 0; c < cols; c++) {
                const tile = grid[r][c];
                if (!tile || tile.special === SpecialType.RAINBOW) {
                    if (currentLine.length >= 3) hLines.push([...currentLine]);
                    currentLine = [];
                    continue;
                }
                if (currentLine.length === 0 || currentLine[0].type === tile.type) {
                    currentLine.push(tile);
                } else {
                    if (currentLine.length >= 3) hLines.push([...currentLine]);
                    currentLine = [tile];
                }
            }
            if (currentLine.length >= 3) hLines.push([...currentLine]);
        }

        // 收集垂直连续线
        const vLines: TileData[][] = [];
        for (let c = 0; c < cols; c++) {
            let currentLine: TileData[] = [];
            for (let r = 0; r < rows; r++) {
                const tile = grid[r][c];
                if (!tile || tile.special === SpecialType.RAINBOW) {
                    if (currentLine.length >= 3) vLines.push([...currentLine]);
                    currentLine = [];
                    continue;
                }
                if (currentLine.length === 0 || currentLine[0].type === tile.type) {
                    currentLine.push(tile);
                } else {
                    if (currentLine.length >= 3) vLines.push([...currentLine]);
                    currentLine = [tile];
                }
            }
            if (currentLine.length >= 3) vLines.push([...currentLine]);
        }

        const groups: MatchGroup[] = [];
        const usedTiles = new Set<number>();

        // 优先检测交叉点 (L / T 型 -> 炸弹)
        for (const hl of hLines) {
            for (const vl of vLines) {
                if (hl[0].type !== vl[0].type) continue;
                // 寻找交点
                const intersection = hl.find(ht => vl.some(vt => vt.id === ht.id));
                if (intersection) {
                    const combinedTiles = Array.from(new Set([...hl, ...vl]));
                    groups.push({
                        tiles: combinedTiles,
                        specialToGenerate: SpecialType.BOMB,
                        targetPos: focusPos && combinedTiles.some(t => t.row === focusPos.row && t.col === focusPos.col)
                            ? focusPos : { row: intersection.row, col: intersection.col },
                        animalType: intersection.type
                    });
                    combinedTiles.forEach(t => usedTiles.add(t.id));
                }
            }
        }

        // 处理未合并的水平线
        for (const line of hLines) {
            const unused = line.filter(t => !usedTiles.has(t.id));
            if (unused.length >= 3) {
                let special = SpecialType.NONE;
                if (line.length >= 5) special = SpecialType.RAINBOW;
                else if (line.length === 4) special = SpecialType.HORIZONTAL;

                const target = (focusPos && line.some(t => t.row === focusPos.row && t.col === focusPos.col))
                    ? focusPos : { row: line[1].row, col: line[1].col };

                groups.push({
                    tiles: line,
                    specialToGenerate: special,
                    targetPos: target,
                    animalType: line[0].type
                });
                line.forEach(t => usedTiles.add(t.id));
            }
        }

        // 处理未合并的垂直线
        for (const line of vLines) {
            const unused = line.filter(t => !usedTiles.has(t.id));
            if (unused.length >= 3) {
                let special = SpecialType.NONE;
                if (line.length >= 5) special = SpecialType.RAINBOW;
                else if (line.length === 4) special = SpecialType.VERTICAL;

                const target = (focusPos && line.some(t => t.row === focusPos.row && t.col === focusPos.col))
                    ? focusPos : { row: line[1].row, col: line[1].col };

                groups.push({
                    tiles: line,
                    specialToGenerate: special,
                    targetPos: target,
                    animalType: line[0].type
                });
                line.forEach(t => usedTiles.add(t.id));
            }
        }

        return groups;
    }

    /**
     * 判断两个相邻格子交换后是否会有匹配或特殊合成
     */
    public static canSwap(grid: (TileData | null)[][], r1: number, c1: number, r2: number, c2: number): boolean {
        const t1 = grid[r1][c1];
        const t2 = grid[r2][c2];
        if (!t1 || !t2) return false;

        // 特殊组合互换允许直接触发：
        // 1. 任意一个是魔力鸟
        if (t1.special === SpecialType.RAINBOW || t2.special === SpecialType.RAINBOW) return true;
        // 2. 两个都是特殊图块 (如条纹+条纹、条纹+炸弹、炸弹+炸弹)
        if (t1.special !== SpecialType.NONE && t2.special !== SpecialType.NONE) return true;

        // 模拟交换检测
        grid[r1][c1] = t2;
        grid[r2][c2] = t1;

        const matches = this.findMatches(grid);

        // 换回
        grid[r1][c1] = t1;
        grid[r2][c2] = t2;

        return matches.length > 0;
    }

    /**
     * 检测棋盘是否还有可走有效步 (防死局检测)
     */
    public static hasValidMove(grid: (TileData | null)[][]): boolean {
        const rows = GAME_CONFIG.ROWS;
        const cols = GAME_CONFIG.COLS;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                // 尝试向右交换
                if (c + 1 < cols && this.canSwap(grid, r, c, r, c + 1)) return true;
                // 尝试向上交换
                if (r + 1 < rows && this.canSwap(grid, r, c, r + 1, c)) return true;
            }
        }
        return false;
    }

    /**
     * 计算消除波及的所有格子 (展开条纹贯穿、炸弹范围、魔力鸟全屏)
     */
    public static expandElimination(
        grid: (TileData | null)[][],
        initialTiles: TileData[]
    ): Set<TileData> {
        const toEliminate = new Set<TileData>();
        const queue: TileData[] = [...initialTiles];

        while (queue.length > 0) {
            const current = queue.shift()!;
            if (toEliminate.has(current)) continue;
            toEliminate.add(current);

            // 触发横向条纹
            if (current.special === SpecialType.HORIZONTAL) {
                for (let c = 0; c < GAME_CONFIG.COLS; c++) {
                    const t = grid[current.row][c];
                    if (t && !toEliminate.has(t)) queue.push(t);
                }
            }
            // 触发纵向条纹
            else if (current.special === SpecialType.VERTICAL) {
                for (let r = 0; r < GAME_CONFIG.ROWS; r++) {
                    const t = grid[r][current.col];
                    if (t && !toEliminate.has(t)) queue.push(t);
                }
            }
            // 触发炸弹 (3x3 范围)
            else if (current.special === SpecialType.BOMB) {
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = current.row + dr;
                        const nc = current.col + dc;
                        if (nr >= 0 && nr < GAME_CONFIG.ROWS && nc >= 0 && nc < GAME_CONFIG.COLS) {
                            const t = grid[nr][nc];
                            if (t && !toEliminate.has(t)) queue.push(t);
                        }
                    }
                }
            }
        }

        return toEliminate;
    }

    /**
     * 重力下落计算：将上方所有剩余元素压实到底部，并从顶部产生新生元素 (支持藤蔓固定阻隔)
     */
    public static calculateDrop(
        grid: (TileData | null)[][],
        isLocked?: (r: number, c: number) => boolean
    ): { drops: DropItem[]; newTiles: TileData[] } {
        const rows = GAME_CONFIG.ROWS;
        const cols = GAME_CONFIG.COLS;
        const drops: DropItem[] = [];
        const newTiles: TileData[] = [];

        for (let c = 0; c < cols; c++) {
            let emptyCount = 0;
            // 从底部向上扫描
            for (let r = 0; r < rows; r++) {
                if (grid[r][c] === null) {
                    emptyCount++;
                } else if (isLocked && isLocked(r, c)) {
                    // 该格被藤蔓锁定，不能下落，上方重力在藤蔓头顶重新累计
                    emptyCount = 0;
                } else if (emptyCount > 0) {
                    // 下移
                    const tile = grid[r][c]!;
                    const targetRow = r - emptyCount;
                    grid[targetRow][c] = tile;
                    grid[r][c] = null;
                    drops.push({
                        fromRow: r,
                        fromCol: c,
                        toRow: targetRow,
                        toCol: c,
                        tile,
                        isNew: false
                    });
                }
            }

            // 顶部补齐新生元素
            for (let i = 0; i < emptyCount; i++) {
                const targetRow = rows - emptyCount + i;
                const spawnRow = rows + i; // 在棋盘顶部外方生成并坠入
                const newTile = this.createRandomTile(targetRow, c);
                grid[targetRow][c] = newTile;
                newTiles.push(newTile);
                drops.push({
                    fromRow: spawnRow,
                    fromCol: c,
                    toRow: targetRow,
                    toCol: c,
                    tile: newTile,
                    isNew: true
                });
            }
        }

        return { drops, newTiles };
    }

    /**
     * 洗牌算法：将棋盘现有元素随机打乱，直到有解且无现成3消
     */
    public static shuffle(grid: (TileData | null)[][]): void {
        const tiles: TileData[] = [];
        for (let r = 0; r < GAME_CONFIG.ROWS; r++) {
            for (let c = 0; c < GAME_CONFIG.COLS; c++) {
                if (grid[r][c]) tiles.push(grid[r][c]!);
            }
        }

        let attempts = 0;
        do {
            // 洗牌 Fisher-Yates
            for (let i = tiles.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const temp = tiles[i];
                tiles[i] = tiles[j];
                tiles[j] = temp;
            }

            // 重新填入网格
            let idx = 0;
            for (let r = 0; r < GAME_CONFIG.ROWS; r++) {
                for (let c = 0; c < GAME_CONFIG.COLS; c++) {
                    const t = tiles[idx++];
                    t.row = r;
                    t.col = c;
                    grid[r][c] = t;
                }
            }
            attempts++;
        } while ((this.findMatches(grid).length > 0 || !this.hasValidMove(grid)) && attempts < 100);
    }
}
