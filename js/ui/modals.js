// js/ui/modals.js
import { getSpiritLevelAndBP } from "../utils.js";
import { createCardElement } from "./components.js";

/**
 * อัปเดตการแสดงผลของ Modal ทั้งหมด
 * @param {object} gameState 
 */
export function updateAllModals(gameState, callbacks) {
    const modals = {
        summonPaymentOverlay: document.getElementById('summon-payment-overlay'),
        magicPaymentOverlay: document.getElementById('magic-payment-overlay'),
        placementOverlay: document.getElementById('placement-overlay'),
        defenseOverlay: document.getElementById('defense-overlay'),
        flashOverlay: document.getElementById('flash-overlay'),
        discardOverlay: document.getElementById('discard-overlay'),
        coreRemovalConfirmationOverlay: document.getElementById('core-removal-confirmation-overlay'),
        targetingOverlay: document.getElementById('targeting-overlay'),
        effectChoiceModal: document.getElementById('effect-choice-modal'),
        gameOverModal: document.getElementById('game-over-modal'),
        deckDiscardViewerModal: document.getElementById('deck-discard-viewer-modal'),
    };
    
    // Summon Payment Modal
    const summonState = gameState.summoningState;
    if (summonState.isSummoning) {
        modals.summonPaymentOverlay.classList.add('visible');
        document.getElementById('summon-payment-title').textContent = `Summoning ${summonState.cardToSummon.name}`;
        document.getElementById('payment-cost-value').textContent = summonState.costToPay;
        document.getElementById('payment-selected-value').textContent = summonState.selectedCores.length;
        document.getElementById('confirm-summon-btn').disabled = summonState.selectedCores.length < summonState.costToPay;
    } else {
        modals.summonPaymentOverlay.classList.remove('visible');
    }

    // Magic Payment Modal
    const magicPaymentState = gameState.magicPaymentState;
    if (magicPaymentState.isPaying) {
        modals.magicPaymentOverlay.classList.add('visible');
        document.getElementById('magic-payment-title').textContent = `Use Magic: ${magicPaymentState.cardToUse.name}`;
        document.getElementById('magic-payment-cost-value').textContent = magicPaymentState.costToPay;
        document.getElementById('magic-payment-selected-value').textContent = magicPaymentState.selectedCores.length;
        document.getElementById('confirm-magic-btn').disabled = magicPaymentState.selectedCores.length < magicPaymentState.costToPay;
    } else {
        modals.magicPaymentOverlay.classList.remove('visible');
    }

    // Placement Modal
    const placementState = gameState.placementState;
    if (placementState.isPlacing) {
        modals.placementOverlay.classList.add('visible');
        const targetCard = gameState.player.field.find(s => s.uid === placementState.targetSpiritUid);
        if (targetCard) {
            document.getElementById('placement-title').textContent = `Place Cores on ${targetCard.name}`;
            
            const confirmBtn = document.getElementById('confirm-placement-btn');
            // ปิดปุ่มถ้าเป็น Spirit และยังไม่มีคอร์
            confirmBtn.disabled = (targetCard.type === 'Spirit' && targetCard.cores.length === 0);
        }
    } else {
        modals.placementOverlay.classList.remove('visible');
    }

    // Defense Modal
    const attackState = gameState.attackState;
    if (attackState.isAttacking && attackState.defender === 'player' && !gameState.flashState.isActive) {
        modals.defenseOverlay.classList.add('visible');
        const attacker = gameState.opponent.field.find(s => s.uid === attackState.attackerUid);
        if (attacker) {
            const { bp } = getSpiritLevelAndBP(attacker, 'opponent', gameState);
            document.getElementById('defense-attacker-info').textContent = `Attacker: ${attacker.name} (BP: ${bp})`;
        }
    } else {
        modals.defenseOverlay.classList.remove('visible');
    }

    // Flash Modal
    if (gameState.flashState.isActive && !gameState.magicPaymentState.isPaying && !gameState.targetingState.isTargeting) {
        modals.flashOverlay.classList.add('visible');
        document.getElementById('flash-title').textContent = `Flash Timing (${gameState.flashState.priority}'s Priority)`;
    } else {
        modals.flashOverlay.classList.remove('visible');
    }
    
    // Discard Modal
    const discardState = gameState.discardState;
    if (discardState.isDiscarding) {
        modals.discardOverlay.classList.add('visible');
        document.getElementById('discard-prompt').textContent = `Please select ${discardState.count} card(s) from your hand to discard.`;
        document.getElementById('confirm-discard-btn').disabled = !discardState.cardToDiscard;
    } else {
        modals.discardOverlay.classList.remove('visible');
    }
    // Core Removal Confirmation Modal
    if (gameState.coreRemovalConfirmationState.isConfirming) {
        modals.coreRemovalConfirmationOverlay.classList.add('visible');
    } else {
        modals.coreRemovalConfirmationOverlay.classList.remove('visible');
    }

    // Targeting Overlay
    if (gameState.targetingState.isTargeting) {
        modals.targetingOverlay.classList.add('visible');
    } else {
        modals.targetingOverlay.classList.remove('visible');
    }

    // Effect Choice Modal
    if (gameState.effectChoiceState.isChoosing) {
         modals.effectChoiceModal.classList.add('visible');
    } else {
         modals.effectChoiceModal.classList.remove('visible');
    }

    // Game Over Modal
    if (gameState.gameover) {
        document.getElementById('game-over-message').textContent = `${gameState.player.life <= 0 ? 'Opponent' : 'Player'} Wins!`;
        modals.gameOverModal.classList.add('visible');
    }

    // Deck Discard Viewer Modal
    const discardViewerState = gameState.deckDiscardViewerState;
    if (discardViewerState.isActive) {
        modals.deckDiscardViewerModal.classList.add('visible');
        const container = document.getElementById('deck-discard-viewer-container');
        container.innerHTML = ''; // เคลียร์การ์ดเก่าออกก่อน
        discardViewerState.cards.forEach(card => {
            // ใช้ createCardElement เพื่อความสอดคล้อง แต่กำหนด location เป็น 'viewer'
            // เพื่อไม่ให้มี effect พิเศษเช่น 'can-attack'
            const cardEl = createCardElement(card, 'viewer', discardViewerState.owner, gameState, callbacks);
            container.appendChild(cardEl);
        });
    } else {
        modals.deckDiscardViewerModal.classList.remove('visible');
    }
}