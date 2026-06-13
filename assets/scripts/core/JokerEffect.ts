import type { PlayingCard, PokerHandName, Suit } from './PokerHand';

/**
 * 小丑牌效果系统 —— 纯逻辑层，不依赖 cc。
 *
 * 设计思路（模仿原作）：计分时引擎把"当前局面"打包成 context 交给每张
 * 小丑牌，小丑牌只读 context、返回一组「效果」，引擎再把效果作用到
 * chips / mult / money 上。以后加原创小丑牌＝在效果表里加一条，
 * 不用改计分代码。
 */

/** 计分阶段。目前实现两段：逐张计分、整手计分。 */
export type ScorePhase = 'on_card_scored' | 'on_hand_scored';

/** 计分时交给每张小丑牌的只读局面快照。 */
export type ScoreContext = {
    phase: ScorePhase;
    handType: PokerHandName;
    playedCards: readonly PlayingCard[];
    scoringCards: readonly PlayingCard[];
    /** on_card_scored 阶段：当前正在结算的那张牌。 */
    currentCard: PlayingCard | null;
    /** 当前累计的 chips / mult，供 xmult 等需要读当前值的效果参考。 */
    chips: number;
    mult: number;
};

/** 小丑牌能返回的效果种类。先实现这几种，retrigger / 造牌等以后再加。 */
export type JokerEffect =
    | { kind: 'add_chips'; value: number }
    | { kind: 'add_mult'; value: number }
    | { kind: 'x_mult'; value: number }
    | { kind: 'add_money'; value: number };

export type JokerRarity = 'Common' | 'Uncommon' | 'Rare' | 'Legendary';

/**
 * 一张小丑牌的定义。effect 表里的一条。
 * onCardScored / onHandScored 都是可选钩子，按需实现。
 */
export type JokerDef = {
    id: string;
    name: string;
    description: string;
    cost: number;
    rarity: JokerRarity;
    /** 逐张计分时触发（如"每张方片 +3 mult"）。 */
    onCardScored?: (card: PlayingCard, ctx: ScoreContext) => JokerEffect[];
    /** 整手计分时触发（如"+4 mult"、"含对子则 X2"）。 */
    onHandScored?: (ctx: ScoreContext) => JokerEffect[];
};

/** 运行时持有的小丑牌实例（未来会带等级、临时加成等状态，现在先只裹定义）。 */
export type JokerInstance = {
    def: JokerDef;
};

// --- 牌型判定工具：供条件型小丑牌使用 ---

function rankCountsDesc(cards: readonly PlayingCard[]): number[] {
    const counts = new Map<number, number>();
    for (const card of cards) {
        counts.set(card.rankId, (counts.get(card.rankId) ?? 0) + 1);
    }
    return [...counts.values()].sort((a, b) => b - a);
}

/** 这手牌里是否「包含」对子（对子/两对/三条/葫芦/四条都算）。 */
export function handContainsPair(cards: readonly PlayingCard[]): boolean {
    return (rankCountsDesc(cards)[0] ?? 0) >= 2;
}

/** 这手牌里是否「包含」三条。 */
export function handContainsThreeOfAKind(cards: readonly PlayingCard[]): boolean {
    return (rankCountsDesc(cards)[0] ?? 0) >= 3;
}

export function cardHasSuit(card: PlayingCard, suit: Suit): boolean {
    return card.suit === suit;
}
