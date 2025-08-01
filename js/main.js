// js/main.js
import { allCards } from './cards.js';
import { updateUI, phaseBtn, restartBtn, cancelSummonBtn, confirmSummonBtn, confirmPlacementBtn, gameOverModal, takeDamageBtn, playerHandContainer, playerFieldElement, playerReserveCoreContainer, passFlashBtn, confirmFlashBtn, cancelFlashBtn } from './ui.js';
import { getSpiritLevelAndBP } from './utils.js';
import { summonSpiritAI, drawCard, calculateCost, checkGameOver, cancelSummon, confirmSummon, confirmPlacement, performRefreshStep, takeLifeDamage, declareBlock, initiateSummon, selectCoreForPlacement, selectCoreForPayment, handleSpiritClick, enterFlashTiming, passFlash, initiateFlashPayment, confirmFlashPayment, cancelFlashPayment } from './actions.js';

let gameState;

const callbacks = {
    onInitiateSummon: (cardUid) => {
        initiateSummon(cardUid, gameState);
        updateUI(gameState, callbacks);
    },
    onSpiritClick: (cardData) => {
        const actionResult = handleSpiritClick(cardData, gameState);
        if (actionResult) {
            updateUI(gameState, callbacks);
        }
    },
    onSelectCoreForPayment: (coreId, from, spiritUid) => {
        selectCoreForPayment(coreId, from, spiritUid, gameState);
        updateUI(gameState, callbacks);
    },
    onSelectCoreForPlacement: (coreId, from, spiritUid) => {
        selectCoreForPlacement(coreId, from, spiritUid, gameState);
        updateUI(gameState, callbacks);
    },
    // This now initiates the payment process instead of instantly using the card
    onUseFlash: (cardUid) => {
        initiateFlashPayment(cardUid, gameState);
        updateUI(gameState, callbacks);
    }
};

function advancePhase() {
    if (gameState.turn !== 'player' || gameState.summoningState.isSummoning || gameState.placementState.isPlacing || gameState.attackState.isAttacking || gameState.flashState.isActive) return;

    if (gameState.phase === 'attack' && gameState.attackState.isAttacking && gameState.attackState.defender === 'opponent') {
        enterFlashTiming(gameState, 'beforeBlock');
    } else {
        switch (gameState.phase) {
            case 'main':
                if (gameState.gameTurn === 1) endTurn();
                else gameState.phase = 'attack';
                break;
            case 'attack':
                endTurn();
                break;
            default:
                endTurn();
                break;
        }
    }
    updateUI(gameState, callbacks);
}

function startPlayerTurn() {
    gameState.phase = 'start';
    updateUI(gameState, callbacks);
    setTimeout(() => {
        gameState.phase = 'core';
        if (gameState.gameTurn > 1) {
            gameState.player.reserve.push({ id: `core-plr-${Date.now()}` });
        }
        updateUI(gameState, callbacks);
    }, 500);
    setTimeout(() => {
        gameState.phase = 'draw';
        drawCard('player', gameState);
        updateUI(gameState, callbacks);
    }, 1000);
    setTimeout(() => {
        gameState.phase = 'refresh';
        performRefreshStep('player', gameState);
        updateUI(gameState, callbacks);
    }, 1500);
    setTimeout(() => {
        gameState.phase = 'main';
        updateUI(gameState, callbacks);
    }, 2000);
}

function runAiTurn() {
    gameState.phase = 'start';
    updateUI(gameState, callbacks);
    setTimeout(() => {
        gameState.phase = 'core';
        gameState.opponent.reserve.push({ id: `core-opp-${Date.now()}` });
        updateUI(gameState, callbacks);
    }, 500);
    setTimeout(() => {
        gameState.phase = 'draw';
        drawCard('opponent', gameState);
        updateUI(gameState, callbacks);
    }, 1000);
    setTimeout(() => {
        gameState.phase = 'refresh';
        performRefreshStep('opponent', gameState);
        updateUI(gameState, callbacks);
    }, 1500);
    setTimeout(() => {
        gameState.phase = 'main';
        const summonableCards = gameState.opponent.hand.filter(card => card.type === 'Spirit' && (calculateCost(card, 'opponent', gameState) + 1) <= gameState.opponent.reserve.length).sort((a, b) => b.cost - a.cost);
        if (summonableCards.length > 0) {
            if (summonSpiritAI('opponent', summonableCards[0].uid, gameState)) {
                 updateUI(gameState, callbacks);
            }
        }
        setTimeout(() => aiAttackStep(true), 1000);
    }, 2000);
}

function aiAttackStep(isNewAttackDeclaration) {
    if (gameState.gameover) return;
    gameState.phase = 'attack';
    updateUI(gameState, callbacks);

    if (isNewAttackDeclaration) {
        const attackers = gameState.opponent.field.filter(s => !s.isExhausted);
        if (attackers.length > 0) {
            attackers.sort((a, b) => getSpiritLevelAndBP(b).bp - getSpiritLevelAndBP(a).bp);
            const attacker = attackers[0];
            gameState.attackState = { isAttacking: true, attackerUid: attacker.uid, defender: 'player' };
            enterFlashTiming(gameState, 'beforeBlock');
            updateUI(gameState, callbacks);
        } else {
            setTimeout(endAiTurn, 500);
        }
    }
}

function endAiTurn() {
    if (gameState.gameover) return;
    gameState.phase = 'end';
    updateUI(gameState, callbacks);
    setTimeout(() => {
        gameState.turn = 'player';
        gameState.gameTurn++;
        startPlayerTurn();
    }, 500);
}

function endTurn() {
    gameState.phase = 'end';
    updateUI(gameState, callbacks);
    setTimeout(() => {
        gameState.turn = 'opponent';
        updateUI(gameState, callbacks);
        setTimeout(runAiTurn, 500);
    }, 500);
}

function initializeGame() {
    let uniqueIdCounter = 0;
    const createDeck = () => JSON.parse(JSON.stringify(allCards)).map(c => ({...c, uid: `card-${uniqueIdCounter++}`, cores: [], isExhausted: false })).sort(() => Math.random() - 0.5);
    gameState = {
        turn: 'player', gameTurn: 1, gameover: false, phase: 'start',
        summoningState: { isSummoning: false, cardToSummon: null, costToPay: 0, selectedCores: [] },
        placementState: { isPlacing: false, targetSpiritUid: null },
        attackState: { isAttacking: false, attackerUid: null, defender: null, blockerUid: null },
        flashState: { isActive: false, priority: 'player', hasPassed: { player: false, opponent: false } },
        flashPaymentState: { isPaying: false, cardToUse: null, costToPay: 0, selectedCores: [] },
        player: { life: 5, deck: createDeck(), hand: [], field: [], reserve: [], costTrash: [], cardTrash: [] },
        opponent: { life: 5, deck: createDeck(), hand: [], field: [], reserve: [], costTrash: [], cardTrash: [] }
    };
    for (let i = 0; i < 4; i++) {
        drawCard('player', gameState);
        drawCard('opponent', gameState);
    }
    for (let i = 0; i < 4; i++) {
        gameState.player.reserve.push({ id: `core-plr-init-${i}` });
        gameState.opponent.reserve.push({ id: `core-opp-init-${i}` });
    }
    gameOverModal.classList.remove('visible');
    startPlayerTurn();
}

// --- Event Listeners ---
phaseBtn.addEventListener('click', advancePhase);
restartBtn.addEventListener('click', initializeGame);

// Summoning listeners
cancelSummonBtn.addEventListener('click', () => {
    cancelSummon(gameState);
    updateUI(gameState, callbacks);
});
confirmSummonBtn.addEventListener('click', () => {
    if (confirmSummon(gameState)) {
        updateUI(gameState, callbacks);
    }
});
confirmPlacementBtn.addEventListener('click', () => {
    confirmPlacement(gameState);
    updateUI(gameState, callbacks);
});

// Battle listeners
takeDamageBtn.addEventListener('click', () => {
    takeLifeDamage(gameState);
    updateUI(gameState, callbacks);
    setTimeout(() => aiAttackStep(true), 500);
});

// Flash listeners
passFlashBtn.addEventListener('click', () => {
    const resolutionStatus = passFlash(gameState);

    if (!gameState.flashState.isActive) {
        updateUI(gameState, callbacks);
        if (resolutionStatus === 'battle_resolved') {
            setTimeout(() => aiAttackStep(true), 500);
        }
        return;
    }

    updateUI(gameState, callbacks);
    if (gameState.flashState.priority === 'opponent') {
        setTimeout(() => {
            const finalResolutionStatus = passFlash(gameState);
            updateUI(gameState, callbacks);
            if (finalResolutionStatus === 'battle_resolved') {
                setTimeout(() => aiAttackStep(true), 500);
            }
        }, 500);
    }
});

// NEW: Flash Payment listeners
cancelFlashBtn.addEventListener('click', () => {
    cancelFlashPayment(gameState);
    updateUI(gameState, callbacks);
});

confirmFlashBtn.addEventListener('click', () => {
    if (confirmFlashPayment(gameState)) {
        updateUI(gameState, callbacks);
        // After using magic, it's AI's turn to get priority.
        // It will auto-pass.
        setTimeout(() => {
            const resolutionStatus = passFlash(gameState); // AI passes priority
            updateUI(gameState, callbacks);
            if (!gameState.flashState.isActive) { // Check if that pass resolved the window
                if (resolutionStatus === 'battle_resolved') {
                     setTimeout(() => aiAttackStep(true), 500);
                }
            }
        }, 500);
    }
});


function delegateClick(event) {
    const cardEl = event.target.closest('.card');
    const coreEl = event.target.closest('.core');
    const isPayingForSomething = gameState.summoningState.isSummoning || gameState.flashPaymentState.isPaying;

    if (cardEl && !isPayingForSomething) {
        const cardId = cardEl.id;
        const isPlayerHandCard = gameState.player.hand.some(c => c.uid === cardId);
        const isPlayerFieldCard = gameState.player.field.some(c => c.uid === cardId);

        if (isPlayerHandCard) {
            const cardData = gameState.player.hand.find(c => c.uid === cardId);
            if (cardData.hasFlash && gameState.flashState.isActive && gameState.flashState.priority === 'player') {
                callbacks.onUseFlash(cardId);
            } else if (cardData.type === 'Spirit' && gameState.phase === 'main' && gameState.turn === 'player'){
                callbacks.onInitiateSummon(cardId);
            }
        } else if (isPlayerFieldCard) {
            const cardData = gameState.player.field.find(c => c.uid === cardId);
            callbacks.onSpiritClick(cardData);
        }
    } else if (coreEl) { // Core clicks are only for payment
        const coreId = coreEl.id;
        const parentCardEl = coreEl.closest('.card');
        const from = parentCardEl ? 'field' : 'reserve';
        const spiritUid = parentCardEl ? parentCardEl.id : null;
        if (isPayingForSomething) {
            callbacks.onSelectCoreForPayment(coreId, from, spiritUid);
        } else if (gameState.placementState.isPlacing) {
             callbacks.onSelectCoreForPlacement(coreId, from, spiritUid);
        }
    }
}

playerFieldElement.addEventListener('click', delegateClick);
playerReserveCoreContainer.addEventListener('click', delegateClick);
playerHandContainer.addEventListener('click', delegateClick);

document.addEventListener('DOMContentLoaded', initializeGame);