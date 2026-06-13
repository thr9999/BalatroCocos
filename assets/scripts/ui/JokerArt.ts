/**
 * 小丑牌美术映射表（表现层）。
 * 把"小丑牌 id"映射到 Jokers 图集里的格子(col, row)。
 * core 层（规则/效果）不该知道美术坐标，所以这张表放在 ui 层。
 * 以后换皮 = 换图集 + 改这张表，规则代码一行不用动。
 *
 * 坐标取自原版定义（Jokers 图集 10 列 × 16 行，单元格 142×190）。
 */
export type AtlasCell = { col: number; row: number };

export const JOKER_ATLAS_COLS = 10;
export const JOKER_ATLAS_ROWS = 16;

const JOKER_ART: Record<string, AtlasCell> = {
    j_joker: { col: 0, row: 0 },
    j_greedy: { col: 6, row: 1 },
    j_sly: { col: 0, row: 14 },
    j_half: { col: 7, row: 0 },
    j_duo: { col: 5, row: 4 },
};

export function getJokerArtCell(id: string): AtlasCell | null {
    return JOKER_ART[id] ?? null;
}
