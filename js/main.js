// js/main.js
import { initializeGame } from './state.js';
import { setupInitialEventListeners } from './core/eventManager.js';

// เมื่อ DOM โหลดเสร็จสิ้น
document.addEventListener('DOMContentLoaded', () => {
    // เริ่มเกม
    const { gameState, callbacks } = initializeGame();

    // ตั้งค่า Event Listeners เริ่มต้น
    setupInitialEventListeners(gameState, callbacks);
});