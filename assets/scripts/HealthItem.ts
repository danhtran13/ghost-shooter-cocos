import { _decorator, Component, Collider2D, Contact2DType, IPhysics2DContact, BoxCollider2D } from 'cc';
import { PlayerController } from './PlayerController';
import { Minimap } from './Minimap';
import { PHYSICS_GROUP } from './utils/GameConfig';
const { ccclass, property } = _decorator;

@ccclass('HealthItem')
export class HealthItem extends Component {
    @property
    healAmount: number = 20;

    private _isCollected: boolean = false;

    start() {
        let collider = this.getComponent(Collider2D);
        if (collider) {
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
            // console.log("✅ Đã thiết lập xong va chạm cho:", this.node.name);
        }
        if (Minimap.instance) Minimap.instance.registerHealthItem(this.node);
    }

    onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        // console.log("HealthItem va chạm với:", otherCollider.node.name);

        if (this._isCollected) return;

        if (otherCollider.group === PHYSICS_GROUP.PLAYER) {
            // console.log("HealthItem đã chạm vào Player:", otherCollider.node.name);

            const playerScript = otherCollider.node.getComponent(PlayerController);
            if (playerScript && playerScript.isAlive) {
                playerScript.heal(this.healAmount);
                this._isCollected = true;

                this.scheduleOnce(() => {
                    if (this.node && this.node.isValid) {
                        this.node.destroy();
                    }
                }, 0);
            }
        }
    }
}