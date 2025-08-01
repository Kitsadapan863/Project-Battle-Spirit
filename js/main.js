// js/main.js
import { allCards } from './cards.js';
import { updateUI, phaseBtn, restartBtn, cancelSummonBtn, confirmSummonBtn, confirmPlacementBtn, gameOverModal, takeDamageBtn } from './ui.js';
import { getSpiritLevelAndBP } from './utils.js'; // *** CHANGE: Import from utils.js ***
import { summonSpiritAI, drawCard, calculateCost, checkGameOver, cancelSummon, confirmSummon, confirmPlacement, calculateTotalSymbols, performRefreshStep, takeLifeDamage, declareBlock } from './actions.js';

let gameState;

// ... (The rest of the main.js file is the same as the previous complete version) ...
function advancePhase() {
    if (gameState.turn !== 'player' || gameState.summoningState.isSummoning || gameState.placementState.isPlacing) return;

    switch (gameState.phase) {
        case 'main':
            if (gameState.gameTurn === 1) {
                endTurn();
            } else {
                gameState.phase = 'attack';
            }
            break;
        case 'attack':
            endTurn();
            break;
        default:
            endTurn();
            break;
    }
    updateUI(gameState);
}

function startPlayerTurn() {
    gameState.phase = 'start';
    updateUI(gameState);

    setTimeout(() => {
        gameState.phase = 'core';
        if (gameState.gameTurn > 1) {
            gameState.player.reserve.push({ id: `core-plr-${Date.now()}` });
        }
        updateUI(gameState);
    }, 500);

    setTimeout(() => {
        gameState.phase = 'draw';
        drawCard('player', gameState);
        updateUI(gameState);
    }, 1000);
    
    setTimeout(() => {
        gameState.phase = 'refresh';
        performRefreshStep('player', gameState);
        updateUI(gameState);
    }, 1500);

    setTimeout(() => {
        gameState.phase = 'main';
        console.log("Player's Main Step");
        updateUI(gameState);
    }, 2000);
}

function runAiTurn() {
    console.log("AI Turn Starts");
    gameState.phase = 'start';
    
    setTimeout(() => {
        gameState.phase = 'core';
        gameState.opponent.reserve.push({ id: `core-opp-${Date.now()}` });
        updateUI(gameState);
    }, 500);
    setTimeout(() => {
        gameState.phase = 'draw';
        drawCard('opponent', gameState);
        updateUI(gameState);
    }, 1000);
    setTimeout(() => {
        gameState.phase = 'refresh';
        performRefreshStep('opponent', gameState);
        updateUI(gameState);
    }, 1500);
    
    setTimeout(() => {
        console.log("AI Main Step");
        gameState.phase = 'main';
        const summonableCards = gameState.opponent.hand
            .filter(card => {
                const finalCost = calculateCost(card, 'opponent', gameState);
                return (finalCost + 1) <= gameState.opponent.reserve.length;
            })
            .sort((a, b) => b.cost - a.cost);
        if (summonableCards.length > 0) {
            if (summonSpiritAI('opponent', summonableCards[0].uid, gameState)) {
                 updateUI(gameState);
            }
        }
    }, 2000);

    setTimeout(() => {
        console.log("AI Attack Step");
        gameState.phase = 'attack';
        const attackers = gameState.opponent.field.filter(s => !s.isExhausted);
        if (attackers.length > 0) {
            attackers.sort((a, b) => getSpiritLevelAndBP(b).bp - getSpiritLevelAndBP(a).bp);
            const strongestAttacker = attackers[0];
            
            gameState.attackState = {
                isAttacking: true,
                attackerUid: strongestAttacker.uid,
                defender: 'player'
            };
            updateUI(gameState);
        } else {
            setTimeout(endAiTurn, 500);
        }
    }, 3000);
}

function endAiTurn() {
    if (gameState.gameover) return;
    console.log("AI Turn Ends");
    gameState.phase = 'end';
    updateUI(gameState);
    setTimeout(() => {
        gameState.turn = 'player';
        gameState.gameTurn++;
        startPlayerTurn();
    }, 500);
}

function endTurn() {
    console.log("Player ends their turn.");
    gameState.phase = 'end';
    updateUI(gameState);
    setTimeout(() => {
        gameState.turn = 'opponent';
        updateUI(gameState);
        setTimeout(runAiTurn, 500);
    }, 500);
}

function initializeGame() {
    let uniqueIdCounter = 0;
    const createDeck = () => JSON.parse(JSON.stringify(allCards))
        .map(c => ({...c, uid: `card-${uniqueIdCounter++}`, cores: [], isExhausted: false }))
        .sort(() => Math.random() - 0.5);

    gameState = {
        turn: 'player',
        gameTurn: 1,
        gameover: false,
        phase: 'start',
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

phaseBtn.addEventListener('click', () => {
    if (gameState.phase === 'attack' && gameState.attackState.isAttacking && gameState.attackState.defender === 'opponent') {
        const attacker = gameState.player.field.find(s => s.uid === gameState.attackState.attackerUid);
        const potentialBlockers = gameState.opponent.field.filter(s => !s.isExhausted && getSpiritLevelAndBP(s).bp >= getSpiritLevelAndBP(attacker).bp);

        if (potentialBlockers.length > 0) {
            const blocker = potentialBlockers[0];
            declareBlock(blocker.uid, gameState);
        } else {
            takeLifeDamage(gameState);
        }
        updateUI(gameState);
    } else {
        advancePhase();
    }
});
restartBtn.addEventListener('click', initializeGame);
cancelSummonBtn.addEventListener('click', () => {
    cancelSummon(gameState);
    updateUI(gameState);
});
confirmSummonBtn.addEventListener('click', () => {
    if (confirmSummon(gameState)) {
        updateUI(gameState);
    }
});
confirmPlacementBtn.addEventListener('click', () => {
    confirmPlacement(gameState);
    updateUI(gameState);
});
takeDamageBtn.addEventListener('click', () => {
    takeLifeDamage(gameState);
    updateUI(gameState);
    setTimeout(endAiTurn, 500);
});

document.addEventListener('DOMContentLoaded', initializeGame);
