// 纯规则层自测：node 环境直接跑，不需要 Cocos。
// 运行：npx -y tsx tests/round-engine.check.ts
import { evaluatePokerHand } from '../assets/scripts/core/PokerHand';
import type { PlayingCard } from '../assets/scripts/core/PokerHand';
import { RoundEngine } from '../assets/scripts/core/RoundEngine';
import { BLINDS, getBlindTarget } from '../assets/scripts/core/Blinds';
import { scoreHand } from '../assets/scripts/core/ScoreEngine';
import { getJokerDef, JOKER_DEFS } from '../assets/scripts/core/Jokers';
import type { JokerInstance } from '../assets/scripts/core/JokerEffect';
import { computeInterest, computeReward } from '../assets/scripts/core/Economy';
import { RunState } from '../assets/scripts/core/RunState';
import { ShopState } from '../assets/scripts/core/ShopState';

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

// --- 经济：奖励结算 ---
assert.strictEqual(computeInterest(0), 0);
assert.strictEqual(computeInterest(4), 0);
assert.strictEqual(computeInterest(12), 2); // floor(12/5)=2
assert.strictEqual(computeInterest(100), 5); // 封顶
// 小盲注(base 3) + 剩 2 次出牌 + 持有 $20 利息 4 = 9
const reward = computeReward(BLINDS[0].reward, 2, 20);
assert.strictEqual(reward.base, 3);
assert.strictEqual(reward.hands, 2);
assert.strictEqual(reward.interest, 4);
assert.strictEqual(reward.total, 9);

// --- RunState：金币 / 小丑牌槽 / 盲注推进 ---
const run = new RunState({ startingMoney: 4, jokerSlots: 2 });
assert.strictEqual(run.money, 4);
assert.strictEqual(run.ante, 1);
assert.strictEqual(run.blindIndex, 0);
assert.strictEqual(run.currentTarget, 300);

run.earn(10);
assert.strictEqual(run.money, 14);
assert.strictEqual(run.trySpend(20), false); // 钱不够
assert.strictEqual(run.trySpend(6), true);
assert.strictEqual(run.money, 8);

assert.strictEqual(run.addJoker(getJokerDef('j_joker')!), true);
assert.strictEqual(run.addJoker(getJokerDef('j_duo')!), true);
assert.strictEqual(run.hasFreeJokerSlot, false);
assert.strictEqual(run.addJoker(getJokerDef('j_sly')!), false); // 满槽
assert.strictEqual(run.jokers.length, 2);

run.advanceBlind();
assert.strictEqual(run.blindIndex, 1); // 大盲注
run.advanceBlind();
assert.strictEqual(run.blindIndex, 2); // Boss
run.advanceBlind();
assert.strictEqual(run.ante, 2); // 进下一底注
assert.strictEqual(run.blindIndex, 0);

// --- ShopState：摆货 / 买 / 重摇（确定性 rng）---
let seed = 0.1;
const fakeRng = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
const shop = new ShopState(JOKER_DEFS, { slots: 2, baseRerollCost: 5 }, fakeRng);
shop.open();
assert.strictEqual(shop.offers.length, 2);
assert.strictEqual(shop.rerollCost, 5);
assert.ok(shop.offers[0].cost > 0);

// 模拟买第 0 个：RunState 扣款 + 标记售出
const buyer = new RunState({ startingMoney: 100, jokerSlots: 5 });
const offer0 = shop.offers[0];
assert.strictEqual(buyer.trySpend(offer0.cost), true);
assert.strictEqual(buyer.addJoker(offer0.def), true);
shop.markSold(0);
assert.strictEqual(shop.offers[0].sold, true);

// 重摇换货、花费+1
shop.reroll();
assert.strictEqual(shop.rerollCost, 6);
assert.strictEqual(shop.offers.length, 2);
assert.strictEqual(shop.offers[0].sold, false);

console.log(`OK — 回合结束：${engine.status}，得分 ${engine.roundScore} / ${engine.targetScore}`);
console.log(`OK — 经济/商店：reward.total=${reward.total}, run.money=${run.money}, shop offers=${shop.offers.map((o) => o.def.id).join(',')}`);
