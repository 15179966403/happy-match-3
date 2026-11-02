import { AnimalType, SpecialType, TileData, MatchGroup, DropItem, GAME_CONFIG } from './Types';

export class MatchLogic {
    private static nextId: number = 1;
    private static randomState: number = 1;

    /** 设置可复现的棋盘随机种子；同一种子与操作序列会得到相同的补块和洗牌。 */
    public static setSeed(seed: number): void {
        this.randomState = seed >>> 0;
        this.nextId = 1;
    }

    private static random(): number {
        this.randomState = (Math.imul(this.randomState, 1664525) + 1013904223) >>> 0;
        return this.randomState / 0x100000000;
    }

    public static createSpecialTile(row: number, col: number, type: AnimalType, special: SpecialType): TileData {
        return { id: this.nextId++, type, special, row, col };
    }

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
        const picked = available[Math.floor(this.random() * available.length)];
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
    public static findMatches(
        grid: (TileData | null)[][],
        focusPos?: { row: number; col: number },
        protectedTiles?: ReadonlySet<TileData>
    ): MatchGroup[] {
        const rows = GAME_CONFIG.ROWS;
        const cols = GAME_CONFIG.COLS;

        // 收集水平连续线
        const hLines: TileData[][] = [];
        for (let r = 0; r < rows; r++) {
            let currentLine: TileData[] = [];
            for (let c = 0; c < cols; c++) {
                const tile = grid[r][c];
                if (!tile || tile.special === SpecialType.RAINBOW || protectedTiles?.has(tile)) {
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
                if (!tile || tile.special === SpecialType.RAINBOW || protectedTiles?.has(tile)) {
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

                const middle = line[Math.floor((line.length - 1) / 2)];
                const target = (focusPos && line.some(t => t.row === focusPos.row && t.col === focusPos.col))
                    ? focusPos : { row: middle.row, col: middle.col };

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

                const middle = line[Math.floor((line.length - 1) / 2)];
                const target = (focusPos && line.some(t => t.row === focusPos.row && t.col === focusPos.col))
                    ? focusPos : { row: middle.row, col: middle.col };

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
    public static canSwap(grid: (TileData | null)[][], r1: number, c1: number, r2: number, c2: number,
                          isLocked: (row: number, col: number) => boolean = () => false): boolean {
        if (isLocked(r1, c1) || isLocked(r2, c2)) return false;
        const t1 = grid[r1][c1];
        const t2 = grid[r2][c2];
        if (!t1 || !t2) return false;

        // 彩鸟或两个特殊动物可以直接组合；普通特殊动物仍需组成同种三连。
        if (t1.special === SpecialType.RAINBOW || t2.special === SpecialType.RAINBOW) return true;
        if (t1.special !== SpecialType.NONE && t2.special !== SpecialType.NONE) return true;

        // 模拟交换检测
        grid[r1][c1] = t2;
        grid[r2][c2] = t1;

        const matches = this.findMatches(grid);

        // 换回
        grid[r1][c1] = t1;
        grid[r2][c2] = t2;

        return matches.some(group => group.tiles.includes(t1) || group.tiles.includes(t2));
    }

    /**
     * 检测棋盘是否还有可走有效步 (防死局检测)
     */
    public static hasValidMove(grid: (TileData | null)[][],
                               isLocked: (row: number, col: number) => boolean = () => false): boolean {
        const rows = GAME_CONFIG.ROWS;
        const cols = GAME_CONFIG.COLS;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                // 尝试向右交换
                if (c + 1 < cols && this.canSwap(grid, r, c, r, c + 1, isLocked)) return true;
                // 尝试向上交换
                if (r + 1 < rows && this.canSwap(grid, r, c, r + 1, c, isLocked)) return true;
            }
        }
        return false;
    }

    /**
     * 计算消除波及的所有格子 (展开条纹贯穿、炸弹范围、魔力鸟全屏)
     */
    public static expandElimination(
        grid: (TileData | null)[][],
        initialTiles: TileData[],
        canActivate: (tile: TileData) => boolean = () => true
    ): Set<TileData> {
        const toEliminate = new Set<TileData>();
        const queue: TileData[] = [...initialTiles];

        while (queue.length > 0) {
            const current = queue.shift()!;
            if (toEliminate.has(current)) continue;
            toEliminate.add(current);
            if (!canActivate(current)) continue;

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
            // 藤蔓格是固定边界。各段独立下落和补块，不能丢掉边界下方的空位。
            const settleSegment = (bottom: number, top: number) => {
                if (bottom > top) return;
                const existing: { tile: TileData; fromRow: number }[] = [];
                for (let r = bottom; r <= top; r++) {
                    const tile = grid[r][c];
                    if (tile) existing.push({ tile, fromRow: r });
                    grid[r][c] = null;
                }
                existing.forEach(({ tile, fromRow }, index) => {
                    const toRow = bottom + index;
                    grid[toRow][c] = tile;
                    tile.row = toRow;
                    if (fromRow !== toRow) drops.push({
                        fromRow, fromCol: c, toRow, toCol: c, tile, isNew: false
                    });
                });
                const emptyCount = top - bottom + 1 - existing.length;
                for (let i = 0; i < emptyCount; i++) {
                    const toRow = bottom + existing.length + i;
                    const tile = this.createRandomTile(toRow, c);
                    grid[toRow][c] = tile;
                    newTiles.push(tile);
                    drops.push({
                        fromRow: top + 1 + i, fromCol: c,
                        toRow, toCol: c, tile, isNew: true
                    });
                }
            };
            let bottom = 0;
            for (let r = 0; r <= rows; r++) {
                if (r === rows || (isLocked && isLocked(r, c))) {
                    settleSegment(bottom, r - 1);
                    bottom = r + 1;
                }
            }
        }

        return { drops, newTiles };
    }

    /**
     * 洗牌算法：将棋盘现有元素随机打乱，直到有解且无现成3消
     */
    public static shuffle(grid: (TileData | null)[][],
                          isLocked: (row: number, col: number) => boolean = () => false): void {
        const tiles: TileData[] = [];
        const positions: { row: number; col: number }[] = [];
        for (let r = 0; r < GAME_CONFIG.ROWS; r++) {
            for (let c = 0; c < GAME_CONFIG.COLS; c++) {
                if (grid[r][c] && !isLocked(r, c)) {
                    tiles.push(grid[r][c]!);
                    positions.push({ row: r, col: c });
                }
            }
        }

        let attempts = 0;
        do {
            // 洗牌 Fisher-Yates
            for (let i = tiles.length - 1; i > 0; i--) {
                const j = Math.floor(this.random() * (i + 1));
                const temp = tiles[i];
                tiles[i] = tiles[j];
                tiles[j] = temp;
            }

            // 重新填入网格
            for (let idx = 0; idx < positions.length; idx++) {
                const { row, col } = positions[idx];
                const t = tiles[idx];
                t.row = row;
                t.col = col;
                grid[row][col] = t;
            }
            attempts++;
        } while ((this.findMatches(grid).length > 0 || !this.hasValidMove(grid, isLocked)) && attempts < 100);
    }
}
