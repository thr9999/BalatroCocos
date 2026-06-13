/**
 * 经济规则（纯逻辑层）。通过盲注后结算金币奖励。
 * 忠实于原作的三部分：盲注基础奖励 + 剩余出牌数 + 利息。
 */

/** 利息上限：每持有 $5 得 $1，最多 $5（即持有 $25 封顶）。 */
export const INTEREST_CAP = 5;
export const INTEREST_PER = 5;

export type RewardBreakdown = {
    /** 盲注基础奖励。 */
    base: number;
    /** 每个未用出牌次数 +$1。 */
    hands: number;
    /** 利息。 */
    interest: number;
    total: number;
};

export function computeInterest(money: number): number {
    if (money <= 0) {
        return 0;
    }
    return Math.min(Math.floor(money / INTEREST_PER), INTEREST_CAP);
}

export function computeReward(blindReward: number, remainingHands: number, money: number): RewardBreakdown {
    const base = Math.max(0, blindReward);
    const hands = Math.max(0, remainingHands);
    const interest = computeInterest(money);
    return {
        base,
        hands,
        interest,
        total: base + hands + interest,
    };
}
