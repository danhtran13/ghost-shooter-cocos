import { _decorator, Component, Node, Vec3, math, Collider2D, Contact2DType, IPhysics2DContact, Prefab, director, instantiate } from 'cc';
import { PlayerController } from './PlayerController';
const { ccclass, property } = _decorator;

@ccclass('Monster')
export class Monster extends Component {
    player: Node | null = null;

    @property({ type: Prefab })
    bullet: Prefab | null = null;

    @property({ type: Prefab, tooltip: 'Prefab hiệu ứng nổ (Explosion)' })
    explosionPrefab: Prefab | null = null;

    @property({ tooltip: 'Tốc độ di chuyển quái vật' })
    moveSpeed = 50;

    @property({ tooltip: 'Lượng máu của quái (Tính bằng số viên đạn)' })
    maxHealth = 4;

    @property({ tooltip: 'Sát thương gây ra cho Player khi va chạm' })
    damageToPlayer = 20;

    // Giới hạn bản đồ để quái đập tường nảy lới
    @property
    minX = 0;
    @property
    maxX = 1708;
    @property
    minY = 0;
    @property
    maxY = 960;

    private _currentHealth = 0;
    private _velocity = new Vec3();
    private _isDead = false;
    private _speedUpTimer = 0;

    start() {
        this._currentHealth = this.maxHealth;

        // Bắt sự kiện va chạm vật lý 2D (Bạn cần gắn Collider2D trên Editor cho Monster)
        const collider = this.getComponent(Collider2D);
        if (collider) {
            collider.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact, this);
        }

        // Khởi tạo ban đầu: Chọn một hướng ngẫu nhiên để di chuyển
        const randomAngle = math.randomRange(0, Math.PI * 2);
        this._velocity.set(Math.cos(randomAngle), Math.sin(randomAngle), 0);
        this.node.setRotationFromEuler(0, 0, randomAngle * (180 / Math.PI));
    }

    update(deltaTime: number) {
        if (this._isDead) return;

        // Bấm giờ: Mỗi 5 giây sẽ tăng tốc độ di chuyển thêm 10
        this._speedUpTimer += deltaTime;
        if (this._speedUpTimer >= 5) {
            this.moveSpeed += 10;
            this._speedUpTimer -= 5; // Reset lại bộ đếm bớt đi 5s
        }

        const pos = this.node.worldPosition;

        // Nếu lại gần player trong khoảng cách 300 thì đổi góc về hướng player
        if (this.player) {
            const tPos = this.player.worldPosition;
            const dx = tPos.x - pos.x;
            const dy = tPos.y - pos.y;
            // 300 * 300 = 90000 (Dùng bình phương khoảng cách để tối ưu hiệu năng)
            if (dx * dx + dy * dy <= 30000) {
                this.recalculateDirection();
            }
        }


        // Di chuyển tiếp theo hướng velocity (hướng góc) hiện tại
        let nextX = pos.x + this._velocity.x * this.moveSpeed * deltaTime;
        let nextY = pos.y + this._velocity.y * this.moveSpeed * deltaTime;

        // Kiểm tra xem quái có sắp chạm viền map không?
        let hitWall = false;

        if (nextX <= this.minX) {
            nextX = this.minX;
            hitWall = true;
        } else if (nextX >= this.maxX) {
            nextX = this.maxX;
            hitWall = true;
        }

        if (nextY <= this.minY) {
            nextY = this.minY;
            hitWall = true;
        } else if (nextY >= this.maxY) {
            nextY = this.maxY;
            hitWall = true;
        }

        this.node.setWorldPosition(nextX, nextY, pos.z);

        // Nếu đập lề, tính lại vận tốc trỏ thẳng vào Player
        if (hitWall) {
            this.recalculateDirection();
        }
    }

    private recalculateDirection() {
        if (!this.player) return;

        const currentPos = this.node.worldPosition;
        const targetPos = this.player.worldPosition;

        const dirX = targetPos.x - currentPos.x;
        const dirY = targetPos.y - currentPos.y;

        const length = Math.sqrt(dirX * dirX + dirY * dirY);
        if (length > 0) {
            // Chuẩn hoá vector hướng (độ dài = 1)
            this._velocity.set(dirX / length, dirY / length, 0);

            // Cập nhật góc nhìn của quái để mặt luôn quay về hướng di chuyển
            const angle = Math.atan2(this._velocity.y, this._velocity.x) * (180 / Math.PI);
            // Đổi offset này tuỳ theo mặt ảnh quái vật của bạn đang hướng lên trên (-90) hay ngang
            this.node.setRotationFromEuler(0, 0, angle);
        }
    }

    onBeginContact(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null) {
        // console.log("🔥 Monster vừa va chạm với:", otherCollider.node.name); // THÊM DÒNG NÀY ĐỂ DEBUG

        if (this._isDead) return;

        // Nếu va chạm trúng Đạn (Cần đặt Group hoặc TAG bên Editor để phân biệt đạn, ví dụ: nhóm "Bullet")
        if (otherCollider.node.name.toLowerCase().includes("bullet")) {
            console.log("=> Đây là đạn! Trừ máu quái và xoá đạn."); // DEBUG

            this.takeDamage(1);

            // Lên lịch xoá đạn (tránh lỗi vật lý trong cùng block frame)
            setTimeout(() => {
                if (otherCollider.node && otherCollider.node.isValid) {
                    // Spawn hiệu ứng nổ tại vị trí viên đạn
                    if (this.explosionPrefab) {
                        const explosionNode = instantiate(this.explosionPrefab);
                        const parentNode = this.node.parent || director.getScene();
                        if (parentNode) {
                            explosionNode.setParent(parentNode);
                            explosionNode.setWorldPosition(otherCollider.node.worldPosition);
                        }
                    }
                    otherCollider.node.destroy();
                }
            }, 0);
        }

        // Nếu va chạm trúng Player (Ví dụ bạn đặt tên node là "Player")
        if (otherCollider.node.name.toLowerCase() === "player" || otherCollider.node.name.toLowerCase().includes("player")) {
            // console.log("=> Monster đã tông trúng Player! Trừ máu Player."); // DEBUG
            const playerScript = otherCollider.node.getComponent(PlayerController);
            if (playerScript) {
                playerScript.applyDamage(this.damageToPlayer);
                playerScript.flashPlayer();
                this.die();
            } else {
                console.warn("⚠️ Player không có component PlayerController!");
            }
        }
    }

    takeDamage(amount: number) {
        this._currentHealth -= amount;

        // Bạn có thể thêm animation nháy đỏ khi bị trúng đạn ở đây

        if (this._currentHealth <= 0) {
            // Khi quái hết máu do bị bắn -> Phát sự kiện cộng điểm toàn cục
            director.emit('monster-killed');
            this.die();
        }
    }

    die() {
        if (this._isDead) return;
        this._isDead = true;

        // Cần đưa vào setTimeout để tránh xoá RigidBody/Collider 
        // ngay trong lúc hệ thống vật lý đang tính toán va chạm
        setTimeout(() => {
            if (this.node && this.node.isValid) {
                // Disable Collider tránh gây thêm damage dư thừa
                const collider = this.getComponent(Collider2D);
                if (collider) collider.enabled = false;

                // Sinh hiệu ứng nổ tại toạ độ của quái trước khi xoá
                if (this.explosionPrefab) {
                    const explosionNode = instantiate(this.explosionPrefab);

                    // Lấy cha của monster (ví dụ Canvas hoặc root node nào đó) để gắn explosion vào
                    const parentNode = this.node.parent || director.getScene();
                    if (parentNode) {
                        explosionNode.setParent(parentNode);
                        explosionNode.setWorldPosition(this.node.worldPosition);
                    }
                }

                // Huỷ quái vật
                this.node.destroy();
            }
        }, 0);
    }
}


