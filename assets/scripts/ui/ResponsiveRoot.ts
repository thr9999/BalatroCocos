import { _decorator, Component, UITransform } from 'cc';

const { ccclass, property, executeInEditMode } = _decorator;

/** 任何想响应基础单位的目标，实现这个接口即可（ResponsiveElement 实现了它）。 */
export interface ResponsiveTarget {
    layout(unit: number): void;
}

/**
 * 响应式根（挂在 Canvas 上）。整个 UI 的"基础单位"唯一来源 —— 对标 web 的 :root font-size / rem。
 *
 * unit = 屏幕高度 / unitsTall。屏幕/分辨率变化时实时重算，并通知所有 ResponsiveElement 重新布局。
 * 各元素只存"无单位的数字"，乘以这个 unit 得到真实像素。改一处 unitsTall，全盘等比。
 *
 * 注：若 Canvas 用 Fit Height，设计高度恒定，unit 也恒定（缩放交给 Canvas）；
 * 若关掉 Fit、让 Canvas 跟随窗口，unit 就会随窗口实时变 —— 两种模式这套都成立。
 */
@ccclass('ResponsiveRoot')
@executeInEditMode(true)
export class ResponsiveRoot extends Component {
    @property({ tooltip: '屏幕高度 = 多少个基础单位（对标原版房间高 11.5）' })
    public unitsTall = 11.5;

    /** 没有 ResponsiveRoot 时的兜底每-tile 像素（1080 / 11.25 = 96）。 */
    public static readonly DEFAULT_UNIT = 96;

    private static _current: ResponsiveRoot | null = null;
    private _unit = 1;
    private _lastHeight = 0;
    private targets = new Set<ResponsiveTarget>();

    /** 当前生效的根（供 ResponsiveElement 和动态生成代码取 unit）。 */
    public static get current(): ResponsiveRoot | null {
        return ResponsiveRoot._current;
    }

    public get unit(): number {
        return this._unit;
    }

    protected onEnable(): void {
        ResponsiveRoot._current = this;
        this.recompute();
    }

    protected onDisable(): void {
        if (ResponsiveRoot._current === this) {
            ResponsiveRoot._current = null;
        }
    }

    protected update(): void {
        // 轮询高度变化即可覆盖所有"屏幕/分辨率/编辑器视口变化"，不依赖具体事件名
        const height = this.getComponent(UITransform)?.height ?? 0;
        if (height > 0 && height !== this._lastHeight) {
            this.recompute();
        }
    }

    public register(target: ResponsiveTarget): void {
        this.targets.add(target);
        target.layout(this._unit);
    }

    public unregister(target: ResponsiveTarget): void {
        this.targets.delete(target);
    }

    private recompute(): void {
        const height = this.getComponent(UITransform)?.height ?? 0;
        if (height <= 0) {
            return;
        }
        this._lastHeight = height;
        this._unit = height / this.unitsTall;
        this.targets.forEach((t) => t.layout(this._unit));
    }
}
