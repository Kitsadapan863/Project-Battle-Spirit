// js/core/gameLoop.js
import { updateUI } from '../ui/index.js';
import { drawCard } from '../game_actions/card.js';
import { summonSpiritAI } from '../game_actions/summon.js';
import { calculateCost } from '../utils.js';
import { getSpiritLevelAndBP, getCardLevel } from '../utils.js';
import { resolveTriggeredEffects } from '../effects/index.js';
import { enterFlashTiming } from '../game_actions/battle.js';

// --- Helper Functions ---
function performRefreshStep(playerType, gameState) {
    const player = gameState[playerType];
    player.field.forEach(card => {
        if (card.type === 'Spirit') {
            card.isExhausted = false;
        }
    });
    if (player.costTrash.length > 0) {
        player.reserve.push(...player.costTrash);
        player.costTrash = [];
    }
}

function clearBattleBuffs(playerKey, gameState) {
    gameState[playerKey].field.forEach(spirit => {
        if (spirit.tempBuffs && spirit.tempBuffs.length > 0) {
            spirit.tempBuffs = spirit.tempBuffs.filter(buff => buff.duration !== 'battle');
        }
    });
}

function clearTemporaryBuffs(playerKey, gameState) {
    gameState[playerKey].field.forEach(spirit => {
        if (spirit.tempBuffs && spirit.tempBuffs.length > 0) {
            spirit.tempBuffs = spirit.tempBuffs.filter(buff => buff.duration !== 'turn');
        }
    });
    gameState[playerKey].tempBuffs = [];
}

export function checkGameOver(gameState) {
    if (gameState.gameover) return false;
    let winner = null;
    if (gameState.player.life <= 0) winner = 'Opponent';
    if (gameState.opponent.life <= 0) winner = 'Player';
    if (winner) {
        gameState.gameover = true;
        return true;
    }
    return false;
}

// --- Main Game Loop Functions ---
export function advancePhase(gameState, callbacks) {
    if (gameState.turn !== 'player' || gameState.summoningState.isSummoning || gameState.placementState.isPlacing || gameState.attackState.isAttacking || gameState.flashState.isActive || gameState.discardState.isDiscarding || gameState.targetingState.isTargeting) return;

    if (gameState.phase === 'attack' && !gameState.attackState.isAttacking) {
        endTurn(gameState, callbacks);
    } else {
        switch (gameState.phase) {
            case 'main':
                if (gameState.gameTurn === 1) endTurn(gameState, callbacks);
                else gameState.phase = 'attack';
                break;
            case 'attack':
                endTurn(gameState, callbacks);
                break;
            default:
                endTurn(gameState, callbacks);
                break;
        }
    }
    updateUI(gameState, callbacks);
}

export function startPlayerTurn(gameState, callbacks) {
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
        if (checkGameOver(gameState)) {
            updateUI(gameState, callbacks);
            return;
        }
        updateUI(gameState, callbacks);
        setTimeout(() => proceedToRefresh(gameState, callbacks), 500);
    }, 1000);
}

function proceedToRefresh(gameState, callbacks) {
    setTimeout(() => {
        gameState.phase = 'refresh';
        performRefreshStep('player', gameState);
        updateUI(gameState, callbacks);
    }, 500);
    setTimeout(() => {
        gameState.phase = 'main';
        updateUI(gameState, callbacks);
    }, 1000);
}

function runAiTurn(gameState, callbacks) {
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
        if (checkGameOver(gameState)) {
            updateUI(gameState, callbacks);
            return;
        }
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
        setTimeout(() => aiAttackStep(gameState, callbacks, true), 1000);
    }, 2000);
}

export function aiAttackStep(gameState, callbacks, isNewAttackDeclaration) {
    if (gameState.gameover) return;
    gameState.phase = 'attack';
    
    if (isNewAttackDeclaration) {
        const attackers = gameState.opponent.field.filter(s => s.type === 'Spirit' && !s.isExhausted);
        
        if (attackers.length > 0) { 
            attackers.sort((a, b) => getSpiritLevelAndBP(b, 'opponent', gameState).bp - getSpiritLevelAndBP(a, 'opponent', gameState).bp);
            const attacker = attackers[0];
            
            attacker.isExhausted = true;
            gameState.attackState = { isAttacking: true, attackerUid: attacker.uid, defender: 'player', blockerUid: null, isClash: false };
            resolveTriggeredEffects(attacker, 'whenAttacks', 'opponent', gameState);
            
            if (!gameState.deckDiscardViewerState.isActive) {
                enterFlashTiming(gameState, 'beforeBlock');
            }
            
            updateUI(gameState, callbacks);
        } else {
            setTimeout(() => endAiTurn(gameState, callbacks), 500);
        }
    } else {
        updateUI(gameState, callbacks);
    }
}

function endAiTurn(gameState, callbacks) {
    if (gameState.gameover) return;
    gameState.phase = 'end';
    clearTemporaryBuffs('opponent', gameState);
    clearTemporaryBuffs('player', gameState);
    updateUI(gameState, callbacks);
    setTimeout(() => {
        gameState.turn = 'player';
        gameState.gameTurn++;
        startPlayerTurn(gameState, callbacks);
    }, 500);
}

function endTurn(gameState, callbacks) {
    gameState.phase = 'end';
    clearTemporaryBuffs('player', gameState);
    clearTemporaryBuffs('opponent', gameState);
    gameState.turn = 'opponent';
    gameState.gameTurn++;
    updateUI(gameState, callbacks);
    setTimeout(() => {
        runAiTurn(gameState, callbacks);
    }, 1000);
}