import { _decorator, Component, Collider2D, Contact2DType, IPhysics2DContact, BoxCollider2D } from 'cc';
import { PlayerController } from './PlayerController';
import { Minimap } from './Minimap';
const { ccclass, property } = _decorator;

@ccclass('HealthItem')
export class HealthItem extends Component {
    @property
    healAmount: number = 20;

    private _isCollected: boolean = false;

    start() {
        // Đăng ký sự kiện va chạm
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

        // Kiểm tra xem đối tượng chạm vào có phải Player không
        // Giả sử Node của player chứa "player" trong tên (hoặc bạn có thể dùng Group)
        if (otherCollider.group === (1 << 1)) {
            // console.log("HealthItem đã chạm vào Player:", otherCollider.node.name);

            // Lấy component PlayerController từ Node vừa chạm vào
            const playerScript = otherCollider.node.getComponent(PlayerController);
            if (playerScript && playerScript.isAlive) {

                // Gọi hàm heal đã có sẵn trong PlayerController
                playerScript.heal(this.healAmount);

                // Đánh dấu đã ăn để tránh nhặt nhiều lần trong cùng 1 frame
                this._isCollected = true;

                // Tuỳ chọn: bạn có thể spawn thêm hiệu ứng lấp lánh ở đây trước khi xoá

                // Xoá node vật phẩm hồi máu một cách an toàn
                setTimeout(() => {
                    if (this.node && this.node.isValid) {
                        this.node.destroy();
                    }
                }, 0);
            }
        }
    }
}