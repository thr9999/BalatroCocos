import { BLINDS, MAX_ANTE, getBlindTarget } from './Blinds';
import type { JokerDef, JokerInstance } from './JokerEffect';

export type RunConfig = {
    startingMoney: number;
    jokerSlots: number;
};

/**
 * 一局游戏（run）的持久状态：金币、持有的小丑牌、底注/盲注进度。
 * 跨回合存活，纯逻辑层。RoundEngine 是单回合，RunState 管整局。
 */
export class RunState {
    private readonly config: RunConfig;
    private _money = 0;
    private _jokers: JokerInstance[] = [];
    private _ante = 1;
    private _blindIndex = 0;

    constructor(config: RunConfig) {
        this.config = config;
        this.reset();
    }

    public reset(): void {
        this._money = this.config.startingMoney;
        this._jokers = [];
        this._ante = 1;
        this._blindIndex = 0;
    }

    public get money(): number {
        return this._money;
    }

    public get jokers(): readonly JokerInstance[] {
        return this._jokers;
    }

    public get jokerSlots(): number {
        return this.config.jokerSlots;
    }

    public get hasFreeJokerSlot(): boolean {
        return this._jokers.length < this.config.jokerSlots;
    }

    public get ante(): number {
        return this._ante;
    }

    public get blindIndex(): number {
        return this._blindIndex;
    }

    public get currentTarget(): number {
        return getBlindTarget(this._ante, this._blindIndex);
    }

    /** 当前是否处在最终盲注（最高底注的 Boss）。打过即通关。 */
    public get isFinalBlind(): boolean {
        return this._ante >= MAX_ANTE && this._blindIndex >= BLINDS.length - 1;
    }

    public earn(amount: number): void {
        this._money += Math.max(0, Math.floor(amount));
    }

    /** 尝试花钱，钱够则扣除并返回 true。 */
    public trySpend(amount: number): boolean {
        if (amount < 0 || this._money < amount) {
            return false;
        }
        this._money -= amount;
        return true;
    }

    /** 加一张小丑牌（满槽则失败）。 */
    public addJoker(def: JokerDef): boolean {
        if (!this.hasFreeJokerSlot) {
            return false;
        }
        this._jokers.push({ def });
        return true;
    }

    public removeJokerAt(index: number): JokerInstance | null {
        if (index < 0 || index >= this._jokers.length) {
            return null;
        }
        return this._jokers.splice(index, 1)[0];
    }

    /** 进入下一个盲注（小→大→Boss→下一底注的小）。不跨越通关，由调用方先判 isFinalBlind。 */
    public advanceBlind(): void {
        this._blindIndex += 1;
        if (this._blindIndex >= BLINDS.length) {
            this._blindIndex = 0;
            this._ante += 1;
        }
    }
}
