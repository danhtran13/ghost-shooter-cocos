import { _decorator, Component, Node, input, Input, EventKeyboard, EventMouse, KeyCode, Vec2, Vec3, Camera, Prefab, instantiate, isValid, math, director, UIOpacity, tween, RigidBody2D, AudioSource, Label,
} from 'cc';
import { DataManager } from './DataManager';
import { GameController } from './GameController';
import { GameState } from './utils/GameConfig';
import { StatusHealth } from './StatusHeal';
const { ccclass, property } = _decorator;

type RuntimeBullet = {
    node: Node;
    velocity: Vec3;
    lifeLeft: number;
    hasRigidBody: boolean;
};

@ccclass('PlayerController')
export class PlayerController extends Component {
    @property({ type: Camera, tooltip: 'Main camera used to convert mouse screen position to world position.' })
    worldCamera: Camera | null = null;

    @property(Node)
    gunPoint: Node | null = null;

    @property({ type: StatusHealth, tooltip: 'Floating text to display player status health information.' })
    statusHealth: StatusHealth | null = null;

    @property({ type: Prefab, tooltip: 'Bullet prefab to spawn on left click.' })
    bulletPrefab: Prefab | null = null;

    @property({ type: Node, tooltip: 'Optional root node that stores bullets. If empty, use player parent.' })
    bulletRoot: Node | null = null;

    @property({ tooltip: 'Player move speed in world units per second.' })
    moveSpeed = 260;

    @property({ tooltip: 'Player max health.' })
    maxHealth = 100;

    @property({ tooltip: 'Maximum ammo before reload is needed.' })
    maxAmmo = 20;

    @property({ tooltip: 'Seconds needed to fully reload ammo.' })
    reloadDuration = 3;

    @property({ tooltip: 'Minimum delay between shots (seconds).' })
    fireInterval = 0.08;

    @property({ tooltip: 'Bullet speed in world units per second.' })
    bulletSpeed = 400;

    @property({ tooltip: 'Bullet lifetime in seconds before auto destroy.' })
    bulletLifetime = 2;

    @property({ tooltip: 'Skill cooldown in seconds (right mouse dash).' })
    dashCooldown = 10;
    
    @property({ tooltip: 'Maximum dash distance in world units.' })
    dashDistance = 300;

    @property({ tooltip: 'Minimum X world boundary for player movement.' })
    minX = 0;

    @property({ tooltip: 'Maximum X world boundary for player movement.' })
    maxX = 1708;

    @property({ tooltip: 'Minimum Y world boundary for player movement.' })
    minY = 0;

    @property({ tooltip: 'Maximum Y world boundary for player movement.' })
    maxY = 960;

    private readonly _pressedKeys = new Set<KeyCode>();
    private readonly _tmpMove = new Vec2();
    private readonly _mouseWorldPos = new Vec3();
    private readonly _mouseScreenPos = new Vec3();

    private sizePlayer = 99;
    private _hasAim = false;
    private _ammo = 0;
    private _health = 0;
    private _fireTimer = 0;
    private _reloadTimer = 0;
    private _dashTimer = 0;
    private _isReloading = false;
    private _isAlive = true;
    private _runtimeBullets: RuntimeBullet[] = [];

    get ammo(): number {
        return this._ammo;
    }

    get health(): number {
        return this._health;
    }

    get isAlive(): boolean {
        return this._isAlive;
    }

    onLoad() {
        this._ammo = this.maxAmmo;
        this._health = this.maxHealth;
        this.emitState();
    }

    onEnable() {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        input.on(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
        input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
    }

    onDisable() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        input.off(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
        input.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
    }

    start() {
        if (!this.worldCamera) {
            const scene = director.getScene();
            // Lấy Camera đang cấu hình trong Scene nếu bị null
            this.worldCamera = scene?.getComponentInChildren(Camera) || null;
        }
    }

    update(deltaTime: number) {
        if (GameController.currentState !== GameState.PLAYING) return;
        if (!this._isAlive) {
            this.updateRuntimeBullets(deltaTime);
            return;
        }

        this._fireTimer = Math.max(0, this._fireTimer - deltaTime);
        const oldDashTimer = this._dashTimer;
        this._dashTimer = Math.max(0, this._dashTimer - deltaTime);
        if (oldDashTimer > 0) {
            this.node.emit('player-skill-cooldown', this._dashTimer, this.dashCooldown);
        }

        this.updateReload(deltaTime);
        this.updateMovement(deltaTime);
        this.updateAimRotation();
        this.updateRuntimeBullets(deltaTime);
    }

    applyDamage(amount: number) {
        if (!this._isAlive || amount <= 0) {
            return;
        }

        this._health = Math.max(0, this._health - amount);
        this.node.emit('player-hit', amount);
        this.node.emit('player-health-changed', this._health, this.maxHealth);
        this.node.emit('show-heal-status', amount, false);

        if (this._health <= 0) {
            this.die();
        }
    }

    flashPlayer() {
        const opacity = this.node.getComponent(UIOpacity);
        tween(opacity)
            .repeat(8,
                tween()
                    .to(0.1, { opacity: 0 })
                    .to(0.1, { opacity: 255 })
            )
            .start();
    }

    heal(amount: number) {
        if (!this._isAlive || amount <= 0) {
            return;
        }

        this._health = Math.min(this.maxHealth, this._health + amount);
        this.node.emit('player-health-changed', this._health, this.maxHealth);
        this.node.emit('show-heal-status', amount, true);
    }

    resetPlayerState() {
        this._isAlive = true;
        this._isReloading = false;
        this._reloadTimer = 0;
        this._dashTimer = 0;
        this._fireTimer = 0;
        this._ammo = this.maxAmmo;
        this._health = this.maxHealth;
        this.emitState();
    }

    private onKeyDown(event: EventKeyboard) {
        this._pressedKeys.add(event.keyCode);
    }

    private onKeyUp(event: EventKeyboard) {
        this._pressedKeys.delete(event.keyCode);
    }

    private onMouseMove(event: EventMouse) {
        this.setAimFromScreen(event.getLocationX(), event.getLocationY());
    }

    private onMouseDown(event: EventMouse) {
        if (GameController.currentState !== GameState.PLAYING) return;
        this.setAimFromScreen(event.getLocationX(), event.getLocationY());

        if (!this._isAlive) {
            return;
        }

        if (event.getButton() === EventMouse.BUTTON_LEFT) {
            this.tryShoot();
        }

        if (event.getButton() === EventMouse.BUTTON_RIGHT) {
            this.tryDash();
        }
    }

    private setAimFromScreen(x: number, y: number) {
        this._mouseScreenPos.set(x, y, 0); // Lưu lại toạ độ chuột màn hình cuối cùng

        if (!this.worldCamera) {
            return;
        }
        this.worldCamera.screenToWorld(this._mouseScreenPos, this._mouseWorldPos);
        this._hasAim = true;
    }

    private updateMovement(deltaTime: number) {
        this._tmpMove.set(0, 0);

        if (this.isDown(KeyCode.KEY_A)) this._tmpMove.x -= 1;
        if (this.isDown(KeyCode.KEY_D)) this._tmpMove.x += 1;
        if (this.isDown(KeyCode.KEY_W)) this._tmpMove.y += 1;
        if (this.isDown(KeyCode.KEY_S)) this._tmpMove.y -= 1;

        if (this._tmpMove.lengthSqr() <= 0) {
            return;
        }

        this._tmpMove.normalize();
        const stepX = this._tmpMove.x * this.moveSpeed * deltaTime;
        const stepY = this._tmpMove.y * this.moveSpeed * deltaTime;

        const current = this.node.worldPosition;
        const nextX = math.clamp(current.x + stepX, this.minX + this.sizePlayer / 2, this.maxX - this.sizePlayer / 2);
        const nextY = math.clamp(current.y + stepY, this.minY + this.sizePlayer / 2, this.maxY - this.sizePlayer / 2);
        this.node.setWorldPosition(nextX, nextY, current.z);
    }

    private updateAimRotation() {
        if (!this._hasAim || !this._isAlive || !this.worldCamera) {
            return;
        }

        // Liên tục cập nhật lại vị trí trỏ chuột theo thế giới mỗi frame (nếu camera hoặc character di chuyển)
        this.worldCamera.screenToWorld(this._mouseScreenPos, this._mouseWorldPos);

        const dir = new Vec3(
            this._mouseWorldPos.x - this.node.worldPosition.x,
            this._mouseWorldPos.y - this.node.worldPosition.y,
            0
        );

        const angle = Math.atan2(dir.y, dir.x) * (180 / Math.PI);
        this.node.setRotationFromEuler(0, 0, angle);
    }

    private tryShoot() {
        if (this._fireTimer > 0 || this._isReloading) {
            return;
        }

        if (this._ammo <= 0) {
            this.startReload();
            return;
        }

        if (!this._hasAim) {
            return;
        }

        this.spawnBullet();
        this._ammo -= 1;
        this._fireTimer = this.fireInterval;
        this.node.emit('player-shoot');
        this.node.emit('player-ammo-changed', this._ammo, this.maxAmmo);
        
        // Phát âm thanh bắn đạn
        let audioSource = this.getComponent(AudioSource);
        if (audioSource) {
            let canPlaySound = true;
            if (DataManager.instance) {
                canPlaySound = DataManager.instance.isSoundOn;
            }

            if (canPlaySound) {
                audioSource.play();
            }
        }

        if (this._ammo <= 0) {
            this.startReload();
        }
    }

    private spawnBullet() {
        if (!this.bulletPrefab) {
            return;
        }

        const bulletNode = instantiate(this.bulletPrefab);
        const parent = this.bulletRoot ?? this.node.parent;
        if (!parent) {
            bulletNode.destroy();
            return;
        }

        bulletNode.setParent(parent);

        // Bắn đạn từ vị trí nòng súng (nếu có null thì dùng vị trí player)
        const startPos = this.gunPoint ? this.gunPoint.worldPosition : this.node.worldPosition;
        bulletNode.setWorldPosition(startPos);

        const origin = startPos;
        const aimX = this._mouseWorldPos.x - origin.x;
        const aimY = this._mouseWorldPos.y - origin.y;
        const len = Math.sqrt(aimX * aimX + aimY * aimY);
        if (len <= 0.0001) {
            bulletNode.destroy();
            return;
        }

        const bulletAngle = Math.atan2(aimY, aimX) * (180 / Math.PI);
        bulletNode.setRotationFromEuler(0, 0, bulletAngle);

        const inv = 1 / len;
        const velocity = new Vec3(aimX * inv * this.bulletSpeed, aimY * inv * this.bulletSpeed, 0);
        
        let hasRigidBody = false;
        let rb = bulletNode.getComponent(RigidBody2D);
        if (rb) {
            hasRigidBody = true;
            // Giao quyền di chuyển cho bộ máy Vật lý
            // Do Box2D tính lực/linearVelocity khác với việc dịch toạ độ pixel (khuếch đại sức mạnh rất chênh lệch)
            // Nên ta cần chỉnh tỷ lệ giảm xuống để vận tốc giống với mắt thường thấy trên Editor
            const PTM_RATIO = 20; // Hằng số chuyển đổi Pixel to Metter
            rb.linearVelocity = new Vec2(velocity.x / PTM_RATIO, velocity.y / PTM_RATIO);
        }

        this._runtimeBullets.push({
            node: bulletNode,
            velocity,
            lifeLeft: this.bulletLifetime,
            hasRigidBody: hasRigidBody
        });
    }

    private startReload() {
        if (this._isReloading) {
            return;
        }

        this._isReloading = true;
        this._reloadTimer = this.reloadDuration;
        this.node.emit('player-reload-start', this.reloadDuration);
    }

    private updateReload(deltaTime: number) {
        if (!this._isReloading) {
            return;
        }

        this._reloadTimer -= deltaTime;
        const progress = 1 - Math.max(this._reloadTimer, 0) / this.reloadDuration;
        this.node.emit('player-reload-progress', progress);

        if (this._reloadTimer > 0) {
            return;
        }

        this._isReloading = false;
        this._reloadTimer = 0;
        this._ammo = this.maxAmmo;
        this.node.emit('player-reload-complete');
        this.node.emit('player-ammo-changed', this._ammo, this.maxAmmo);
    }

    private tryDash() {
        if (!this._hasAim || this._dashTimer > 0) {
            return;
        }

        const current = this.node.worldPosition;
        
        // Tính toán vector hướng từ nhân vật đến vị trí chuột
        let dirX = this._mouseWorldPos.x - current.x;
        let dirY = this._mouseWorldPos.y - current.y;
        
        const len = Math.sqrt(dirX * dirX + dirY * dirY);
        
        // Cú lướt sẽ là: hướng chuột * khoảng cách (giới hạn bởi dashDistance)
        // Nếu chuột click gần hơn dashDistance thì lướt tới chuột, còn xa hơn thì chỉ lướt đúng dashDistance
        let actualDashDist = Math.min(len, this.dashDistance);
        
        let targetX = current.x;
        let targetY = current.y;
        
        if (len > 0) {
            targetX = current.x + (dirX / len) * actualDashDist;
            targetY = current.y + (dirY / len) * actualDashDist;
        }

        // Kẹp lại vào ranh giới màn hình để không lướt ra ngoài map
        const nextX = math.clamp(targetX, this.minX + this.sizePlayer / 2, this.maxX - this.sizePlayer / 2);
        const nextY = math.clamp(targetY, this.minY + this.sizePlayer / 2, this.maxY - this.sizePlayer / 2);
        const target = new Vec3(nextX, nextY, current.z);

        const dashTime = 0.5;

        tween(this.node)
            .to(dashTime, { worldPosition: target }, { easing: 'cubicOut' }) // Thêm easing để lướt có lực cản
            .start();

        this._dashTimer = this.dashCooldown;
        this.node.emit('player-dash', this.dashCooldown);
        this.node.emit('player-skill-cooldown', this._dashTimer, this.dashCooldown);
    }

    private updateRuntimeBullets(deltaTime: number) {
        for (let i = this._runtimeBullets.length - 1; i >= 0; i--) {
            const bullet = this._runtimeBullets[i];
            if (!isValid(bullet.node)) {
                this._runtimeBullets.splice(i, 1);
                continue;
            }

            bullet.lifeLeft -= deltaTime;
            if (bullet.lifeLeft <= 0) {
                bullet.node.destroy();
                this._runtimeBullets.splice(i, 1);
                continue;
            }

            // Nếu đạn đã có RigidBody, bộ máy vật lý sẽ tự di chuyển nó, không dùng setWorldPosition nữa
            if (!bullet.hasRigidBody) {
                const pos = bullet.node.worldPosition;
                bullet.node.setWorldPosition(
                    pos.x + bullet.velocity.x * deltaTime,
                    pos.y + bullet.velocity.y * deltaTime,
                    pos.z
                );
            }
        }
    }

    private isDown(key: KeyCode): boolean {
        return this._pressedKeys.has(key);
    }

    private die() {
        if (!this._isAlive) {
            return;
        }
        this._isAlive = false;
        this.scheduleOnce(() => {
            this.node.emit('player-died');
            director.emit('player-died'); // Phát thêm qua director để các Manager khác bắt được
        }, 0); // Delay để đảm bảo các logic sau khi chết vẫn chạy trong frame này (như hiện hiệu ứng, âm thanh) rồi mới thông báo chết hẳn để GameController chuyển state
    }

    private emitState() {
        this.node.emit('player-health-changed', this._health, this.maxHealth);
        this.node.emit('player-ammo-changed', this._ammo, this.maxAmmo);
        this.node.emit('player-skill-cooldown', this._dashTimer, this.dashCooldown);
    }
}


