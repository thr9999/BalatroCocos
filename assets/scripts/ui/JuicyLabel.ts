import { _decorator, Component, Label, Tween, tween, Vec3 } from 'cc';

const { ccclass, property, requireComponent } = _decorator;

/**
 * 数字"juice"：Label 文本变化时弹一下（放大回弹），对标原版 DynaText 的 bump。
 * 挂在任意带 Label 的节点上即可，自动检测文本变化触发。通用，别处也能用。
 */
@ccclass('JuicyLabel')
@requireComponent(Label)
export class JuicyLabel extends Component {
    @property({ tooltip: '弹起的最大放大倍数' })
    public bumpScale = 1.3;

    @property({ tooltip: '一次弹动的总时长（秒）' })
    public bumpTime = 0.16;

    private label: Label | null = null;
    private baseScale = new Vec3(1, 1, 1);
    private lastText = '';

    protected start(): void {
        this.label = this.getComponent(Label);
        this.baseScale = this.node.scale.clone();
        this.lastText = this.label?.string ?? '';
    }

    protected update(): void {
        if (!this.label) {
            return;
        }
        if (this.label.string !== this.lastText) {
            this.lastText = this.label.string;
            this.bump();
        }
    }

    public bump(): void {
        Tween.stopAllByTarget(this.node);
        const up = new Vec3(this.baseScale.x * this.bumpScale, this.baseScale.y * this.bumpScale, this.baseScale.z);
        tween(this.node)
            .to(this.bumpTime * 0.4, { scale: up }, { easing: 'quadOut' })
            .to(this.bumpTime * 0.6, { scale: this.baseScale }, { easing: 'backOut' })
            .start();
    }
}
