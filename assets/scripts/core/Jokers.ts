import { cardHasSuit, handContainsPair } from './JokerEffect';
import type { JokerDef } from './JokerEffect';

/**
 * 小丑牌效果表。这就是"加新小丑牌只改这里"的那张表。
 * 每张牌挑了不同的效果机制做样板：
 *   Joker        —— 固定 +mult
 *   Greedy Joker —— 逐张条件（每张方片 +mult）
 *   Sly Joker    —— 整手条件加 chips（含对子）
 *   Half Joker   —— 数量条件（出牌 ≤3 张）
 *   The Duo      —— xmult（含对子则 ×mult）
 */
export const JOKER_DEFS: JokerDef[] = [
    {
        id: 'j_joker',
        name: '小丑',
        description: '+4 倍率',
        cost: 2,
        rarity: 'Common',
        onHandScored: () => [{ kind: 'add_mult', value: 4 }],
    },
    {
        id: 'j_greedy',
        name: '贪婪小丑',
        description: '每张计分的方片牌 +3 倍率',
        cost: 5,
        rarity: 'Common',
        onCardScored: (card) => (cardHasSuit(card, 'Diamonds') ? [{ kind: 'add_mult', value: 3 }] : []),
    },
    {
        id: 'j_sly',
        name: '狡诈小丑',
        description: '若牌型包含对子，+50 筹码',
        cost: 3,
        rarity: 'Common',
        onHandScored: (ctx) => (handContainsPair(ctx.playedCards) ? [{ kind: 'add_chips', value: 50 }] : []),
    },
    {
        id: 'j_half',
        name: '半个小丑',
        description: '出牌不超过 3 张时，+20 倍率',
        cost: 5,
        rarity: 'Common',
        onHandScored: (ctx) => (ctx.playedCards.length <= 3 ? [{ kind: 'add_mult', value: 20 }] : []),
    },
    {
        id: 'j_duo',
        name: '二重奏',
        description: '若牌型包含对子，倍率 ×2',
        cost: 8,
        rarity: 'Rare',
        onHandScored: (ctx) => (handContainsPair(ctx.playedCards) ? [{ kind: 'x_mult', value: 2 }] : []),
    },
];

const JOKER_BY_ID = new Map<string, JokerDef>(JOKER_DEFS.map((def) => [def.id, def]));

export function getJokerDef(id: string): JokerDef | undefined {
    return JOKER_BY_ID.get(id);
}
