import { _decorator, Component, sys } from 'cc';
const { ccclass } = _decorator;

@ccclass('DataManager')
export class DataManager extends Component {
    // Tạo một biến static (Singleton) để các script khác có thể gọi dễ dàng
    public static instance: DataManager;

    // Biến lưu trạng thái bật/tắt của toàn bộ game
    public isSoundOn: boolean = true;

    public bestScore: number = 0;

    onLoad() {
        // Thiết lập Singleton
        if (!DataManager.instance) {
            DataManager.instance = this;
        } else {
            // Nếu đã có 1 AudioManager khác tồn tại thì huỷ cái mới này đi
            this.node.destroy();
            return;
        }

        // Đọc dữ liệu cài đặt âm thanh trong máy (localStorage)
        let savedSoundSetting = sys.localStorage.getItem('isSoundOn');
        let savedBestScore = sys.localStorage.getItem('bestScore');
        
        // Nếu trước đó người chơi từng tắt âm thanh (lưu chuỗi 'false') thì gán isSoundOn = false
        // Ngược lại (mới vào game lần đầu hoặc lưu chuỗi 'true') thì mặc định là true
        if (savedSoundSetting === 'false') {
            this.isSoundOn = false;
        } else {
            this.isSoundOn = true;
            // Lưu lại cho chắc ăn nếu mới vào game lần đầu tiên
            sys.localStorage.setItem('isSoundOn', 'true');
        }
        
        // Nếu có điểm cao lưu trước đó, gán cho bestScore
        if (savedBestScore) {
            this.bestScore = parseInt(savedBestScore);
        }

        console.log("Trạng thái âm thanh ban đầu:", this.isSoundOn ? "BẬT" : "TẮT");
    }

    // Hàm dùng để gắn vào nút bấm trên Menu (ví dụ nút có hình cái Loa)
    public toggleSound() {
        // Đảo ngược trạng thái hiện tại (Đang Bật -> Tắt, đang Tắt -> Bật)
        this.isSoundOn = !this.isSoundOn;
        
        // Lưu xuống bộ nhớ thiết bị ngay lập tức
        sys.localStorage.setItem('isSoundOn', this.isSoundOn ? 'true' : 'false');
        
        console.log("Đã chuyển âm thanh thành:", this.isSoundOn ? "BẬT" : "TẮT");
        
        // Lưu ý: Nếu bạn có nhạc nền (BGM) đang phát thì bạn có thể thêm logic 
        // Pause/Resume nhạc nền ngay tại đây luôn.
    }

    public updateBestScore(newScore: number) {
        if (newScore > this.bestScore) {
            this.bestScore = newScore;
            sys.localStorage.setItem('bestScore', newScore.toString());
            console.log("Cập nhật điểm cao mới:", newScore);
        }
    }

    public resetBestScore() {
        this.bestScore = 0;
        sys.localStorage.setItem('bestScore', '0');
        console.log("Điểm cao đã được reset về 0.");
    }
}


