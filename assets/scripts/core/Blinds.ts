export type BlindId = 'small' | 'big' | 'boss';

export type BlindDef = {
    id: BlindId;
    name: string;
    scoreMult: number;
    /** 通过该盲注的基础金币奖励（原作 $$$ 标记）。 */
    reward: number;
};

export const BLINDS: BlindDef[] = [
    { id: 'small', name: 'Small Blind', scoreMult: 1, reward: 3 },
    { id: 'big', name: 'Big Blind', scoreMult: 1.5, reward: 4 },
    { id: 'boss', name: 'Boss Blind', scoreMult: 2, reward: 5 },
];

// 原作白注难度的底注基础分曲线，下标即 ante（0 为练习关，正式从 1 开始）
const ANTE_BASE_SCORES = [100, 300, 800, 2000, 5000, 11000, 20000, 35000, 50000];

export const MAX_ANTE = 8;

export function getBlindTarget(ante: number, blindIndex: number): number {
    const clampedAnte = Math.min(Math.max(ante, 0), ANTE_BASE_SCORES.length - 1);
    const blind = BLINDS[blindIndex] ?? BLINDS[0];
    return Math.floor(ANTE_BASE_SCORES[clampedAnte] * blind.scoreMult);
}
