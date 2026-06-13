import { evaluatePokerHand } from './PokerHand';
import type { PlayingCard, PokerHandName } from './PokerHand';
import type { JokerEffect, JokerInstance, ScoreContext, ScorePhase } from './JokerEffect';

/**
 * 计分管线 —— 把一手牌跑成最终分数，并记录每一步用于将来做"筹码逐个跳"的动画。
 *
 * 顺序（忠实于原作）：
 *   1. 牌型底分（base chips / base mult）
 *   2. 逐张计分牌：加该牌筹码 → 触发各小丑牌 onCardScored（从左到右）
 *   3. 整手：触发各小丑牌 onHandScored（从左到右）
 *   4. total = floor(chips × mult)
 */

/** 计分过程中的一步，供动画/调试展示。 */
export type ScoreStep = {
    /** 该步来源的显示名（牌型 / 牌面 / 小丑牌名）。 */
    source: string;
    phase: ScorePhase | 'base';
    effect: JokerEffect | null;
    chipsAfter: number;
    multAfter: number;
};

export type ScoreResult = {
    name: PokerHandName;
    displayName: string;
    chips: number;
    mult: number;
    total: number;
    money: number;
    steps: ScoreStep[];
};

export function scoreHand(playedCards: PlayingCard[], jokers: JokerInstance[] = []): ScoreResult | null {
    const evalResult = evaluatePokerHand(playedCards);
    if (!evalResult) {
        return null;
    }

    let chips = evalResult.baseChips;
    let mult = evalResult.mult;
    let money = 0;
    const steps: ScoreStep[] = [];

    const recordBase = () => {
        steps.push({
            source: evalResult.displayName,
            phase: 'base',
            effect: null,
            chipsAfter: chips,
            multAfter: mult,
        });
    };

    const applyEffect = (source: string, phase: ScorePhase, effect: JokerEffect) => {
        switch (effect.kind) {
            case 'add_chips':
                chips += effect.value;
                break;
            case 'add_mult':
                mult += effect.value;
                break;
            case 'x_mult':
                mult *= effect.value;
                break;
            case 'add_money':
                money += effect.value;
                break;
        }
        steps.push({ source, phase, effect, chipsAfter: chips, multAfter: mult });
    };

    const makeContext = (phase: ScorePhase, currentCard: PlayingCard | null): ScoreContext => ({
        phase,
        handType: evalResult.name,
        playedCards,
        scoringCards: evalResult.scoringCards,
        currentCard,
        chips,
        mult,
    });

    recordBase();

    // 2. 逐张计分牌
    for (const card of evalResult.scoringCards) {
        chips += card.chips;
        steps.push({
            source: `${card.code}`,
            phase: 'on_card_scored',
            effect: { kind: 'add_chips', value: card.chips },
            chipsAfter: chips,
            multAfter: mult,
        });

        for (const joker of jokers) {
            const effects = joker.def.onCardScored?.(card, makeContext('on_card_scored', card)) ?? [];
            for (const effect of effects) {
                applyEffect(joker.def.name, 'on_card_scored', effect);
            }
        }
    }

    // 3. 整手计分
    for (const joker of jokers) {
        const effects = joker.def.onHandScored?.(makeContext('on_hand_scored', null)) ?? [];
        for (const effect of effects) {
            applyEffect(joker.def.name, 'on_hand_scored', effect);
        }
    }

    const total = Math.floor(chips * mult);

    return {
        name: evalResult.name,
        displayName: evalResult.displayName,
        chips,
        mult,
        total,
        money,
        steps,
    };
}
