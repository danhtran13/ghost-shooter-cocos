import { _decorator, Component, Node, Vec3, Label, Color } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('StatusHealth')
export class StatusHealth extends Component {

    @property(Node)
    target: Node = null;

    @property
    offsetY: number = 80;

    private readonly newPos = new Vec3();
    private label: Label | null = null;

    onLoad() {
        this.label = this.node.getComponent(Label);
        this.target.on('show-heal-status', this.showHealthChange, this);
        this.node.active = false;
    }

    lateUpdate(deltaTime: number) {
        if (this.target && this.target.isValid && this.node.active) {
            // 1. Lấy vị trí thế giới của Player
            let targetPos = this.target.worldPosition;
            this.newPos.set(targetPos.x, targetPos.y + this.offsetY, targetPos.z);

            this.node.setWorldPosition(this.newPos);
        }
    }

    showHealthChange(amount: string, isHeal: boolean) {
        if (this.label) {
            if (isHeal) {
                this.label.string = `+${amount}`;
                this.label.color = new Color(0, 255, 0, 255);
            } else {
                this.label.string = `-${amount}`;
                this.label.color = new Color(255, 0, 0, 255);
            }
        }
        this.node.active = true;
        setTimeout(() => {
            this.node.active = false;
        }, 1000);
    }
}