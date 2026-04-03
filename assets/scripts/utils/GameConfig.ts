export const PHYSICS_GROUP = {
    DEFAULT: 1 << 0,
    PLAYER: 1 << 1,
    MONSTER: 1 << 2,
    BULLET: 1 << 3,
    RECOVER: 1 << 4,
};

export enum GameState {
    MENU,
    PLAYING,
    GAME_OVER
};