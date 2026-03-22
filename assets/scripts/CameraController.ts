import { _decorator, Component, Node, Vec3, math, view, Camera } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CameraController')
export class CameraController extends Component {
    @property({ type: Node, tooltip: 'Node mà camera sẽ bám theo (thường là Player)' })
    target: Node | null = null;

    @property({ tooltip: 'Độ mượt. Càng lớn bám càng nhanh.' })
    smooth = 8;

    @property
    offsetX = 0;

    @property
    offsetY = 0;

    @property({ tooltip: 'Bật để giới hạn camera không đi ra ngoài viền map.' })
    useClamp = true;

    @property
    minX = 0;

    @property
    maxX = 1708;

    @property
    minY = 0;

    @property
    maxY = 960;

    private _desired = new Vec3();
    private _camera: Camera | null = null;

    onLoad() {
        this._camera = this.getComponent(Camera);
    }

    lateUpdate(dt: number) {
        if (!this.target) return;

        const targetPos = this.target.worldPosition;
        const currentPos = this.node.worldPosition;

        this._desired.set(targetPos.x + this.offsetX, targetPos.y + this.offsetY, currentPos.z);

        if (this.useClamp) {
            // Tính toán kích thước nửa màn hình thông qua Camera 2D (Ortho)
            let halfWidth = 0;
            let halfHeight = 0;

            if (this._camera) {
                const visibleSize = view.getVisibleSize();
                halfHeight = this._camera.orthoHeight;
                halfWidth = halfHeight * (visibleSize.width / visibleSize.height);
            } else {
                const visibleSize = view.getVisibleSize();
                halfWidth = visibleSize.width / 2;
                halfHeight = visibleSize.height / 2;
            }

            // Đảm bảo min không lớn hơn max nếu map cấu hình nhỏ hơn khung camera
            const clampMinX = this.minX + halfWidth;
            const clampMaxX = Math.max(clampMinX, this.maxX - halfWidth);
            const clampMinY = this.minY + halfHeight;
            const clampMaxY = Math.max(clampMinY, this.maxY - halfHeight);

            this._desired.x = math.clamp(this._desired.x, clampMinX, clampMaxX);
            this._desired.y = math.clamp(this._desired.y, clampMinY, clampMaxY);
        }

        const lerp = 1 - Math.exp(-this.smooth * dt);
        
        this.node.setWorldPosition(
            currentPos.x + (this._desired.x - currentPos.x) * lerp,
            currentPos.y + (this._desired.y - currentPos.y) * lerp,
            this._desired.z
        );
    }
}



