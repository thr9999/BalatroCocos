import type { JokerDef } from './JokerEffect';

export type ShopOffer = {
    def: JokerDef;
    cost: number;
    /** 已被买走则标记，保留占位（原作买后是空槽，不会顶上新的）。 */
    sold: boolean;
};

export type ShopConfig = {
    /** 同时摆出的小丑牌数量。 */
    slots: number;
    /** 重摇基础花费。 */
    baseRerollCost: number;
};

const DEFAULT_CONFIG: ShopConfig = { slots: 2, baseRerollCost: 5 };

/**
 * 商店状态（纯逻辑层）。负责"摆什么货"，不碰钱 —— 金币由 RunState 管，
 * 买/重摇时由调用方先用 RunState.trySpend 扣款。
 * rng 可注入，方便确定性测试。
 */
export class ShopState {
    private readonly pool: JokerDef[];
    private readonly config: ShopConfig;
    private readonly rng: () => number;
    private _offers: ShopOffer[] = [];
    private _rerollCost: number;

    constructor(pool: JokerDef[], config: Partial<ShopConfig> = {}, rng: () => number = Math.random) {
        this.pool = pool;
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.rng = rng;
        this._rerollCost = this.config.baseRerollCost;
    }

    public get offers(): readonly ShopOffer[] {
        return this._offers;
    }

    public get rerollCost(): number {
        return this._rerollCost;
    }

    /** 进入新商店时调用：重置重摇花费并补满货架。 */
    public open(): void {
        this._rerollCost = this.config.baseRerollCost;
        this._offers = this.pickOffers();
    }

    /** 重摇：换一批货，重摇花费 +1（扣款由调用方负责）。 */
    public reroll(): void {
        this._offers = this.pickOffers();
        this._rerollCost += 1;
    }

    /** 标记某个货位已售出。 */
    public markSold(index: number): void {
        const offer = this._offers[index];
        if (offer) {
            offer.sold = true;
        }
    }

    private pickOffers(): ShopOffer[] {
        const shuffled = this.pool.slice();
        for (let i = shuffled.length - 1; i > 0; i -= 1) {
            const j = Math.floor(this.rng() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        const count = Math.min(this.config.slots, shuffled.length);
        return shuffled.slice(0, count).map((def) => ({ def, cost: def.cost, sold: false }));
    }
}
