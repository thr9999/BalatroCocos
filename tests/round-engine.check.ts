// 纯规则层自测：node 环境直接跑，不需要 Cocos。
// 运行：npx -y tsx tests/round-engine.check.ts
import { evaluatePokerHand } from '../assets/scripts/core/PokerHand';
import type { PlayingCard } from '../assets/scripts/core/PokerHand';
import { RoundEngine } from '../assets/scripts/core/RoundEngine';
import { BLINDS, getBlindTarget } from '../assets/scripts/core/Blinds';
import { scoreHand } from '../assets/scripts/core/ScoreEngine';
import { getJokerDef } from '../assets/scripts/core/Jokers';
import type { JokerInstance } from '../assets/scripts/core/JokerEffect';

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

// --- 小丑牌效果系统 ---
const joker = (id: string): JokerInstance => ({ def: getJokerDef(id)! });
const pairAA = [card('H_A'), card('S_A')]; // 对A：底分 chips 10+(11+11)=32, mult 2 → 64

// 无小丑牌：基准
const base = scoreHand(pairAA)!;
assert.strictEqual(base.name, 'Pair');
assert.strictEqual(base.chips, 32);
assert.strictEqual(base.mult, 2);
assert.strictEqual(base.total, 64);

// 小丑：+4 mult → (32)*(2+4)=192
assert.strictEqual(scoreHand(pairAA, [joker('j_joker')])!.total, 192);

// 狡诈小丑：含对子 +50 chips → (82)*2=164
assert.strictEqual(scoreHand(pairAA, [joker('j_sly')])!.total, 164);

// 二重奏：含对子 ×2 mult → 32*4=128
assert.strictEqual(scoreHand(pairAA, [joker('j_duo')])!.total, 128);

// 半个小丑：出牌≤3张 +20 mult → 32*(2+20)=704
assert.strictEqual(scoreHand(pairAA, [joker('j_half')])!.total, 704);

// 贪婪小丑：每张计分方片 +3 mult。一对方片 → 32*(2+3+3)=256
assert.strictEqual(scoreHand([card('D_A'), card('D_A')], [joker('j_greedy')])!.total, 256);
// 非方片不触发：一对黑桃仍是基准 64
assert.strictEqual(scoreHand([card('S_A'), card('S_A')], [joker('j_greedy')])!.total, 64);

// 叠加顺序：先加后乘。小丑(+4)+二重奏(×2) → 32*((2+4)*2)=384
assert.strictEqual(scoreHand(pairAA, [joker('j_joker'), joker('j_duo')])!.total, 384);

// RoundEngine 接入小丑牌：play 走计分管线
const jokerRound = new RoundEngine({
    targetScore: 999999,
    hands: 1,
    discards: 0,
    handSize: 8,
    maxSelected: 5,
    jokers: [joker('j_joker')],
});
jokerRound.start();
jokerRound.toggleSelect(jokerRound.hand[0].code);
const jokerPlay = jokerRound.play()!;
// 单张高牌：底 chips=5+牌chips, mult=1, 小丑+4 → mult=5
assert.strictEqual(jokerPlay.score.mult, 5);

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
