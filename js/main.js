// js/main.js
import { allCards } from './cards.js';
import { updateUI, phaseBtn, restartBtn, cancelSummonBtn, confirmSummonBtn, confirmPlacementBtn, gameOverModal, takeDamageBtn } from './ui.js';
import { getSpiritLevelAndBP } from './utils.js';
import { summonSpiritAI, drawCard, calculateCost, checkGameOver, cancelSummon, confirmSummon, confirmPlacement, calculateTotalSymbols, performRefreshStep, takeLifeDamage, declareBlock, initiateSummon, selectCoreForPlacement, selectCoreForPayment, handleSpiritClick } from './actions.js';

let gameState;

// Callbacks object to pass to UI functions, breaking the circular dependency
const callbacks = {
    onInitiateSummon: (cardUid) => {
        initiateSummon(cardUid, gameState);
        updateUI(gameState, callbacks);
    },
    onSpiritClick: (cardData) => {
        const actionResult = handleSpiritClick(cardData, gameState);
        if (actionResult) {
            updateUI(gameState, callbacks);
            if (actionResult === 'block') {
                setTimeout(aiAttackStep, 500);
            }
        }
    },
    onSelectCoreForPayment: (coreId, from, spiritUid) => {
        selectCoreForPayment(coreId, from, spiritUid, gameState);
        updateUI(gameState, callbacks);
    },
    onSelectCoreForPlacement: (coreId, from, spiritUid) => {
        selectCoreForPlacement(coreId, from, spiritUid, gameState);
        updateUI(gameState, callbacks);
    }
};

function advancePhase() {
    if (gameState.turn !== 'player' || gameState.summoningState.isSummoning || gameState.placementState.isPlacing) return;

    if (gameState.phase === 'attack' && gameState.attackState.isAttacking && gameState.attackState.defender === 'opponent') {
        const attacker = gameState.player.field.find(s => s.uid === gameState.attackState.attackerUid);
        const potentialBlockers = gameState.opponent.field.filter(s => !s.isExhausted && getSpiritLevelAndBP(s).bp >= getSpiritLevelAndBP(attacker).bp);

        if (potentialBlockers.length > 0) {
            const blocker = potentialBlockers[0];
            declareBlock(blocker.uid, gameState);
        } else {
            takeLifeDamage(gameState);
        }
        gameState.attackState.isAttacking = false;
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
        const summonableCards = gameState.opponent.hand.filter(card => (calculateCost(card, 'opponent', gameState) + 1) <= gameState.opponent.reserve.length).sort((a, b) => b.cost - a.cost);
        if (summonableCards.length > 0) {
            if (summonSpiritAI('opponent', summonableCards[0].uid, gameState)) {
                 updateUI(gameState, callbacks);
            }
        }
        setTimeout(aiAttackStep, 1000);
    }, 2000);
}

function aiAttackStep() {
    if (gameState.gameover) return;
    gameState.phase = 'attack';
    updateUI(gameState, callbacks);
    const attackers = gameState.opponent.field.filter(s => !s.isExhausted);
    if (attackers.length > 0) {
        attackers.sort((a, b) => getSpiritLevelAndBP(b).bp - getSpiritLevelAndBP(a).bp);
        const attacker = attackers[0];
        gameState.attackState = { isAttacking: true, attackerUid: attacker.uid, defender: 'player' };
        updateUI(gameState, callbacks);
    } else {
        setTimeout(endAiTurn, 500);
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
    setTimeout(aiAttackStep, 500);
});

document.addEventListener('DOMContentLoaded', initializeGame);
