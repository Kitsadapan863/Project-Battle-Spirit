// js/actions.js
import { getSpiritLevelAndBP } from './utils.js';

function cleanupField(gameState) {
    gameState.player.field = gameState.player.field.filter(spirit => {
        if (spirit.cores.length === 0) {
            console.log(`Cleanup: ${spirit.name} was destroyed (0 cores).`);
            gameState.player.cardTrash.push(spirit);
            return false;
        }
        return true;
    });
    gameState.opponent.field = gameState.opponent.field.filter(spirit => {
        if (spirit.cores.length === 0) {
            console.log(`Cleanup: Opponent's ${spirit.name} was destroyed (0 cores).`);
            gameState.opponent.cardTrash.push(spirit);
            return false;
        }
        return true;
    });
}

export function performRefreshStep(playerType, gameState) {
    const player = gameState[playerType];
    player.field.forEach(spirit => {
        spirit.isExhausted = false;
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

export function calculateCost(cardToSummon, playerType, gameState) {
    const player = gameState[playerType];
    const baseCost = cardToSummon.cost;
    let totalReduction = 0;
    const fieldSymbols = { red: 0, purple: 0, green: 0, white: 0, blue: 0, yellow: 0 };
    player.field.forEach(spirit => {
        if (spirit.symbol) {
            for (const color in spirit.symbol) {
                if (fieldSymbols.hasOwnProperty(color)) {
                    fieldSymbols[color] += spirit.symbol[color];
                }
            }
        }
    });
    if (cardToSummon.symbol_cost) {
        for (const color in cardToSummon.symbol_cost) {
            if (fieldSymbols.hasOwnProperty(color)) {
                totalReduction += fieldSymbols[color];
            }
        }
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
    if (cardToSummon.type !== 'Spirit') return false; // AI should only summon spirits
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
        return true;
    }
    return false;
}

export function handleSpiritClick(cardData, gameState) {
    if (gameState.turn === 'player' && gameState.phase === 'attack' && !cardData.isExhausted && !gameState.attackState.isAttacking && gameState.gameTurn > 1) {
        gameState.attackState = { isAttacking: true, attackerUid: cardData.uid, defender: 'opponent', blockerUid: null };
        enterFlashTiming(gameState, 'beforeBlock');
        return 'attack';
    } else if (gameState.turn === 'opponent' && gameState.attackState.isAttacking && gameState.attackState.defender === 'player' && !cardData.isExhausted) {
        declareBlock(cardData.uid, gameState);
        return 'block';
    }
    return false;
}

export function drawCard(playerType, gameState) {
    const player = gameState[playerType];
    if (player.deck.length > 0) {
        player.hand.push(player.deck.shift());
    } else {
        checkGameOver(gameState, true);
    }
}

// *** FIXED: Added 'export' back to this function ***
export function moveCore(coreId, from, sourceCardUid, targetZoneId, targetCardUid, gameState) {
    const player = gameState.player;
    let coreToMove;
    let sourceArray;
    // Determine the source array of cores
    if (from === 'card') {
        const sourceCard = player.field.find(c => c.uid === sourceCardUid);
        if (!sourceCard) return false;
        sourceArray = sourceCard.cores;
    } else { // from 'reserve'
        sourceArray = player.reserve;
    }

    const coreIndex = sourceArray.findIndex(c => c.id === coreId);
    if (coreIndex === -1) return false; // Core not found in source

    // Remove the core from the source
    [coreToMove] = sourceArray.splice(coreIndex, 1);

    // Add the core to the destination
    if (targetCardUid) {
        const destCard = player.field.find(c => c.uid === targetCardUid);
        if (destCard) {
            destCard.cores.push(coreToMove);
        } else {
            // Destination card not found, return the core to where it came from
            sourceArray.splice(coreIndex, 0, coreToMove);
            return false;
        }
    } else if (targetZoneId && targetZoneId.includes('player-reserve-zone')) {
        player.reserve.push(coreToMove);
    } else {
        // Invalid target, return the core
        sourceArray.splice(coreIndex, 0, coreToMove);
        return false;
    }

    cleanupField(gameState); // Check if any spirit was destroyed by losing its last core
    return true;
}

export function initiateSummon(cardUid, gameState) {
    if (gameState.turn !== 'player' || gameState.phase !== 'main' || gameState.summoningState.isSummoning || gameState.placementState.isPlacing) return;
    const cardToSummon = gameState.player.hand.find(c => c.uid === cardUid);
    if (!cardToSummon || cardToSummon.type !== 'Spirit') return;
    const finalCost = calculateCost(cardToSummon, 'player', gameState);
    const totalAvailableCores = gameState.player.reserve.length + gameState.player.field.reduce((sum, spirit) => sum + spirit.cores.length, 0);
    if (totalAvailableCores < finalCost + 1) {
        return;
    }
    gameState.summoningState = { isSummoning: true, cardToSummon, costToPay: finalCost, selectedCores: [] };
}

export function selectCoreForPayment(coreId, from, spiritUid, gameState) {
    const paymentState = gameState.summoningState.isSummoning ? gameState.summoningState : gameState.flashPaymentState.isPaying ? gameState.flashPaymentState : null;
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
            const sourceSpirit = gameState.player.field.find(s => s.uid === coreInfo.spiritUid);
            sourceArray = sourceSpirit ? sourceSpirit.cores : undefined;
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
    gameState.player.field.push(summonedCard);
    gameState.summoningState = { isSummoning: false, cardToSummon: null, costToPay: 0, selectedCores: [] };
    gameState.placementState = { isPlacing: true, targetSpiritUid: summonedCard.uid };
    return true;
}

export function selectCoreForPlacement(coreId, from, spiritUid, gameState) {
    if (!gameState.placementState.isPlacing) return;
    const { targetSpiritUid } = gameState.placementState;
    const targetSpirit = gameState.player.field.find(s => s.uid === targetSpiritUid);
    if (!targetSpirit) return;
    let sourceArray;
    if (from === 'reserve') {
        sourceArray = gameState.player.reserve;
    } else {
        const sourceSpirit = gameState.player.field.find(s => s.uid === spiritUid);
        sourceArray = sourceSpirit ? sourceSpirit.cores : undefined;
    }
    if (!sourceArray) return;
    const coreIndex = sourceArray.findIndex(c => c.id === coreId);
    if (coreIndex > -1) {
        const [movedCore] = sourceArray.splice(coreIndex, 1);
        targetSpirit.cores.push(movedCore);
        cleanupField(gameState);
    }
}

export function confirmPlacement(gameState) {
    if (!gameState.placementState.isPlacing) return;
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
        gameState.attackState = { isAttacking: false, attackerUid: null, defender: null, blockerUid: null };
        return;
    }
    const attackerBP = getSpiritLevelAndBP(attacker).bp;
    const blockerBP = getSpiritLevelAndBP(blocker).bp;
    attacker.isExhausted = true;
    blocker.isExhausted = true;
    if (attackerBP > blockerBP) {
        gameState[blockerOwner].field = gameState[blockerOwner].field.filter(s => s.uid !== blockerUid);
        gameState[blockerOwner].cardTrash.push(blocker);
    } else if (blockerBP > attackerBP) {
        gameState[attackerOwner].field = gameState[attackerOwner].field.filter(s => s.uid !== attackerUid);
        gameState[attackerOwner].cardTrash.push(attacker);
    } else {
        gameState[attackerOwner].field = gameState[attackerOwner].field.filter(s => s.uid !== attackerUid);
        gameState[attackerOwner].cardTrash.push(attacker);
        gameState[blockerOwner].field = gameState[blockerOwner].field.filter(s => s.uid !== blockerUid);
        gameState[blockerOwner].cardTrash.push(blocker);
    }
    cleanupField(gameState);
    gameState.attackState = { isAttacking: false, attackerUid: null, defender: null, blockerUid: null };
}

export function declareBlock(blockerUid, gameState) {
    if (!gameState.attackState.isAttacking) return;
    gameState.attackState.blockerUid = blockerUid;
    enterFlashTiming(gameState, 'afterBlock');
}

export function takeLifeDamage(gameState) {
    if (!gameState.attackState.isAttacking) return;
    const { attackerUid, defender } = gameState.attackState;
    const attackingPlayer = defender === 'opponent' ? 'player' : 'opponent';
    const defendingPlayer = defender;
    const attacker = gameState[attackingPlayer].field.find(s => s.uid === attackerUid);
    if (!attacker) {
        gameState.attackState = { isAttacking: false, attackerUid: null, defender: null, blockerUid: null };
        return;
    }
    const damage = calculateTotalSymbols(attacker);
    for (let i = 0; i < damage; i++) {
        if (gameState[defendingPlayer].life > 0) {
            gameState[defendingPlayer].life--;
            gameState[defendingPlayer].reserve.push({ id: `core-from-life-${defendingPlayer}-${Date.now()}-${i}` });
        }
    }
    attacker.isExhausted = true;
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
    hasPassed[priority] = true;
    gameState.flashState.priority = priority === 'player' ? 'opponent' : 'player';
    if (hasPassed.player && hasPassed.opponent) {
        return resolveFlashWindow(gameState);
    }
    return null;
}

export function resolveFlashWindow(gameState) {
    gameState.flashState.isActive = false;
    if (gameState.flashState.timing === 'beforeBlock') {
        if (gameState.attackState.defender === 'opponent') {
            const attacker = gameState.player.field.find(s => s.uid === gameState.attackState.attackerUid);
            const potentialBlockers = gameState.opponent.field.filter(s => !s.isExhausted && getSpiritLevelAndBP(s).bp >= getSpiritLevelAndBP(attacker).bp);
            if (potentialBlockers.length > 0) {
                const blocker = potentialBlockers[0];
                declareBlock(blocker.uid, gameState);
            } else {
                takeLifeDamage(gameState);
            }
        }
        return 'attack_resolved_no_block';
    } else if (gameState.flashState.timing === 'afterBlock') {
        resolveBattle(gameState);
        return 'battle_resolved';
    }
    return null;
}

export function initiateFlashPayment(cardUid, gameState) {
    if (!gameState.flashState.isActive || gameState.flashState.priority !== 'player') return;
    const cardToUse = gameState.player.hand.find(c => c.uid === cardUid);
    if (!cardToUse) return;

    const totalAvailableCores = gameState.player.reserve.length + gameState.player.field.reduce((sum, spirit) => sum + spirit.cores.length, 0);
    if (totalAvailableCores < cardToUse.cost) {
        console.log("Not enough available cores to use flash magic.");
        return;
    }

    gameState.flashPaymentState = {
        isPaying: true,
        cardToUse: cardToUse,
        costToPay: cardToUse.cost,
        selectedCores: []
    };
}

export function cancelFlashPayment(gameState) {
    if (!gameState.flashPaymentState.isPaying) return;
    gameState.flashPaymentState = { isPaying: false, cardToUse: null, costToPay: 0, selectedCores: [] };
}

export function confirmFlashPayment(gameState) {
    const { isPaying, cardToUse, costToPay, selectedCores } = gameState.flashPaymentState;
    if (!isPaying || selectedCores.length < costToPay) return false;

    for (const coreInfo of selectedCores) {
        let sourceArray;
        if (coreInfo.from === 'reserve') {
            sourceArray = gameState.player.reserve;
        } else {
            const sourceSpirit = gameState.player.field.find(s => s.uid === coreInfo.spiritUid);
            sourceArray = sourceSpirit ? sourceSpirit.cores : undefined;
        }
        if (sourceArray) {
            const coreIndex = sourceArray.findIndex(c => c.id === coreInfo.coreId);
            if (coreIndex > -1) {
                const [paidCore] = sourceArray.splice(coreIndex, 1);
                gameState.player.costTrash.push(paidCore);
            }
        }
    }

    const cardIndex = gameState.player.hand.findIndex(c => c.uid === cardToUse.uid);
    const [usedCard] = gameState.player.hand.splice(cardIndex, 1);
    gameState.player.cardTrash.push(usedCard);
    
    console.log(`Used Flash Magic: ${usedCard.name}`);

    gameState.flashPaymentState = { isPaying: false, cardToUse: null, costToPay: 0, selectedCores: [] };
    gameState.flashState.hasPassed = { player: false, opponent: false };

    return true;
}