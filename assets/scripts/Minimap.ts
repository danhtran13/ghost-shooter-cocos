import { _decorator, Component, Node, UITransform, Color, Graphics } from 'cc';
const { ccclass, property } = _decorator;

// Class đại diện cho 1 vật thể đăng ký trên Minimap
export interface TrackedTarget {
    worldNode: Node; // Node ngoài đời thật
    iconNode?: Node; // Icon đại diện trên viền map
}

@ccclass('Minimap')
export class Minimap extends Component {
    // Để Minimap là một Singleton dễ gọi từ mọi nơi
    public static instance: Minimap | null = null; 

    @property({ tooltip: 'Giới hạn map X (Min)' }) mapMinX = 0;
    @property({ tooltip: 'Giới hạn map X (Max)' }) mapMaxX = 1708;
    @property({ tooltip: 'Giới hạn map Y (Min)' }) mapMinY = 0;
    @property({ tooltip: 'Giới hạn map Y (Max)' }) mapMaxY = 960;

    private _trackedTargets: TrackedTarget[] = [];
    private _minimapUI: UITransform | null = null;

    onLoad() {
        Minimap.instance = this; // Đăng ký Singleton
        this._minimapUI = this.getComponent(UITransform);
    }

    onDestroy() {
        if (Minimap.instance === this) {
            Minimap.instance = null;
        }
    }

    // Các hàm để các vật thể dưới trần gian đăng ký cái mặt nó lên Radar Minimap
    public registerPlayer(playerNode: Node) {
        this.addTrackedObject(playerNode, Color.WHITE, 10); // Player màu trắng, to hơn chút
    }

    public registerMonster(monsterNode: Node) {
        this.addTrackedObject(monsterNode, Color.RED, 10); // Red cho quái
    }

    public registerHealthItem(healthNode: Node) {
        this.addTrackedObject(healthNode, Color.GREEN, 10); // Green cho máu
    }

    // Hàm xoá đăng ký khi nó biến mất
    public unregisterObject(worldNode: Node) {
        const index = this._trackedTargets.findIndex(item => item.worldNode === worldNode);
        if (index !== -1) {
            const track = this._trackedTargets[index];
            if (track.iconNode && track.iconNode.isValid) {
                track.iconNode.destroy();
            }
            this._trackedTargets.splice(index, 1);
        }
    }

    private addTrackedObject(worldNode: Node, color: Color, radius: number = 3) {
        // Tự động tạo một Node ảo bằng code
        const iconNode = new Node('MinimapIcon');
        iconNode.layer = this.node.layer; // Kế thừa layer UI từ Minimap
        
        // Đăng ký kích thước UI
        iconNode.addComponent(UITransform);
        
        // Dùng Graphics để tự động vẽ chấm tròn (không cần hình ảnh Prefab)
        const graphics = iconNode.addComponent(Graphics);
        graphics.fillColor = color;
        graphics.circle(0, 0, radius);
        graphics.fill();

        iconNode.setParent(this.node); // Đính icon lên Minimap UI
        this._trackedTargets.push({ worldNode, iconNode });
    }

    update(deltaTime: number) {
        if (!this._minimapUI) return;

        const minimapWidth = this._minimapUI.contentSize.width;
        const minimapHeight = this._minimapUI.contentSize.height;

        // Vòng lặp liên tục dời toạ độ của mọi điểm trên radar
        for (let i = this._trackedTargets.length - 1; i >= 0; i--) {
            const track = this._trackedTargets[i];

            // Nếu vật thật đã bị xoá ngoài đời (quái chết, cục máu bị ăn)
            if (!track.worldNode || !track.worldNode.isValid) {
                if (track.iconNode && track.iconNode.isValid) track.iconNode.destroy();
                this._trackedTargets.splice(i, 1);
                continue;
            }

            // Tính 1 phát ra lun toạ độ mới cho biểu tượng
            let pos = track.worldNode.worldPosition;
            let percentX = (pos.x - this.mapMinX) / (this.mapMaxX - this.mapMinX);
            let percentY = (pos.y - this.mapMinY) / (this.mapMaxY - this.mapMinY);

            // Giới hạn để icon ko lọt ra khỏi khung minimap
            if(percentX < 0) percentX = 0; if(percentX > 1) percentX = 1;
            if(percentY < 0) percentY = 0; if(percentY > 1) percentY = 1;

            let iconX = (percentX - 0.5) * minimapWidth;
            let iconY = (percentY - 0.5) * minimapHeight;

            if (track.iconNode && track.iconNode.isValid) {
                track.iconNode.setPosition(iconX, iconY, 0);
            }
        }
    }
}