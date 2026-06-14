import { _decorator, Component, UITransform, Vec3 } from 'cc';
import { ResponsiveRoot } from './ResponsiveRoot';
import type { ResponsiveTarget } from './ResponsiveRoot';

const { ccclass, property, executeInEditMode } = _decorator;

/**
 * 挂到任何想要响应式的节点上。位置/尺寸都填"无单位的数字"（以基础单位为单位），
 * 渲染时乘以 ResponsiveRoot.unit 得到真实像素。对标 web：你写 2rem，浏览器算成 px。
 *
 * 你仍然可以在属性里手调这些数字，且它本身就是响应式的（屏幕变 → 自动重排）。
 */
@ccclass('ResponsiveElement')
@executeInEditMode(true)
export class ResponsiveElement extends Component implements ResponsiveTarget {
    @property({ tooltip: '是否按单位设定位置' })
    public applyPosition = true;

    @property({ tooltip: '位置 X（单位数，× 基础单位 = 像素；以父节点中心为原点）' })
    public unitX = 0;

    @property({ tooltip: '位置 Y（单位数，向上为正）' })
    public unitY = 0;

    @property({ tooltip: '是否按单位设定尺寸（需要 UITransform）' })
    public applySize = false;

    @property({ tooltip: '宽（单位数）' })
    public unitW = 0;

    @property({ tooltip: '高（单位数）' })
    public unitH = 0;

    private attached = false;
    private lastKey = '';

    protected onEnable(): void {
        this.attached = false;
        this.tryAttach();
    }

    protected onDisable(): void {
        ResponsiveRoot.current?.unregister(this);
        this.attached = false;
    }

    protected update(): void {
        const root = ResponsiveRoot.current;
        if (!root) {
            return;
        }
        if (!this.attached) {
            root.register(this);
            this.attached = true;
        }
        // 编辑器里改无单位数字、或屏幕变化时实时重排
        const key = `${this.applyPosition}:${this.unitX},${this.unitY}|${this.applySize}:${this.unitW},${this.unitH}|${root.unit}`;
        if (key !== this.lastKey) {
            this.layout(root.unit);
        }
    }

    private tryAttach(): void {
        const root = ResponsiveRoot.current;
        if (root) {
            root.register(this);
            this.attached = true;
        }
    }

    /** 由 ResponsiveRoot 调用：把无单位数字乘以基础单位，落到真实像素。 */
    public layout(unit: number): void {
        if (this.applyPosition) {
            const p = this.node.position;
            this.node.setPosition(new Vec3(this.unitX * unit, this.unitY * unit, p.z));
        }
        if (this.applySize) {
            this.getComponent(UITransform)?.setContentSize(this.unitW * unit, this.unitH * unit);
        }
        this.lastKey = `${this.applyPosition}:${this.unitX},${this.unitY}|${this.applySize}:${this.unitW},${this.unitH}|${unit}`;
    }
}
