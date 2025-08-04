// js/effects/index.js
import { getSpiritLevelAndBP } from '../utils.js';
import { applyCrush, applyClash, applyPowerUp, applyDiscard } from './effectHandlers.js';

/**
 * ตรวจสอบและเรียกใช้เอฟเฟกต์ของการ์ดตามเวลา (timing) ที่กำหนด
 * @param {object} card - การ์ดที่กำลังตรวจสอบเอฟเฟกต์
 * @param {string} timing - เวลาที่เกิดเอฟเฟกต์ เช่น 'whenAttacks', 'whenSummoned'
 * @param {string} ownerKey - 'player' หรือ 'opponent'
 * @param {object} gameState - สถานะของเกมทั้งหมด
 */
export function resolveTriggeredEffects(card, timing, ownerKey, gameState) {
    if (!card.effects || card.effects.length === 0) return;

    // เอฟเฟกต์บางอย่างอาจเปลี่ยนแปลง BP/Level ได้ จึงควรคำนวณใหม่ทุกครั้ง
    const { level: cardLevel } = getSpiritLevelAndBP(card, ownerKey, gameState);

    card.effects.forEach(effect => {
        // ตรวจสอบว่าเอฟเฟกต์ทำงานใน timing นี้ และ spirit มีเลเวลถึงตามที่กำหนดหรือไม่
        if (effect.timing === timing && effect.level.includes(cardLevel)) {
            
            // ส่งต่อไปยัง handler ที่เหมาะสมตาม keyword
            switch (effect.keyword) {
                case 'crush':
                    applyCrush(card, cardLevel, ownerKey, gameState);
                    break;
                case 'clash':
                    applyClash(card, gameState);
                    break;
                case 'power up':
                     // จัดการ power up ที่เกิดจาก trigger (เช่น การโจมตี) ไม่ใช่จาก Flash
                    if (!effect.triggered_by) {
                       applyPowerUp(card.uid, effect.power, effect.duration, gameState);
                    }
                    break;
                case 'discard':
                    applyDiscard(card, effect, ownerKey, gameState);
                    break;
                // สามารถเพิ่ม case สำหรับ keyword อื่นๆ ในอนาคตได้ที่นี่
                // เช่น 'destroy', 'draw'
            }
        }
    });
}