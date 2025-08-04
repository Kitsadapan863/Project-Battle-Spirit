// js/game_actions/core.js
import { cleanupField } from './card.js';

/**
 * ย้ายคอร์ในช่วง Main Step
 */
export function moveCore(coreId, from, sourceCardUid, targetZoneId, targetCardUid, gameState) {
    const player = gameState.player;
    let coreToMove;
    let sourceArray;
    if (from === 'card') {
        const sourceCard = player.field.find(c => c.uid === sourceCardUid);
        if (!sourceCard) return false;
        sourceArray = sourceCard.cores;
    } else {
        sourceArray = player.reserve;
    }
    const coreIndex = sourceArray.findIndex(c => c.id === coreId);
    if (coreIndex === -1) return false;
    [coreToMove] = sourceArray.splice(coreIndex, 1);
    if (targetCardUid) {
        const destCard = player.field.find(c => c.uid === targetCardUid);
        if (destCard) {
            destCard.cores.push(coreToMove);
        } else {
            sourceArray.push(coreToMove);
            return false;
        }
    } else if (targetZoneId && targetZoneId.includes('player-reserve-zone')) {
        player.reserve.push(coreToMove);
    } else {
        sourceArray.push(coreToMove);
        return false;
    }
    cleanupField(gameState);
    return true;
}

/**
 * ยืนยันการนำคอร์สุดท้ายออกจาก Spirit
 */
export function confirmCoreRemoval(gameState) {
    const { isConfirming, coreId, from, sourceUid } = gameState.coreRemovalConfirmationState;
    if (!isConfirming) return false;
    const { targetSpiritUid } = gameState.placementState;
    const targetCard = gameState.player.field.find(s => s.uid === targetSpiritUid);
    if (!targetCard) {
        cancelCoreRemoval(gameState);
        return false;
    }
    let sourceArray;
    if (from === 'reserve') {
        sourceArray = gameState.player.reserve;
    } else {
        const sourceCard = gameState.player.field.find(s => s.uid === sourceUid);
        sourceArray = sourceCard ? sourceCard.cores : undefined;
    }
    if (sourceArray) {
        const coreIndex = sourceArray.findIndex(c => c.id === coreId);
        if (coreIndex > -1) {
            const [movedCore] = sourceArray.splice(coreIndex, 1);
            targetCard.cores.push(movedCore);
            cleanupField(gameState);
        }
    }
    cancelCoreRemoval(gameState);
    return true;
}

/**
 * ยกเลิกการนำคอร์สุดท้ายออกจาก Spirit
 */
export function cancelCoreRemoval(gameState) {
    if (!gameState.coreRemovalConfirmationState.isConfirming) return;
    gameState.coreRemovalConfirmationState = { isConfirming: false, coreId: null, from: null, sourceUid: null };
}
