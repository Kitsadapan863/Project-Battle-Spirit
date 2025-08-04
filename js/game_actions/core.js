// js/game_actions/core.js
import { cleanupField } from './card.js';

/**
 * ย้ายคอร์ในช่วง Main Step
 */
export function moveCore(coreId, from, sourceCardUid, targetZoneId, targetCardUid, gameState) {
    const player = gameState.player;
    let coreToMove;
    let sourceArray;
    let sourceCard = null; // <-- เพิ่มตัวแปร sourceCard

    if (from === 'card') {
        sourceCard = player.field.find(c => c.uid === sourceCardUid); // <-- กำหนดค่าให้ sourceCard
        if (!sourceCard) return false;
        sourceArray = sourceCard.cores;
    } else {
        sourceArray = player.reserve;
    }

    const coreIndex = sourceArray.findIndex(c => c.id === coreId);
    if (coreIndex === -1) return false;

    // ---- START: แก้ไขตรรกะส่วนนี้ ----
    // ตรวจสอบก่อนย้ายคอร์ ว่านี่เป็นคอร์เม็ดสุดท้ายของ Spirit หรือไม่
    if (sourceCard && sourceCard.type === 'Spirit' && sourceArray.length === 1) {
        // ถ้าใช่ ให้เปิดหน้าต่างยืนยัน
        gameState.coreRemovalConfirmationState = { 
            isConfirming: true, 
            coreId: coreId, 
            from: from, 
            sourceUid: sourceCardUid,
            // เพิ่มเป้าหมายการย้ายคอร์
            target: {
                targetZoneId: targetZoneId,
                targetCardUid: targetCardUid
            }
        };
        // ไม่ต้องย้ายคอร์ตอนนี้ ให้รอการยืนยัน
        return false; 
    }
    // ---- END: แก้ไขตรรกะส่วนนี้ ----

    [coreToMove] = sourceArray.splice(coreIndex, 1);

    if (targetCardUid) {
        const destCard = player.field.find(c => c.uid === targetCardUid);
        if (destCard) {
            destCard.cores.push(coreToMove);
        } else {
            sourceArray.push(coreToMove); // คืนคอร์ถ้าหาเป้าหมายไม่เจอ
            return false;
        }
    } else if (targetZoneId && targetZoneId.includes('player-reserve-zone')) {
        player.reserve.push(coreToMove);
    } else {
        sourceArray.push(coreToMove); // คืนคอร์ถ้าไม่มีเป้าหมายที่ถูกต้อง
        return false;
    }

    cleanupField(gameState); // ตรวจสอบสนามเสมอหลังจากย้ายคอร์
    return true;
}

/**
 * ยืนยันการนำคอร์สุดท้ายออกจาก Spirit
 */
export function confirmCoreRemoval(gameState) {
    // ---- START: แก้ไขตรรกะทั้งหมดในฟังก์ชันนี้ ----
    const { isConfirming, coreId, sourceUid, target } = gameState.coreRemovalConfirmationState;
    if (!isConfirming) return false;

    const sourceCard = gameState.player.field.find(s => s.uid === sourceUid);
    const sourceArray = sourceCard ? sourceCard.cores : undefined;

    if (sourceArray) {
        const coreIndex = sourceArray.findIndex(c => c.id === coreId);
        if (coreIndex > -1) {
            // 1. นำคอร์ออกจาก Spirit ต้นทาง
            const [movedCore] = sourceArray.splice(coreIndex, 1);

            // 2. ย้ายคอร์ไปยังเป้าหมายที่บันทึกไว้ (target)
            if (target && target.targetCardUid) {
                const destCard = gameState.player.field.find(c => c.uid === target.targetCardUid);
                if (destCard) destCard.cores.push(movedCore);
            } else if (target && target.targetZoneId && target.targetZoneId.includes('player-reserve-zone')) {
                gameState.player.reserve.push(movedCore);
            }
            
            // 3. เรียก cleanupField เพื่อทำลาย Spirit ที่มี 0 คอร์
            cleanupField(gameState);
        }
    }

    cancelCoreRemoval(gameState);
    return true;
    // ---- END: แก้ไขตรรกะ ----
}

/**
 * ยกเลิกการนำคอร์สุดท้ายออกจาก Spirit
 */
export function cancelCoreRemoval(gameState) {
    if (!gameState.coreRemovalConfirmationState.isConfirming) return;
    gameState.coreRemovalConfirmationState = { isConfirming: false, coreId: null, from: null, sourceUid: null };
}
