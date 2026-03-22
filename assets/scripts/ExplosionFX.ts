import { _decorator, Component, tween, UIOpacity, math } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ExplosionFX')
export class ExplosionFX extends Component {
    @property
    duration: number = 0.5;

    onLoad() {
        // Đặt góc xoay ngẫu nhiên ngay khi vừa được sinh ra
        this.node.setRotationFromEuler(0, 0, math.randomRange(0, 360));

        // Lấy component UIOpacity (nếu chưa có thì thêm vào)
        let uiOpacity = this.node.getComponent(UIOpacity);
        // Chạy tween giảm độ mờ từ 255 (mặc định) về 0 trong khoảng thời gian duration
        if (uiOpacity) {
            tween(uiOpacity)
                .to(this.duration, { opacity: 0 })
                .call(() => {
                    // Sau khi mờ xong thì huỷ node
                    this.node.destroy();
                })
                .start();
        }
    }
}