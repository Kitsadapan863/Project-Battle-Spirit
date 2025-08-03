// js/actions.js
import { getSpiritLevelAndBP, getCardLevel } from './utils.js';
import { resolveTriggeredEffects } from './effects.js';

// ... (destroyCard, cleanupField, performRefreshStep, etc. are the same) ...
function destroyCard(cardUid, ownerKey, gameState) {
    const owner = gameState[ownerKey];
    const cardIndex = owner.field.findIndex(c => c.uid === cardUid);

    if (cardIndex === -1) return;

    const [destroyedCard] = owner.field.splice(cardIndex, 1);

    if (destroyedCard.cores && destroyedCard.cores.length > 0) {
        owner.reserve.push(...destroyedCard.cores);
        destroyedCard.cores = [];
    }

    owner.cardTrash.push(destroyedCard);
    console.log(`Destroyed: ${ownerKey}'s ${destroyedCard.name}`);
}

function cleanupField(gameState) {
    for (let i = gameState.player.field.length - 1; i >= 0; i--) {
        const card = gameState.player.field[i];
        if (card.type === 'Spirit' && card.cores.length === 0) {
            destroyCard(card.uid, 'player', gameState);
        }
    }
    for (let i = gameState.opponent.field.length - 1; i >= 0; i--) {
        const card = gameState.opponent.field[i];
        if (card.type === 'Spirit' && card.cores.length === 0) {
            destroyCard(card.uid, 'opponent', gameState);
        }
    }
}


export function performRefreshStep(playerType, gameState) {
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

// FIXED: Corrected the cost calculation logic
export function calculateCost(cardToSummon, playerType, gameState) {
    const player = gameState[playerType];
    const baseCost = cardToSummon.cost;
    let totalReduction = 0;

    // 1. Count all symbols on the player's field
    const fieldSymbols = { red: 0, purple: 0, green: 0, white: 0, blue: 0, yellow: 0 };
    player.field.forEach(card => {
        if (card.symbol) {
            for (const color in card.symbol) {
                if (fieldSymbols.hasOwnProperty(color)) {
                    fieldSymbols[color] += card.symbol[color];
                }
            }
        }
    });

    // 2. Calculate the reduction based on the card's symbol_cost
    if (cardToSummon.symbol_cost) {
        let potentialReduction = 0;
        for (const color in cardToSummon.symbol_cost) {
            if (fieldSymbols.hasOwnProperty(color)) {
                potentialReduction += fieldSymbols[color];
            }
        }

        let maxReduction = 0;
        for (const color in cardToSummon.symbol_cost) {
            maxReduction += cardToSummon.symbol_cost[color];
        }

        // The actual reduction is the lesser of the available symbols or the max allowed reduction
        totalReduction = Math.min(potentialReduction, maxReduction);
    }

    return Math.max(0, baseCost - totalReduction);
}


export function calculateTotalSymbols(spiritCard) {
    if (!spiritCard || !spiritCard.symbol) return 1;
    let total = 0;
    for (const color in spiritCard.symbol) {
        total += spiritCard.symbol[color];
    }
    return total > 0 ? total : 1;
}

export function summonSpiritAI(playerType, cardUid, gameState) {
    const player = gameState[playerType];
    const cardIndex = player.hand.findIndex(c => c.uid === cardUid);
    if (cardIndex === -1) return false;
    const cardToSummon = player.hand[cardIndex];
    if (cardToSummon.type !== 'Spirit') return false;
    const finalCost = calculateCost(cardToSummon, playerType, gameState);
    const totalCoresNeeded = finalCost + 1;
    if (player.reserve.length >= totalCoresNeeded) {
        const coresForCost = player.reserve.splice(0, finalCost);
        player.costTrash.push(...coresForCost);
        const [summonedCard] = player.hand.splice(cardIndex, 1);
        summonedCard.isExhausted = false;
        summonedCard.cores = [];
        const coreForLevel1 = player.reserve.shift();
        summonedCard.cores.push(coreForLevel1);
        player.field.push(summonedCard);
        // Initialize tempBuffs array
        summonedCard.tempBuffs = [];
        return true;
    }
    return false;
}

// MODIFIED: Function now accepts duration
export function applyPowerUpEffect(cardUid, power, duration, gameState) {
    const targetSpirit = gameState.player.field.find(s => s.uid === cardUid) || gameState.opponent.field.find(s => s.uid === cardUid);
    if (targetSpirit) {
        if (!targetSpirit.tempBuffs) {
            targetSpirit.tempBuffs = [];
        }
        targetSpirit.tempBuffs.push({ type: 'BP', value: power, duration: duration });
        console.log(`${targetSpirit.name} gets +${power} BP for the ${duration}.`);
    }
}

// NEW: Function to clear buffs at the end of a battle
export function clearBattleBuffs(playerKey, gameState) {
    gameState[playerKey].field.forEach(spirit => {
        if (spirit.tempBuffs && spirit.tempBuffs.length > 0) {
            spirit.tempBuffs = spirit.tempBuffs.filter(buff => buff.duration !== 'battle');
        }
    });
}

// MODIFIED: Function now only clears buffs at the end of a turn
export function clearTemporaryBuffs(playerKey, gameState) {
    gameState[playerKey].field.forEach(spirit => {
        if (spirit.tempBuffs && spirit.tempBuffs.length > 0) {
            spirit.tempBuffs = spirit.tempBuffs.filter(buff => buff.duration !== 'turn');
        }
    });
}

// ... (handleSpiritClick, drawCard, moveCore, initiateSummon, etc. are mostly the same) ...
export function handleSpiritClick(cardData, gameState) {
    if (gameState.targetingState.isTargeting) {
        if (cardData.type === 'Spirit') {
            gameState.targetingState.onTarget(cardData.uid);
            gameState.targetingState = { isTargeting: false, forEffect: null, onTarget: null };
        }
        return;
    }
    if (cardData.type !== 'Spirit') return false;

    if (gameState.turn === 'player' && gameState.phase === 'attack' && !cardData.isExhausted && !gameState.attackState.isAttacking && gameState.gameTurn > 1) {
        const attacker = gameState.player.field.find(s => s.uid === cardData.uid);
        if (attacker) {
            attacker.isExhausted = true;
            
            gameState.attackState = { isAttacking: true, attackerUid: cardData.uid, defender: 'opponent', blockerUid: null, isClash: false };
            resolveTriggeredEffects(attacker, 'whenAttacks', 'player', gameState);

            enterFlashTiming(gameState, 'beforeBlock');
            return 'attack';
        }
    } 
    else if (gameState.attackState.isAttacking && gameState.attackState.defender === 'player' && !cardData.isExhausted && !gameState.flashState.isActive) {
        const isPlayerCard = gameState.player.field.some(c => c.uid === cardData.uid);
        if (isPlayerCard) {
            declareBlock(cardData.uid, gameState);
            return 'block';
        }
    }
    return false;
}

export function drawCard(playerType, gameState) {
    const player = gameState[playerType];
    if (player.deck.length > 0) {
        player.hand.push(player.deck.shift());
    } else {
        console.log(`${playerType} has no cards left to draw and loses!`);
        player.life = 0;
        checkGameOver(gameState);
    }
}

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

export function initiateSummon(cardUid, gameState) {
    if (gameState.turn !== 'player' || gameState.phase !== 'main' || gameState.summoningState.isSummoning || gameState.placementState.isPlacing) return;
    const cardToSummon = gameState.player.hand.find(c => c.uid === cardUid);
    
    if (!cardToSummon || (cardToSummon.type !== 'Spirit' && cardToSummon.type !== 'Nexus')) return;

    const finalCost = calculateCost(cardToSummon, 'player', gameState);
    const totalAvailableCores = gameState.player.reserve.length + gameState.player.field.reduce((sum, card) => sum + (card.cores ? card.cores.length : 0), 0);
    
    const minCoresNeeded = cardToSummon.type === 'Spirit' ? 1 : 0;

    if (totalAvailableCores < finalCost + minCoresNeeded) {
        return;
    }

    gameState.summoningState = { isSummoning: true, cardToSummon, costToPay: finalCost, selectedCores: [] };
}

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

export function cancelSummon(gameState) {
    if (!gameState.summoningState.isSummoning) return;
    gameState.summoningState = { isSummoning: false, cardToSummon: null, costToPay: 0, selectedCores: [] };
}

export function confirmSummon(gameState) {
    const { isSummoning, cardToSummon, costToPay, selectedCores } = gameState.summoningState;
    if (!isSummoning || selectedCores.length < costToPay) return false;
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
    const cardIndex = gameState.player.hand.findIndex(c => c.uid === cardToSummon.uid);
    const [summonedCard] = gameState.player.hand.splice(cardIndex, 1);
    
    summonedCard.isExhausted = false;
    summonedCard.cores = [];
    // Initialize tempBuffs array on summon
    summonedCard.tempBuffs = [];
    gameState.player.field.push(summonedCard);
    
    gameState.summoningState = { isSummoning: false, cardToSummon: null, costToPay: 0, selectedCores: [] };
    
    gameState.placementState = { isPlacing: true, targetSpiritUid: summonedCard.uid };
    
    return true;
}

export function selectCoreForPlacement(coreId, from, sourceUid, gameState) {
    if (!gameState.placementState.isPlacing) return;
    const { targetSpiritUid } = gameState.placementState;
    const targetCard = gameState.player.field.find(s => s.uid === targetSpiritUid);
    if (!targetCard) return;

    if (sourceUid === targetSpiritUid) {
        const coreIndex = targetCard.cores.findIndex(c => c.id === coreId);
        if (coreIndex > -1) {
            const [movedCore] = targetCard.cores.splice(coreIndex, 1);
            gameState.player.reserve.push(movedCore);
        }
    } 
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
            if (sourceCard && sourceCard.type === 'Spirit' && sourceArray.length === 1) {
                gameState.coreRemovalConfirmationState = {
                    isConfirming: true,
                    coreId: coreId,
                    from: from,
                    sourceUid: sourceUid,
                };
                return;
            }

            const [movedCore] = sourceArray.splice(coreIndex, 1);
            targetCard.cores.push(movedCore);
            cleanupField(gameState); 
        }
    }
}

export function confirmPlacement(gameState) {
    if (!gameState.placementState.isPlacing) return;
    const targetCard = gameState.player.field.find(c => c.uid === gameState.placementState.targetSpiritUid);
    if (targetCard && targetCard.type === 'Spirit' && targetCard.cores.length === 0) {
        return;
    }
    cleanupField(gameState);
    gameState.placementState = { isPlacing: false, targetSpiritUid: null };
}

function resolveBattle(gameState) {
    const { attackerUid, blockerUid } = gameState.attackState;
    const attackerOwner = gameState.player.field.some(s => s.uid === attackerUid) ? 'player' : 'opponent';
    const blockerOwner = gameState.player.field.some(s => s.uid === blockerUid) ? 'player' : 'opponent';
    const attacker = gameState[attackerOwner].field.find(s => s.uid === attackerUid);
    const blocker = gameState[blockerOwner].field.find(s => s.uid === blockerUid);

    if (!attacker || !blocker) {
        // This case can happen if a Spirit is removed by an effect before battle resolution
        // Clear battle buffs for any remaining participant
        if (attacker) clearBattleBuffs(attackerOwner, gameState);
        if (blocker) clearBattleBuffs(blockerOwner, gameState);
        gameState.attackState = { isAttacking: false, attackerUid: null, defender: null, blockerUid: null };
        return;
    }

    const attackerResult = getSpiritLevelAndBP(attacker, attackerOwner, gameState);
    const blockerResult = getSpiritLevelAndBP(blocker, blockerOwner, gameState);

    if (attackerResult.bp > blockerResult.bp) {
        destroyCard(blockerUid, blockerOwner, gameState);
    } else if (blockerResult.bp > attackerResult.bp) {
        destroyCard(attackerUid, attackerOwner, gameState);
    } else {
        destroyCard(attackerUid, attackerOwner, gameState);
        destroyCard(blockerUid, blockerOwner, gameState);
    }
    
    // Clear battle-only buffs after battle concludes
    clearBattleBuffs(attackerOwner, gameState);
    clearBattleBuffs(blockerOwner, gameState);

    gameState.attackState = { isAttacking: false, attackerUid: null, defender: null, blockerUid: null };
}

export function declareBlock(blockerUid, gameState) {
    if (!gameState.attackState.isAttacking) return;
    
    const blocker = gameState.player.field.find(s => s.uid === blockerUid) || gameState.opponent.field.find(s => s.uid === blockerUid);
    if (blocker) {
        blocker.isExhausted = true;
    }

    gameState.attackState.blockerUid = blockerUid;
    enterFlashTiming(gameState, 'afterBlock');
}

export function takeLifeDamage(gameState) {
    const { attackerUid, defender } = gameState.attackState;
    if (!attackerUid || !defender) {
        gameState.attackState = { isAttacking: false, attackerUid: null, defender: null, blockerUid: null };
        return;
    }
    
    const attackingPlayer = defender === 'opponent' ? 'player' : 'opponent';
    const defendingPlayer = defender;
    const attacker = gameState[attackingPlayer].field.find(s => s.uid === attackerUid);

    if (attacker) {
        const damage = calculateTotalSymbols(attacker);
        for (let i = 0; i < damage; i++) {
            if (gameState[defendingPlayer].life > 0) {
                gameState[defendingPlayer].life--;
                gameState[defendingPlayer].reserve.push({ id: `core-from-life-${defendingPlayer}-${Date.now()}-${i}` });
            }
        }
    }
    
    // Clear battle-only buffs after the attack (since it's now over)
    clearBattleBuffs(attackingPlayer, gameState);

    gameState.attackState = { isAttacking: false, attackerUid: null, defender: null, blockerUid: null };
    checkGameOver(gameState);
}

export function enterFlashTiming(gameState, timing) {
    gameState.flashState = {
        isActive: true,
        timing: timing,
        priority: gameState.turn === 'player' ? 'opponent' : 'player',
        hasPassed: { player: false, opponent: false }
    };
}

export function passFlash(gameState) {
    if (!gameState.flashState.isActive) return null;

    const { priority, hasPassed } = gameState.flashState;
    const otherPlayer = priority === 'player' ? 'opponent' : 'player';

    if (hasPassed[otherPlayer]) {
        return resolveFlashWindow(gameState);
    }

    hasPassed[priority] = true;
    gameState.flashState.priority = otherPlayer;
    
    return null;
}

export function resolveFlashWindow(gameState) {
    gameState.flashState.isActive = false;
    
    if (gameState.flashState.timing === 'beforeBlock') {
        if (gameState.attackState.defender === 'opponent') { // AI is defending
            const attacker = gameState.player.field.find(s => s.uid === gameState.attackState.attackerUid);
            const potentialBlockers = gameState.opponent.field.filter(s => !s.isExhausted && s.type === 'Spirit');
            potentialBlockers.sort((a,b) => getSpiritLevelAndBP(b, 'opponent', gameState).bp - getSpiritLevelAndBP(a, 'opponent', gameState).bp);
            const bestBlocker = potentialBlockers.length > 0 ? potentialBlockers[0] : null;

            if (gameState.attackState.isClash && bestBlocker) {
                 console.log("Clash is active! Opponent is forced to block.");
                 declareBlock(bestBlocker.uid, gameState);
            } else if (bestBlocker && getSpiritLevelAndBP(bestBlocker, 'opponent', gameState).bp >= getSpiritLevelAndBP(attacker, 'player', gameState).bp) {
                declareBlock(bestBlocker.uid, gameState);
            } else {
                takeLifeDamage(gameState);
            }
        }
        return 'waiting_for_block_or_damage';

    } else if (gameState.flashState.timing === 'afterBlock') {
        resolveBattle(gameState);
        return 'battle_resolved';
    }
    return null;
}


export function confirmMagicPayment(gameState) {
    const { isPaying, cardToUse, costToPay, selectedCores, timing } = gameState.magicPaymentState;
    if (!isPaying || selectedCores.length < costToPay) return false;

    // --- Payment Logic (same as before) ---
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

    // --- Effect Resolution Logic ---
    const effect = cardToUse.effects.find(e => e.timing === timing);
    
    if (effect) {
        switch (effect.keyword) {
            case 'power up':
                gameState.targetingState = {
                    isTargeting: true,
                    forEffect: effect,
                    onTarget: (targetUid) => {
                        applyPowerUpEffect(targetUid, effect.power, effect.duration, gameState);
                        const cardIndex = gameState.player.hand.findIndex(c => c.uid === cardToUse.uid);
                        if (cardIndex > -1) {
                            const [usedCard] = gameState.player.hand.splice(cardIndex, 1);
                            gameState.player.cardTrash.push(usedCard);
                        }
                    }
                };
                break;
            
            case 'draw':
                for (let i = 0; i < effect.quantity; i++) {
                    drawCard('player', gameState);
                }
                // Move card to trash after drawing
                const cardIndexDraw = gameState.player.hand.findIndex(c => c.uid === cardToUse.uid);
                if (cardIndexDraw > -1) {
                    const [usedCard] = gameState.player.hand.splice(cardIndexDraw, 1);
                    gameState.player.cardTrash.push(usedCard);
                }
                break;

            default:
                // Handle effects with no specific keyword (e.g., just move card to trash)
                const cardIndexDefault = gameState.player.hand.findIndex(c => c.uid === cardToUse.uid);
                if (cardIndexDefault > -1) {
                    const [usedCard] = gameState.player.hand.splice(cardIndexDefault, 1);
                    gameState.player.cardTrash.push(usedCard);
                }
                break;
        }
    } else {
        // Failsafe if no effect is found for the timing
        const cardIndex = gameState.player.hand.findIndex(c => c.uid === cardToUse.uid);
        if (cardIndex > -1) {
            const [usedCard] = gameState.player.hand.splice(cardIndex, 1);
            gameState.player.cardTrash.push(usedCard);
        }
    }
    
    console.log(`Used Magic: ${cardToUse.name} (${timing})`);
    gameState.magicPaymentState = { isPaying: false, cardToUse: null, costToPay: 0, selectedCores: [], timing: null };

    if (timing === 'flash') {
        gameState.flashState.hasPassed = { player: false, opponent: false };
        gameState.flashState.priority = 'opponent';
    }

    return true;
}
export function initiateMagicPayment(cardUid, timing, gameState) {
    const cardToUse = gameState.player.hand.find(c => c.uid === cardUid);
    if (!cardToUse) return;

    const isFlashTiming = gameState.flashState.isActive && gameState.flashState.priority === 'player';
    const isMainStep = gameState.phase === 'main';

    if (!cardToUse.effects.some(e => e.timing === timing)) return;

    if (timing === 'flash' && !isFlashTiming && !isMainStep) return;
    if (timing === 'main' && !isMainStep) return;

    const finalCost = calculateCost(cardToUse, 'player', gameState);
    const totalAvailableCores = gameState.player.reserve.length + gameState.player.field.reduce((sum, card) => sum + (card.cores ? card.cores.length : 0), 0);

    if (totalAvailableCores < finalCost) {
        console.log("Not enough available cores to use magic.");
        return;
    }

    gameState.magicPaymentState = {
        isPaying: true,
        cardToUse: cardToUse,
        costToPay: finalCost,
        selectedCores: [],
        timing: timing
    };
}

export function cancelMagicPayment(gameState) {
    if (!gameState.magicPaymentState.isPaying) return;
    gameState.magicPaymentState = { isPaying: false, cardToUse: null, costToPay: 0, selectedCores: [], timing: null };
}
export function initiateDiscard(count, gameState) {
    if (count > 0) {
        gameState.discardState = {
            isDiscarding: true,
            count: count,
            cardToDiscard: null
        };
    }
}

export function selectCardForDiscard(cardUid, gameState) {
    if (!gameState.discardState.isDiscarding) return;
    if (gameState.discardState.cardToDiscard === cardUid) {
        gameState.discardState.cardToDiscard = null;
    } else {
        gameState.discardState.cardToDiscard = cardUid;
    }
}

export function confirmDiscard(gameState) {
    const { isDiscarding, cardToDiscard } = gameState.discardState;
    if (!isDiscarding || !cardToDiscard) return false;

    const cardIndex = gameState.player.hand.findIndex(c => c.uid === cardToDiscard);
    if (cardIndex > -1) {
        const [discardedCard] = gameState.player.hand.splice(cardIndex, 1);
        gameState.player.cardTrash.push(discardedCard);
        
        gameState.discardState.count--;
        gameState.discardState.cardToDiscard = null;

        if (gameState.discardState.count <= 0) {
            gameState.discardState.isDiscarding = false;
        }
        return true;
    }
    return false;
}

export function cancelCoreRemoval(gameState) {
    if (!gameState.coreRemovalConfirmationState.isConfirming) return;
    gameState.coreRemovalConfirmationState = { isConfirming: false, coreId: null, from: null, sourceUid: null };
}

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