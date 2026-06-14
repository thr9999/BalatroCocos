import { _decorator, Component, Vec3 } from 'cc';

const { ccclass, property } = _decorator;

/**
 * 轻微漂浮 + 旋转的待机动画，对标原版 DynaText 的 float/rotate（盲注名那种缓慢浮动）。
 * 挂在节点上即可。基于节点当前位置叠加正弦摆动，通用。
 */
@ccclass('FloatBob')
export class FloatBob extends Component {
    @property({ tooltip: '上下漂浮幅度（像素）' })
    public ampY = 5;

    @property({ tooltip: '左右漂浮幅度（像素）' })
    public ampX = 0;

    @property({ tooltip: '旋转摆动幅度（度）' })
    public ampAngle = 2;

    @property({ tooltip: '一个完整周期的秒数' })
    public period = 2.4;

    private base = new Vec3();
    private t = 0;

    protected start(): void {
        this.base = this.node.position.clone();
        this.t = Math.random() * this.period; // 随机相位，多个元素不会齐步
    }

    protected update(dt: number): void {
        this.t += dt;
        const phase = (this.t / this.period) * Math.PI * 2;
        this.node.setPosition(
            this.base.x + Math.sin(phase) * this.ampX,
            this.base.y + Math.sin(phase) * this.ampY,
            this.base.z,
        );
        if (this.ampAngle !== 0) {
            this.node.angle = Math.sin(phase) * this.ampAngle;
        }
    }

    /** 重设基准位置（被 ResponsiveElement 等重新定位后调用）。 */
    public resetBase(): void {
        this.base = this.node.position.clone();
    }
}
