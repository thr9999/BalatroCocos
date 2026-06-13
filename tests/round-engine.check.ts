// 纯规则层自测：node 环境直接跑，不需要 Cocos。
// 运行：npx -y tsx tests/round-engine.check.ts
import { evaluatePokerHand } from '../assets/scripts/core/PokerHand';
import type { PlayingCard } from '../assets/scripts/core/PokerHand';
import { RoundEngine } from '../assets/scripts/core/RoundEngine';
import { BLINDS, getBlindTarget } from '../assets/scripts/core/Blinds';

const assert = {
    ok(value: unknown, message?: string): void {
        if (!value) {
            throw new Error(message ?? `断言失败：期望真值，实际 ${String(value)}`);
        }
    },
    strictEqual(actual: unknown, expected: unknown, message?: string): void {
        if (actual !== expected) {
            throw new Error(message ?? `断言失败：期望 ${String(expected)}，实际 ${String(actual)}`);
        }
    },
};

function card(code: string): PlayingCard {
    const [prefix, rank] = code.split('_');
    const suits = { H: 'Hearts', C: 'Clubs', D: 'Diamonds', S: 'Spades' } as const;
    const rankIds: Record<string, number> = { T: 10, J: 11, Q: 12, K: 13, A: 14 };
    const rankId = rankIds[rank] ?? Number(rank);
    return {
        code,
        suit: suits[prefix as keyof typeof suits],
        rank: rank as PlayingCard['rank'],
        rankId,
        chips: rankId === 14 ? 11 : Math.min(rankId, 10),
        col: 0,
        row: 0,
    };
}

// --- 牌型识别 ---
assert.strictEqual(evaluatePokerHand([card('H_A'), card('S_A')])?.name, 'Pair');
assert.strictEqual(
    evaluatePokerHand([card('H_A'), card('H_K'), card('H_Q'), card('H_J'), card('H_T')])?.name,
    'Straight Flush',
);
assert.strictEqual(
    evaluatePokerHand([card('H_A'), card('S_2'), card('D_3'), card('C_4'), card('H_5')])?.name,
    'Straight',
);

// --- 盲注数值 ---
assert.strictEqual(getBlindTarget(1, 0), 300);
assert.strictEqual(getBlindTarget(1, 1), 450);
assert.strictEqual(getBlindTarget(1, 2), 600);
assert.strictEqual(BLINDS.length, 3);

// --- 回合流程 ---
const engine = new RoundEngine({ targetScore: 300, hands: 4, discards: 3, handSize: 8, maxSelected: 5 });
const dealt = engine.start();
assert.strictEqual(dealt.length, 8);
assert.strictEqual(engine.deckCount, 44);
assert.strictEqual(engine.status, 'playing');

// 选牌上限
for (const c of engine.hand.slice(0, 5)) {
    assert.strictEqual(engine.toggleSelect(c.code), 'selected');
}
assert.strictEqual(engine.toggleSelect(engine.hand[5].code), 'rejected');
assert.strictEqual(engine.toggleSelect(engine.hand[0].code), 'deselected');
assert.strictEqual(engine.selectedCards.length, 4);

// 弃牌后补满
const beforeDiscard = engine.discardsLeft;
const discardResult = engine.discard()!;
assert.strictEqual(discardResult.discardedCards.length, 4);
assert.strictEqual(discardResult.drawnCards.length, 4);
assert.strictEqual(engine.hand.length, 8);
assert.strictEqual(engine.discardsLeft, beforeDiscard - 1);

// 出牌计分
engine.toggleSelect(engine.hand[0].code);
const playResult = engine.play()!;
assert.ok(playResult.score.total > 0);
assert.strictEqual(engine.roundScore, playResult.score.total);
assert.strictEqual(engine.handsLeft, 3);
if (playResult.status === 'playing') {
    assert.strictEqual(engine.hand.length, 8);
}

// 打到回合结束：必然 won 或 lost
let guard = 0;
while (engine.status === 'playing' && guard < 10) {
    guard += 1;
    for (const c of engine.hand.slice(0, 5)) {
        engine.toggleSelect(c.code);
    }
    engine.play();
}
assert.ok(engine.status === 'won' || engine.status === 'lost');
assert.strictEqual(engine.canPlay, false);
assert.strictEqual(engine.canDiscard, false);
assert.strictEqual(engine.play(), null);

console.log(`OK — 回合结束：${engine.status}，得分 ${engine.roundScore} / ${engine.targetScore}`);
