// js/game_actions/summon.js
import { calculateCost } from '../utils.js';
import { resolveTriggeredEffects } from '../effects/index.js';
import { cleanupField } from './card.js';

/**
 * เริ่มกระบวนการอัญเชิญ Spirit หรือ Nexus
 */
export function initiateSummon(cardUid, gameState) {
    if (gameState.turn !== 'player' || gameState.phase !== 'main' || gameState.summoningState.isSummoning || gameState.placementState.isPlacing) return;

    const cardToSummon = gameState.player.hand.find(c => c.uid === cardUid);
    if (!cardToSummon || (cardToSummon.type !== 'Spirit' && cardToSummon.type !== 'Nexus')) return;

    const finalCost = calculateCost(cardToSummon, 'player', gameState);
    const totalAvailableCores = gameState.player.reserve.length + gameState.player.field.reduce((sum, card) => sum + (card.cores ? card.cores.length : 0), 0);
    const minCoresNeeded = cardToSummon.type === 'Spirit' ? 1 : 0;

    if (totalAvailableCores < finalCost + minCoresNeeded) {
        console.log("Not enough cores to summon.");
        return;
    }

    gameState.summoningState = { isSummoning: true, cardToSummon, costToPay: finalCost, selectedCores: [] };
}

/**
 * ตรรกะการอัญเชิญของ AI
 */
export function summonSpiritAI(playerType, cardUid, gameState) {
    const player = gameState[playerType];
    const cardIndex = player.hand.findIndex(c => c.uid === cardUid);
    if (cardIndex === -1) return false;

    const cardToSummon = player.hand[cardIndex];
    if (cardToSummon.type !== 'Spirit') return false;

    const finalCost = calculateCost(cardToSummon, playerType, gameState);
    const totalCoresNeeded = finalCost + 1; // +1 for the spirit itself

    if (player.reserve.length >= totalCoresNeeded) {
        const coresForCost = player.reserve.splice(0, finalCost);
        player.costTrash.push(...coresForCost);

        const [summonedCard] = player.hand.splice(cardIndex, 1);
        summonedCard.isExhausted = false;
        summonedCard.cores = [];
        summonedCard.tempBuffs = [];

        const coreForLevel1 = player.reserve.shift();
        summonedCard.cores.push(coreForLevel1);

        player.field.push(summonedCard);
        resolveTriggeredEffects(summonedCard, 'whenSummoned', playerType, gameState);
        return true;
    }
    return false;
}

/**
 * เลือก/ยกเลิกการเลือกคอร์สำหรับจ่ายค่าร่าย
 */
export function selectCoreForPayment(coreId, from, spiritUid, gameState) {
    const paymentState = gameState.summoningState.isSummoning ? gameState.summoningState : gameState.magicPaymentState.isPaying ? gameState.magicPaymentState : null;
    if (!paymentState) return;

    const { selectedCores, costToPay } = paymentState;
    const coreInfo = { coreId, from: from === 'field' ? 'field' : 'reserve', spiritUid };
    const existingIndex = selectedCores.findIndex(c => c.coreId === coreId);

    if (existingIndex > -1) {
        selectedCores.splice(existingIndex, 1);
    } else if (selectedCores.length < costToPay) {
        selectedCores.push(coreInfo);
    }
}


/**
 * ยกเลิกการอัญเชิญ
 */
export function cancelSummon(gameState) {
    if (!gameState.summoningState.isSummoning) return;
    gameState.summoningState = { isSummoning: false, cardToSummon: null, costToPay: 0, selectedCores: [] };
}

/**
 * ยืนยันการจ่ายค่าร่ายและอัญเชิญ
 */
export function confirmSummon(gameState) {
    const { isSummoning, cardToSummon, costToPay, selectedCores } = gameState.summoningState;
    if (!isSummoning || selectedCores.length < costToPay) return false;

    // ย้ายคอร์ที่เลือกไปยัง Cost Trash
    for (const coreInfo of selectedCores) {
        let sourceArray;
        if (coreInfo.from === 'reserve') {
            sourceArray = gameState.player.reserve;
        } else {
            const sourceCard = gameState.player.field.find(s => s.uid === coreInfo.spiritUid);
            sourceArray = sourceCard ? sourceCard.cores : undefined;
        }
        if (sourceArray) {
            const coreIndex = sourceArray.findIndex(c => c.id === coreInfo.coreId);
            if (coreIndex > -1) {
                const [paidCore] = sourceArray.splice(coreIndex, 1);
                gameState.player.costTrash.push(paidCore);
            }
        }
    }

    cleanupField(gameState);

    // ย้ายการ์ดจากมือลงสนาม
    const cardIndex = gameState.player.hand.findIndex(c => c.uid === cardToSummon.uid);
    const [summonedCard] = gameState.player.hand.splice(cardIndex, 1);
    summonedCard.isExhausted = false;
    summonedCard.cores = [];
    summonedCard.tempBuffs = [];
    gameState.player.field.push(summonedCard);
    
    // รีเซ็ตสถานะและเข้าสู่ช่วง Placement
    gameState.summoningState = { isSummoning: false, cardToSummon: null, costToPay: 0, selectedCores: [] };
    gameState.placementState = { isPlacing: true, targetSpiritUid: summonedCard.uid };
    
    return true;
}

/**
 * เลือก/ยกเลิกคอร์เพื่อวางบน Spirit ที่เพิ่งอัญเชิญ
 */
export function selectCoreForPlacement(coreId, from, sourceUid, gameState) {
    if (!gameState.placementState.isPlacing) return;
    const { targetSpiritUid } = gameState.placementState;
    const targetCard = gameState.player.field.find(s => s.uid === targetSpiritUid);
    if (!targetCard) return;

    // กรณีคลิก Core บนการ์ดเป้าหมายเอง (เพื่อย้ายกลับ Reserve)
    if (sourceUid === targetSpiritUid) {
        const coreIndex = targetCard.cores.findIndex(c => c.id === coreId);
        if (coreIndex > -1) {
            const [movedCore] = targetCard.cores.splice(coreIndex, 1);
            gameState.player.reserve.push(movedCore);
        }
    }
    // กรณีย้าย Core จากที่อื่นมาใส่การ์ดเป้าหมาย
    else {
        let sourceArray;
        let sourceCard = null;
        if (from === 'reserve') {
            sourceArray = gameState.player.reserve;
        } else {
            sourceCard = gameState.player.field.find(s => s.uid === sourceUid);
            sourceArray = sourceCard ? sourceCard.cores : undefined;
        }

        if (!sourceArray) return;

        const coreIndex = sourceArray.findIndex(c => c.id === coreId);
        if (coreIndex > -1) {
            // --- START: โค้ดที่แก้ไข ---
            // ตรวจสอบว่าเป็น Core เม็ดสุดท้ายหรือไม่
            if (sourceCard && sourceCard.type === 'Spirit' && sourceArray.length === 1) {
                // ถ้าใช่ ให้เปิดหน้าต่างยืนยัน พร้อม "บันทึกเป้าหมาย" ที่จะย้ายไป
                gameState.coreRemovalConfirmationState = { 
                    isConfirming: true, 
                    coreId: coreId, 
                    from: 'card', 
                    sourceUid: sourceUid,
                    target: { // บันทึกเป้าหมายการย้าย
                        targetZoneId: 'player-field',
                        targetCardUid: targetSpiritUid 
                    }
                };
                return; // หยุดรอการยืนยันจากผู้ใช้
            }
            // --- END: โค้ดที่แก้ไข ---

            // ถ้าย้ายได้เลย (ไม่ใช่ Core เม็ดสุดท้าย)
            const [movedCore] = sourceArray.splice(coreIndex, 1);
            targetCard.cores.push(movedCore);
            cleanupField(gameState); // ตรวจสอบสนามหลังย้าย เผื่อมี Spirit ที่ต้องทำลาย
        }
    }
}


/**
 * ยืนยันการวางคอร์และจบกระบวนการอัญเชิญ
 */
export function confirmPlacement(gameState) {
    if (!gameState.placementState.isPlacing) return;
    const targetCard = gameState.player.field.find(c => c.uid === gameState.placementState.targetSpiritUid);

    if (targetCard && targetCard.type === 'Spirit' && targetCard.cores.length === 0) {
        // ป้องกันไม่ให้ยืนยันถ้า Spirit ไม่มีคอร์เลย
        return;
    }

    if (targetCard) {
        // เรียกใช้เอฟเฟกต์ When Summoned
        resolveTriggeredEffects(targetCard, 'whenSummoned', 'player', gameState);
    }
    
    cleanupField(gameState);
    gameState.placementState = { isPlacing: false, targetSpiritUid: null };
}