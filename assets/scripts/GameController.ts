import { _decorator, Component, Node, Prefab, instantiate, math, director } from 'cc';
import { Monster } from './Monster';
import { Minimap } from './Minimap';
const { ccclass, property } = _decorator;

export enum GameState {
    MENU,
    PLAYING,
    GAME_OVER
}

@ccclass('GameController')
export class GameController extends Component {
    public static currentState: GameState = GameState.MENU;
    public static isRestarting = false;

    @property({ type: Node })
    playerNode: Node | null = null;

    @property({ type: Prefab, tooltip: 'Hộp Prefab chứa con Quái vật' })
    monsterPrefab: Prefab | null = null;

    @property({ type: Prefab, tooltip: 'Hộp Prefab chứa vật phẩm hồi máu' })
    healthItemPrefab: Prefab | null = null;

    @property(Node)
    monsterRoot: Node | null = null;

    @property
    spawnMonsterInterval = 3;

    @property
    spawnHealthItemInterval = 10;

    @property
    minX = 0;

    @property
    maxX = 1708;

    @property
    minY = 0;

    @property
    maxY = 960;

    private _spawnMonsterTimer = 0;
    private _spawnHealthItemTimer = 0;

    start() {
        this._spawnMonsterTimer = this.spawnMonsterInterval;
        this._spawnHealthItemTimer = this.spawnHealthItemInterval;

        if (this.playerNode && Minimap.instance) {
             Minimap.instance.registerPlayer(this.playerNode);
        }
    }

    update(deltaTime: number) {
        if (GameController.currentState !== GameState.PLAYING) return;
        if (!this.monsterPrefab || !this.playerNode || !this.healthItemPrefab) return;

        this._spawnMonsterTimer -= deltaTime;
        if (this._spawnMonsterTimer <= 0) {
            this.spawnMonster();
            this._spawnMonsterTimer = this.spawnMonsterInterval;
        }
        this._spawnHealthItemTimer -= deltaTime;
        if (this._spawnHealthItemTimer <= 0) {
            this.spawnHealthItem();
            this._spawnHealthItemTimer = this.spawnHealthItemInterval;
        }
    }

    private spawnMonster() {
        if (!this.monsterPrefab) return;

        const monsterNode = instantiate(this.monsterPrefab);

        // Random toạ độ sinh quái xung quanh viền màn hình (Hoặc góc Map)
        let edge = math.randomRangeInt(0, 4); // 0=Top, 1=Right, 2=Bottom, 3=Left
        let spawnX = 0;
        let spawnY = 0;

        // Sinh ra sát vào 1 chút để không bị dính logic chạm tường ngay lập tức bật ra
        switch (edge) {
            case 0: // Cạnh trên
                spawnX = math.randomRange(this.minX + 50, this.maxX - 50);
                spawnY = this.maxY - 50;
                break;
            case 1: // Cạnh phải
                spawnX = this.maxX - 50;
                spawnY = math.randomRange(this.minY + 50, this.maxY - 50);
                break;
            case 2: // Cạnh dưới
                spawnX = math.randomRange(this.minX + 50, this.maxX - 50);
                spawnY = this.minY + 50;
                break;
            case 3: // Cạnh trái
                spawnX = this.minX + 50;
                spawnY = math.randomRange(this.minY + 50, this.maxY - 50);
                break;
        }

        monsterNode.setParent(this.monsterRoot || this.node);
        monsterNode.setWorldPosition(spawnX, spawnY, 0);
    }

    private spawnHealthItem() {
        if (!this.healthItemPrefab) return;

        const healthItemNode = instantiate(this.healthItemPrefab);

        // Random toạ độ sinh vật phẩm hồi máu
        const spawnX = math.randomRange(this.minX + 50, this.maxX - 50);
        const spawnY = math.randomRange(this.minY + 50, this.maxY - 50);

        if (this.playerNode && this.playerNode.parent) {
             healthItemNode.setParent(this.playerNode.parent);
        } else {
             healthItemNode.setParent(this.monsterRoot || this.node);
        }
        healthItemNode.setWorldPosition(spawnX, spawnY, 0);
    }
}
