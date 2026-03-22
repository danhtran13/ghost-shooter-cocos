import { _decorator, Component, Node, director, SpriteFrame, Button, Label } from 'cc';
import { DataManager } from './DataManager';
import { HUDManager } from './HUDManager';
const { ccclass, property } = _decorator;

@ccclass('MenuManager')
export class MenuManager extends Component {
    @property(Node)
    mainMenuPanel: Node | null = null;

    @property(Node)
    gameOverPanel: Node | null = null;

    @property(Button)
    soundButton: Button | null = null;

    @property(SpriteFrame)
    soundOnSprite: SpriteFrame | null = null;

    @property(SpriteFrame)
    soundOffSprite: SpriteFrame | null = null;

    @property(Label)
    bestScoreLabel: Label | null = null;
    
    @property(Label)
    resultLabel: Label | null = null;

    @property(HUDManager)
    hudManager: HUDManager | null = null;

    start() {
        // Vừa vào game là mở main menu ngay
        this.showMainMenu();

        // Cập nhật hình ảnh nút âm thanh lúc mới vào game theo cài đặt đã lưu
        this.updateSoundButtonUI();

        this.updateBestScoreText();
        
        // Lắng nghe sự kiện người chơi chết để bật Game Over
        // Bạn cần đảm bảo Player phát ra sự kiện này khi máu <= 0
        director.on('player-died', this.showGameOver, this);
    }

    onDestroy() {
        director.off('player-died', this.showGameOver, this);
    }

    showMainMenu() {
        if (this.mainMenuPanel) this.mainMenuPanel.active = true;
        if (this.gameOverPanel) this.gameOverPanel.active = false;
        director.pause();
    }

    // Gắn hàm này vào nút PLAY
    startGame() {
        if (this.mainMenuPanel) this.mainMenuPanel.active = false;
        if (this.gameOverPanel) this.gameOverPanel.active = false;
        director.resume();
    }

    showGameOver() {
        if (this.mainMenuPanel) this.mainMenuPanel.active = false;
        if (this.gameOverPanel) this.gameOverPanel.active = true;

        if (this.hudManager) {
            let finalScore = this.hudManager.currentScore;
            let finalTime = this.hudManager.playTime;

            // Hiển thị điểm số hiện tại
            if (this.resultLabel) {
                const minutes = Math.floor(finalTime / 60);
                const seconds = Math.floor(finalTime % 60);
                const minStr = minutes < 10 ? minutes : minutes.toString();
                const secStr = seconds < 10 ? '0' + seconds : seconds.toString();
                this.resultLabel.string = `Score: ${finalScore} \n Time Alive: ${minStr}:${secStr} \n Best Score: ${DataManager.instance ? DataManager.instance.bestScore : 0}`;
            }

            // So sánh và lưu Best Score (nếu có kỷ lục mới)
            if (DataManager.instance) {
                DataManager.instance.updateBestScore(finalScore);
                // Cập nhật lại UI Best Score trên màn hình Game Over
                this.updateBestScoreText(); 
            }
        }

        setTimeout(() => { director.pause(); }, 100);
    }

    // Gắn hàm này vào nút RESTART
    restartGame() {
        director.resume();
        director.loadScene(director.getScene().name);
        this.startGame(); 
    }

    // Gắn hàm này vào nút HOME / MAIN MENU
    backToMainMenu() {
        director.resume();
        director.loadScene(director.getScene().name);
        // Lưu ý: Do bạn gọi loadScene lại từ đầu, Game sẽ tự động load lại và gọi logic this.showMainMenu() bên trong hàm start().
    }

    updateSoundButtonUI() {
        console.log("Cập nhật UI nút âm thanh. Sound đang:", DataManager.instance?.isSoundOn ? "Bật" : "Tắt");
        if (!this.soundButton || !DataManager.instance) return;
        
        // Đổi hình ảnh trên nút tuỳ thuộc vào trạng thái âm thanh từ DataManager
        if (DataManager.instance.isSoundOn) {
            this.soundButton.normalSprite = this.soundOnSprite;
        } else {
            this.soundButton.normalSprite = this.soundOffSprite;
        }
    }

    onToggleSoundClicked() {
        console.log("Nút âm thanh được bấm. Đang xử lý toggle...");
        if (DataManager.instance) {
            console.log("Nút âm thanh được bấm. Đang chuyển trạng thái...");
            // Thay đổi trạng thái thực và lưu xuống hệ thống
            DataManager.instance.toggleSound();
            
            // Cập nhật lại hình ảnh của nút bấm cho khớp
            this.updateSoundButtonUI();
        }
    }

    updateBestScoreText() {
        if (DataManager.instance) {
            console.log("Cập nhật UI điểm cao. Điểm cao hiện tại:", DataManager.instance.bestScore);
            let bestScore = DataManager.instance.bestScore;
            if (this.bestScoreLabel) {
                this.bestScoreLabel.string = `Best Score: ${bestScore}`;
            }
        }
    }

    resetBestScore() {
        if (DataManager.instance) {
            DataManager.instance.resetBestScore();
            this.updateBestScoreText();
        }
    }
}


