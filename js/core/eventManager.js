// js/core/eventManager.js
import { updateUI } from '../ui/index.js';
import { advancePhase, aiAttackStep  } from './gameLoop.js';
import * as SummonActions from '../game_actions/summon.js';
import * as BattleActions from '../game_actions/battle.js';
import * as MagicActions from '../game_actions/magic.js';
import * as CardActions from '../game_actions/card.js';
import * as CoreActions from '../game_actions/core.js';
import { getSpiritLevelAndBP } from '../utils.js';
import * as UIComponents from '../ui/components.js';

/**
 * จัดการการคลิกบน Spirit หรือ Nexus บนสนาม
 */
export function handleSpiritClick(cardData, gameState, callbacks) {
    if (gameState.targetingState.isTargeting) {
        const effectTargetInfo = gameState.targetingState.forEffect.target;
        const cardOwnerKey = gameState.player.field.some(c => c.uid === cardData.uid) ? 'player' : 'opponent';
        let isValidTarget = false;
        if ((effectTargetInfo.scope === 'any' || effectTargetInfo.scope === cardOwnerKey) && cardData.type.toLowerCase() === effectTargetInfo.type) {
             if (!effectTargetInfo.bpOrLess || getSpiritLevelAndBP(cardData, cardOwnerKey, gameState).bp <= effectTargetInfo.bpOrLess) {
                isValidTarget = true;
            }
        }
        if (isValidTarget) {
            gameState.targetingState.onTarget(cardData.uid);
            return true;
        }
        return false;
    }

    if (cardData.type === 'Spirit' && gameState.turn === 'player' && gameState.phase === 'attack' && !cardData.isExhausted && !gameState.attackState.isAttacking && gameState.gameTurn > 1) {
        BattleActions.declareAttack(cardData.uid, gameState);
        return true;
    }
    
    else if (gameState.attackState.isAttacking && gameState.attackState.defender === 'player' && !cardData.isExhausted && !gameState.flashState.isActive) {
        const isPlayerCard = gameState.player.field.some(c => c.uid === cardData.uid);
        if (isPlayerCard) {
            BattleActions.declareBlock(cardData.uid, gameState);
            return true;
        }
    }
    return false;
}

/**
 * จัดการการคลิกทั้งหมดบน Game Board
 */
function delegateClick(event, gameState, callbacks) {
    const cardEl = event.target.closest('.card');
    const coreEl = event.target.closest('.core');

    if (coreEl) {
        const isPaying = gameState.summoningState.isSummoning || gameState.magicPaymentState.isPaying;
        const isPlacing = gameState.placementState.isPlacing;
        const parentCardEl = coreEl.closest('.card');
        const from = parentCardEl ? 'field' : 'reserve';
        const spiritUid = parentCardEl ? parentCardEl.id : null;

        if (isPaying) callbacks.onSelectCoreForPayment(coreEl.id, from, spiritUid);
        else if (isPlacing) callbacks.onSelectCoreForPlacement(coreEl.id, from, spiritUid);
        return;
    }

    if (cardEl) {
        const cardId = cardEl.id;
        const cardDataInHand = gameState.player.hand.find(c => c.uid === cardId);
        const cardDataOnField = gameState.player.field.find(c => c.uid === cardId) || gameState.opponent.field.find(c => c.uid === cardId);

        if (cardDataOnField) {
            callbacks.onSpiritClick(cardDataOnField);
            return;
        }

        if (cardDataInHand) {
            if (gameState.discardState.isDiscarding) {
                callbacks.onSelectCardForDiscard(cardId);
                return;
            }
            const canTakeAction = !gameState.summoningState.isSummoning && !gameState.magicPaymentState.isPaying && !gameState.placementState.isPlacing;
            if (canTakeAction) handleHandCardClick(cardDataInHand, gameState, callbacks);
        }
    }
}

/**
 * จัดการตรรกะเมื่อคลิกการ์ดบนมือ
 */
function handleHandCardClick(cardData, gameState, callbacks) {
    const isPlayerTurn = gameState.turn === 'player';
    const isMainStep = gameState.phase === 'main';
    const isFlashTiming = gameState.flashState.isActive && gameState.flashState.priority === 'player';

    if ((cardData.type === 'Spirit' || cardData.type === 'Nexus') && isPlayerTurn && isMainStep) {
        callbacks.onInitiateSummon(cardData.uid);
        return;
    }
    
    if (cardData.type === 'Magic') {
        const canUseMain = cardData.effects?.some(e => e.timing === 'main');
        const canUseFlash = cardData.effects?.some(e => e.timing === 'flash');
        if (isMainStep && canUseMain && canUseFlash) {
            UIComponents.showEffectChoiceModal(cardData, (timing) => {
                 callbacks.onUseMagic(cardData.uid, timing);
            }, gameState, callbacks);
        } else if ((isMainStep || isFlashTiming) && canUseFlash) {
            callbacks.onUseMagic(cardData.uid, 'flash');
        } else if (isMainStep && canUseMain) {
            callbacks.onUseMagic(cardData.uid, 'main');
        }
    }
}

/**
 * ผูก Event Listeners ทั้งหมดเข้ากับ DOM Elements
 */
export function setupInitialEventListeners(gameState, callbacks) {
    const UIElements = UIComponents.getDOMElements();

    // Game Controls
    UIElements.phaseBtn.addEventListener('click', () => advancePhase(gameState, callbacks));
    UIElements.restartBtn.addEventListener('click', () => location.reload());

    // Modals
    UIElements.cancelSummonBtn.addEventListener('click', () => {
        SummonActions.cancelSummon(gameState);
        updateUI(gameState, callbacks);
    });
    UIElements.confirmSummonBtn.addEventListener('click', () => {
        if (SummonActions.confirmSummon(gameState, callbacks)) {
            updateUI(gameState, callbacks);
        }
    });
    UIElements.confirmPlacementBtn.addEventListener('click', () => {
        SummonActions.confirmPlacement(gameState);
        updateUI(gameState, callbacks);
    });
    UIElements.takeDamageBtn.addEventListener('click', () => {
        BattleActions.takeLifeDamage(gameState);
        updateUI(gameState, callbacks);
        setTimeout(() => aiAttackStep(gameState, callbacks, true), 1000);
    });

    // ---- START: แก้ไขส่วนนี้ ----
    // เหลือ Event Listener ของ passFlashBtn แค่อันเดียว
    UIElements.passFlashBtn.addEventListener('click', () => {
        let resolutionStatus = BattleActions.passFlash(gameState);
        updateUI(gameState, callbacks);

        if (!gameState.flashState.isActive) {
            if (resolutionStatus === 'battle_resolved' && gameState.turn === 'opponent') {
                setTimeout(() => aiAttackStep(gameState, callbacks, true), 1000);
            }
            return;
        }

        if (gameState.flashState.priority === 'opponent') {
            setTimeout(() => {
                resolutionStatus = BattleActions.passFlash(gameState);
                updateUI(gameState, callbacks);

                if (!gameState.flashState.isActive) {
                    if (resolutionStatus === 'battle_resolved' && gameState.turn === 'opponent') {
                        setTimeout(() => aiAttackStep(gameState, callbacks, true), 1000);
                    }
                }
            }, 500);
        }
    });
    // ---- END: แก้ไขส่วนนี้ ----

    UIElements.cancelMagicBtn.addEventListener('click', () => {
        MagicActions.cancelMagicPayment(gameState);
        updateUI(gameState, callbacks);
    });
    UIElements.confirmMagicBtn.addEventListener('click', () => {
        if (MagicActions.confirmMagicPayment(gameState, callbacks)) {
            updateUI(gameState, callbacks);
        }
    });
    UIElements.confirmDiscardBtn.addEventListener('click', () => {
        if (CardActions.confirmDiscard(gameState)) {
            if (!gameState.discardState.isDiscarding && gameState.phase === 'draw') {
                 // proceedToRefresh();
            }
            updateUI(gameState, callbacks);
        }
    });
    UIElements.confirmCoreRemovalBtn.addEventListener('click', () => {
        if (CoreActions.confirmCoreRemoval(gameState)) {
            updateUI(gameState, callbacks);
        }
    });
    UIElements.cancelCoreRemovalBtn.addEventListener('click', () => {
        CoreActions.cancelCoreRemoval(gameState);
        updateUI(gameState, callbacks);
    });
    UIElements.cancelEffectChoiceBtn.addEventListener('click', () => {
        gameState.effectChoiceState = { isChoosing: false, card: null };
        updateUI(gameState, callbacks);
    });

    // Trash Viewers
    UIElements.playerCardTrashZone.addEventListener('click', () => UIElements.cardTrashModal.classList.add('visible'));
    UIElements.closeTrashViewerBtn.addEventListener('click', () => UIElements.cardTrashModal.classList.remove('visible'));
    UIElements.opponentCardTrashZone.addEventListener('click', () => UIElements.opponentCardTrashModal.classList.add('visible'));
    UIElements.closeOpponentTrashViewerBtn.addEventListener('click', () => UIElements.opponentCardTrashModal.classList.remove('visible'));

    // Game Board Click Delegation
    const clickZones = [
        UIElements.playerFieldElement,
        UIElements.opponentFieldElement,
        UIElements.playerReserveCoreContainer,
        UIElements.playerHandContainer
    ];
    clickZones.forEach(zone => {
        if (zone) {
            zone.addEventListener('click', (e) => delegateClick(e, gameState, callbacks));
        }
    });
}