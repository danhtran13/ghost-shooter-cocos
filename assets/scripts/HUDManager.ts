import { _decorator, Component, Node, Label, director, ProgressBar, UIOpacity } from 'cc';
import { PlayerController } from './PlayerController';
const { ccclass, property } = _decorator;

@ccclass('HUDManager')
export class HUDManager extends Component {

    @property(PlayerController)
    playerStatus: PlayerController | null = null;

    @property(Node)
    skillIconNode: Node | null = null;

    @property(Label)
    skillCooldownLabel: Label | null = null;

    @property(Label)
    healthLabel: Label | null = null;

    @property(Label)
    scoreLabel: Label | null = null;

    @property(Label)
    bulletCountLabel: Label | null = null;

    @property(ProgressBar)
    reloadProgressBar: ProgressBar | null = null;

    @property(Label)
    playTimeLabel: Label | null = null;

    private _currentScore = 0;
    private _playTime = 0;

    get currentScore(): number {
        return this._currentScore;
    }

    get playTime(): number {
        return this._playTime;
    }

    start() {
        if (this.playerStatus) {
            this.skillCooldownLabel.string = ""; // Ẩn text cooldown lúc đầu
            // Hiển thị trạng thái lúc đầu mới vào game
            this.updateHealthText(this.playerStatus.maxHealth);
            this.updateBulletText(this.playerStatus.maxAmmo);

            // Bắt sự kiện mỗi khi thay đổi (File PlayerController gọi ra)
            this.playerStatus.node.on('player-health-changed', this.updateHealthText, this);
            this.playerStatus.node.on('player-ammo-changed', this.updateBulletText, this);

            // Bắt sự kiện thanh nạp đạn (Progress Bar)
            this.playerStatus.node.on('player-reload-start', this.onReloadStart, this);
            this.playerStatus.node.on('player-reload-progress', this.onReloadProgress, this);
            this.playerStatus.node.on('player-reload-complete', this.onReloadComplete, this);

            // Ẩn thanh nạp đạn lúc đầu
            if (this.reloadProgressBar) {
                this.reloadProgressBar.node.active = false;
            }
        }

        // --- Phần Điểm ---
        this.updateScoreText(0); // Hiển thị điểm 0 lúc đầu
        // Sử dụng director.on để lắng nghe sự kiện từ khắp mọi nơi trong scene
        director.on('monster-killed', this.onMonsterKilled, this);

        // Lắng nghe sự kiện skill do PlayerController phát ra ở mỗi frame
        if (this.playerStatus) {
            this.playerStatus.node.on('player-skill-cooldown', this.updateSkillCooldown, this);
        }
    }

    update(deltaTime: number) {
        // Dùng trạng thái pause của director thay vì biến boolean
        if (director.isPaused()) return; 

        // Tăng thời gian chơi lên mỗi frame
        this._playTime += deltaTime;
        this.updatePlayTimeText();
    }

    updatePlayTimeText() {
        if (!this.playTimeLabel) return;
        
        // Tính toán phút và giây
        const minutes = Math.floor(this._playTime / 60);
        const seconds = Math.floor(this._playTime % 60);
        
        // Format hiển thị kiểu 00:00
        const minStr = minutes < 10 ? minutes : minutes.toString();
        const secStr = seconds < 10 ? '0' + seconds : seconds.toString();
        
        this.playTimeLabel.string = `Time: ${minStr}:${secStr}`;
    }

    onDestroy() {
        // Nhớ gỡ sự kiện khi UI bị huỷ để tránh lọt bộ nhớ
        director.off('monster-killed', this.onMonsterKilled, this);
    }

    updateHealthText(currentHealth: number) {
        if (this.healthLabel) {
            this.healthLabel.string = `Health: ${currentHealth}`;
        }
    }

    onMonsterKilled() {
        this._currentScore += 1; // Tăng 1 điểm
        this.updateScoreText(this._currentScore);
    }

    updateScoreText(score: number) {
        if (this.scoreLabel) {
            this.scoreLabel.string = `Score: ${score}`;
        }
    }

    updateBulletText(currentAmmo: number) {
        if (this.bulletCountLabel) {
            this.bulletCountLabel.string = `Bullet: ${currentAmmo}`;
        }
    }
    onReloadStart() {
        if (this.reloadProgressBar) {
            this.reloadProgressBar.node.active = true;
            this.reloadProgressBar.progress = 0; // Bắt đầu ở 0%
        }
    }

    onReloadProgress(percent: number) {
        if (this.reloadProgressBar) {
            this.reloadProgressBar.progress = percent; // Cập nhật % nạp đạn (từ 0 -> 1)
        }
    }

    onReloadComplete() {
        if (this.reloadProgressBar) {
            this.reloadProgressBar.node.active = false; // Nạp xong thì ẩn đi
        }
    }

    updateSkillCooldown(currentCooldown: number, maxCooldown: number) {
        // 1. Cập nhật Text thời gian đếm ngược
        if (this.skillCooldownLabel) {
            if (currentCooldown > 0) {
                // Hiển thị 1 chữ số thập phân, ví dụ "9.5"
                this.skillCooldownLabel.string = currentCooldown.toFixed(1);
            } else {
                this.skillCooldownLabel.string = ""; // Xong cooldown thì xoá chữ đi
            }
        }

        // 2. Cập nhật độ mờ (Opacity) của Icon skill
        if (this.skillIconNode) {
            // Lấy component UIOpacity, nếu chưa có thì tải từ @cc ở đầu file
            let uiOpacity = this.skillIconNode.getComponent(UIOpacity);
            // Nếu đang trong thời gian hồi -> Cho mờ đi (VD: mức 100/255)
            // Nếu hồi xong (current = 0) -> Sáng hoàn toàn (255/255)
            if (uiOpacity) {
                uiOpacity.opacity = currentCooldown > 0 ? 100 : 255;
            }
        }
    }
}