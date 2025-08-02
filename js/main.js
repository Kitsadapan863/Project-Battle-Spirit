// js/main.js
import { allCards } from './cards.js';
import { updateUI, phaseBtn, restartBtn, cancelSummonBtn, confirmSummonBtn, confirmPlacementBtn, gameOverModal, takeDamageBtn, playerHandContainer, playerFieldElement, playerReserveCoreContainer, passFlashBtn, confirmMagicBtn, cancelMagicBtn, cardTrashModal, closeTrashViewerBtn, playerCardTrashZone, opponentCardTrashZone, opponentCardTrashModal, closeOpponentTrashViewerBtn } from './ui.js';
import { getSpiritLevelAndBP } from './utils.js';
import { summonSpiritAI, drawCard, calculateCost, checkGameOver, cancelSummon, confirmSummon, confirmPlacement, performRefreshStep, takeLifeDamage, declareBlock, initiateSummon, selectCoreForPlacement, selectCoreForPayment, handleSpiritClick, enterFlashTiming, passFlash, initiateMagicPayment, confirmMagicPayment, cancelMagicPayment } from './actions.js';

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
    onUseMagic: (cardUid, timing) => {
        initiateMagicPayment(cardUid, timing, gameState);
        updateUI(gameState, callbacks);
    }
};

function advancePhase() {
    if (gameState.turn !== 'player' || gameState.summoningState.isSummoning || gameState.placementState.isPlacing || gameState.attackState.isAttacking || gameState.flashState.isActive) return;

    if (gameState.phase === 'attack' && !gameState.attackState.isAttacking) {
        endTurn();
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
    
    if (isNewAttackDeclaration) {
        const attackers = gameState.opponent.field.filter(s => !s.isExhausted);
        if (attackers.length > 0) {
            attackers.sort((a, b) => getSpiritLevelAndBP(b).bp - getSpiritLevelAndBP(a).bp);
            const attacker = attackers[0];
            
            attacker.isExhausted = true;
            gameState.attackState = { isAttacking: true, attackerUid: attacker.uid, defender: 'player' };
            enterFlashTiming(gameState, 'beforeBlock');
            updateUI(gameState, callbacks);
        } else {
            setTimeout(endAiTurn, 500);
        }
    } else {
        updateUI(gameState, callbacks);
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
        flashState: { isActive: false, timing: null, priority: 'player', hasPassed: { player: false, opponent: false } },
        // *** FIXED: Renamed flashPaymentState to magicPaymentState ***
        magicPaymentState: { isPaying: false, cardToUse: null, costToPay: 0, selectedCores: [], timing: null },
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
takeDamageBtn.addEventListener('click', () => {
    takeLifeDamage(gameState);
    updateUI(gameState, callbacks);
    setTimeout(() => aiAttackStep(true), 500);
});

playerCardTrashZone.addEventListener('click', () => {
    cardTrashModal.classList.add('visible');
});
opponentCardTrashZone.addEventListener('click', () => { 
    opponentCardTrashModal.classList.add('visible');
});
closeOpponentTrashViewerBtn.addEventListener('click', () => {
    opponentCardTrashModal.classList.remove('visible');
});
closeTrashViewerBtn.addEventListener('click', () => {
    cardTrashModal.classList.remove('visible');
});

passFlashBtn.addEventListener('click', () => {
    const resolutionStatus = passFlash(gameState);
    updateUI(gameState, callbacks);

    if (!gameState.flashState.isActive) {
        if (resolutionStatus === 'battle_resolved') {
            setTimeout(() => aiAttackStep(true), 500);
        }
        return;
    }

    if (gameState.flashState.priority === 'opponent') {
        setTimeout(() => {
            const finalResolutionStatus = passFlash(gameState);
            updateUI(gameState, callbacks);

            if (!gameState.flashState.isActive) {
                if (finalResolutionStatus === 'battle_resolved') {
                    setTimeout(() => aiAttackStep(true), 500);
                }
            }
        }, 500);
    }
});

cancelMagicBtn.addEventListener('click', () => {
    cancelMagicPayment(gameState);
    updateUI(gameState, callbacks);
});

confirmMagicBtn.addEventListener('click', () => {
    if (confirmMagicPayment(gameState)) {
        updateUI(gameState, callbacks);
        
        if (gameState.flashState.isActive) {
            setTimeout(() => {
                const resolutionStatus = passFlash(gameState);
                updateUI(gameState, callbacks);

                if (!gameState.flashState.isActive) {
                     if (resolutionStatus === 'battle_resolved') {
                         setTimeout(() => aiAttackStep(true), 500);
                    }
                }
            }, 500);
        }
    }
});

function delegateClick(event) {
    const cardEl = event.target.closest('.card');
    const coreEl = event.target.closest('.core');
    const isPayingForSomething = gameState.summoningState.isSummoning || gameState.magicPaymentState.isPaying;
    const isActionableTurn = gameState.turn === 'player' && !isPayingForSomething && !gameState.placementState.isPlacing;

    if (cardEl && isActionableTurn) {
        const cardId = cardEl.id;
        const cardDataInHand = gameState.player.hand.find(c => c.uid === cardId);
        const cardDataOnField = gameState.player.field.find(c => c.uid === cardId);

        if (cardDataInHand) {
            const isMainStep = gameState.phase === 'main';
            const isFlashTiming = gameState.flashState.isActive && gameState.flashState.priority === 'player';
            
            const canUseFlashEffect = cardDataInHand.effects?.flash;
            const canUseMainEffect = cardDataInHand.effects?.main;

            if (isFlashTiming && canUseFlashEffect) {
                callbacks.onUseMagic(cardId, 'flash');
            } else if (isMainStep && cardDataInHand.type === 'Magic') {
                if (canUseMainEffect) {
                    callbacks.onUseMagic(cardId, 'main');
                } else if (canUseFlashEffect) {
                    callbacks.onUseMagic(cardId, 'flash');
                }
            } else if (isMainStep && (cardDataInHand.type === 'Spirit' || cardDataInHand.type === 'Nexus')){
                callbacks.onInitiateSummon(cardId);
            }
        } else if (cardDataOnField) {
            callbacks.onSpiritClick(cardDataOnField);
        }
    } else if (coreEl) {
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