// js/actions.js
import { getSpiritLevelAndBP, getCardLevel } from './utils.js';
import { resolveTriggeredEffects } from './effects.js';

// --- HELPER FUNCTIONS ---

// *** START: ย้ายฟังก์ชัน discardOpponentDeck มาที่นี่และ export ***
export function discardOpponentDeck(count, opponentKey, gameState) {
    let discardedCards = [];
    console.log(`Activating Deck Discard: ${count} cards`);
    for (let i = 0; i < count; i++) {
        if (gameState[opponentKey].deck.length > 0) {
            const discardedCard = gameState[opponentKey].deck.shift();
            gameState[opponentKey].cardTrash.push(discardedCard);
            discardedCards.push(discardedCard);
            console.log(`[Deck Discard] discarded ${discardedCard.name} from ${opponentKey}'s deck.`);
        }
    }
    return discardedCards;
}
// *** END: ย้ายฟังก์ชัน discardOpponentDeck ***

function destroyCard(cardUid, ownerKey, gameState) {
    const owner = gameState[ownerKey];
    const cardIndex = owner.field.findIndex(c => c.uid === cardUid);

    if (cardIndex === -1) {
        console.error(`Card with UID ${cardUid} not found in ${ownerKey}'s field.`);
        return;
    }
    
    const [destroyedCard] = owner.field.splice(cardIndex, 1);

    if (destroyedCard.cores && destroyedCard.cores.length > 0) {
        owner.reserve.push(...destroyedCard.cores);
        destroyedCard.cores = [];
    }

    owner.cardTrash.push(destroyedCard);
    console.log(`Destroyed: ${ownerKey}'s ${destroyedCard.name}`);
}

function destroyCards(uids, gameState) {
    uids.forEach(uid => {
        let ownerKey = '';
        if (gameState.player.field.some(c => c.uid === uid)) {
            ownerKey = 'player';
        } else if (gameState.opponent.field.some(c => c.uid === uid)) {
            ownerKey = 'opponent';
        }

        if (ownerKey) {
            destroyCard(uid, ownerKey, gameState);
        } else {
            console.error(`destroyCards could not find card with UID: ${uid} on any field.`);
        }
    });
}


function fizzleMagic(cardUid, gameState) {
    console.log("Effect fizzled, not enough valid targets.");
    moveUsedMagicToTrash(cardUid, gameState);
}

function moveUsedMagicToTrash(cardUid, gameState) {
    const cardIndex = gameState.player.hand.findIndex(c => c.uid === cardUid);
    if (cardIndex > -1) {
        const [usedCard] = gameState.player.hand.splice(cardIndex, 1);
        gameState.player.cardTrash.push(usedCard);
    }
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

function setupTargetingState(effect, onCompleteCallback, gameState) {
    gameState.targetingState = {
        isTargeting: true,
        forEffect: effect,
        onTarget: onCompleteCallback,
    };
}

function findValidTargets(targetInfo, gameState) {
    let potentialTargets = [];
    if (targetInfo.scope === 'opponent' || targetInfo.scope === 'any') {
        potentialTargets.push(...gameState.opponent.field);
    }
    if (targetInfo.scope === 'player' || targetInfo.scope === 'any') {
        potentialTargets.push(...gameState.player.field);
    }

    return potentialTargets.filter(card => {
        const cardOwnerKey = gameState.player.field.some(c => c.uid === card.uid) ? 'player' : 'opponent';
        const correctOwner = targetInfo.scope === 'any' || targetInfo.scope === cardOwnerKey;
        
        return correctOwner && 
               card.type.toLowerCase() === 'spirit' && 
               (!targetInfo.bpOrLess || getSpiritLevelAndBP(card, cardOwnerKey, gameState).bp <= targetInfo.bpOrLess)
    });
}

// --- CORE ACTION FUNCTIONS ---

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

export function calculateCost(cardToSummon, playerType, gameState) {
    const player = gameState[playerType];
    const baseCost = cardToSummon.cost;
    let totalReduction = 0;
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
        summonedCard.tempBuffs = [];
        return true;
    }
    return false;
}

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

export function clearBattleBuffs(playerKey, gameState) {
    gameState[playerKey].field.forEach(spirit => {
        if (spirit.tempBuffs && spirit.tempBuffs.length > 0) {
            spirit.tempBuffs = spirit.tempBuffs.filter(buff => buff.duration !== 'battle');
        }
    });
}

export function clearTemporaryBuffs(playerKey, gameState) {
    // เคลียร์บัฟบน Spirit
    gameState[playerKey].field.forEach(spirit => {
        if (spirit.tempBuffs && spirit.tempBuffs.length > 0) {
            spirit.tempBuffs = spirit.tempBuffs.filter(buff => buff.duration !== 'turn');
        }
    });
    // *** START: เพิ่มการเคลียร์บัฟของผู้เล่น ***
    gameState[playerKey].tempBuffs = [];
    // console.log(`Cleared turn buffs for ${playerKey}`);
}

export function handleSpiritClick(cardData, gameState) {
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

    if (cardData.type !== 'Spirit') return false;

    if (gameState.turn === 'player' && gameState.phase === 'attack' && !cardData.isExhausted && !gameState.attackState.isAttacking && gameState.gameTurn > 1) {
        const attacker = gameState.player.field.find(s => s.uid === cardData.uid);
        if (attacker) {
            // *** START: เพิ่มการตรวจสอบเอฟเฟกต์ Blitz ***
            const coreChargeBuff = gameState.player.tempBuffs.find(b => b.type === 'core_on_crush_attack');
            const hasCrush = attacker.effects.some(e => e.keyword === 'crush' && e.level.includes(getCardLevel(attacker).level));

            if (coreChargeBuff && hasCrush) {
                console.log(`[Blitz Effect] ${attacker.name} attacks with Crush, gaining 1 core.`);
                gameState.player.costTrash.push({ id: `core-from-blitz-${Date.now()}` });
            }
            // *** END: เพิ่มการตรวจสอบเอฟเฟกต์ Blitz ***

            attacker.isExhausted = true;
            gameState.attackState = { isAttacking: true, attackerUid: cardData.uid, defender: 'opponent', blockerUid: null, isClash: false };
            resolveTriggeredEffects(attacker, 'whenAttacks', 'player', gameState);
            enterFlashTiming(gameState, 'beforeBlock');
            return true;
        }
    }
    else if (gameState.attackState.isAttacking && gameState.attackState.defender === 'player' && !cardData.isExhausted && !gameState.flashState.isActive) {
        const isPlayerCard = gameState.player.field.some(c => c.uid === cardData.uid);
        if (isPlayerCard) {
            declareBlock(cardData.uid, gameState);
            return true;
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
                gameState.coreRemovalConfirmationState = { isConfirming: true, coreId: coreId, from: from, sourceUid: sourceUid };
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

    if (targetCard) {
        resolveTriggeredEffects(targetCard, 'whenSummoned', 'player', gameState);
    }
    
    cleanupField(gameState);
    gameState.placementState = { isPlacing: false, targetSpiritUid: null };
}

// *** START: แก้ไขฟังก์ชัน resolveBattle ***
function resolveBattle(gameState) {
    const { attackerUid, blockerUid } = gameState.attackState;
    const attackerOwner = gameState.player.field.some(s => s.uid === attackerUid) ? 'player' : 'opponent';
    const blockerOwner = gameState.player.field.some(s => s.uid === blockerUid) ? 'player' : 'opponent';
    const attacker = gameState[attackerOwner].field.find(s => s.uid === attackerUid);
    const blocker = gameState[blockerOwner].field.find(s => s.uid === blockerUid);

    if (!attacker || !blocker) {
        if (attacker) clearBattleBuffs(attackerOwner, gameState);
        if (blocker) clearBattleBuffs(blockerOwner, gameState);
        gameState.attackState = { isAttacking: false, attackerUid: null, defender: null, blockerUid: null };
        return;
    }

    const attackerResult = getSpiritLevelAndBP(attacker, attackerOwner, gameState);
    const blockerResult = getSpiritLevelAndBP(blocker, blockerOwner, gameState);

    if (attackerResult.bp > blockerResult.bp) {
        // เมื่อผู้โจมตีชนะ ให้เรียกใช้เอฟเฟกต์
        resolveTriggeredEffects(attacker, 'onOpponentDestroyedInBattle', attackerOwner, gameState);
        destroyCard(blockerUid, blockerOwner, gameState);
    } else if (blockerResult.bp > attackerResult.bp) {
        // เมื่อผู้ป้องกันชนะ เอฟเฟกต์ของ Titus จะไม่ทำงาน
        destroyCard(attackerUid, attackerOwner, gameState);
    } else {
        // กรณี BP เท่ากัน ทำลายทั้งคู่
        destroyCard(attackerUid, attackerOwner, gameState);
        destroyCard(blockerUid, blockerOwner, gameState);
    }
    
    clearBattleBuffs(attackerOwner, gameState);
    clearBattleBuffs(blockerOwner, gameState);
    gameState.attackState = { isAttacking: false, attackerUid: null, defender: null, blockerUid: null };
}
// *** END: แก้ไขฟังก์ชัน resolveBattle ***

export function declareBlock(blockerUid, gameState) {
    if (!gameState.attackState.isAttacking) return;
    
    const blockerOwner = 'player'; // ปัจจุบันมีแต่ผู้เล่นที่สามารถ block ได้
    const blocker = gameState[blockerOwner].field.find(s => s.uid === blockerUid);
    
    if (blocker) {
        blocker.isExhausted = true;

        // *** START: เพิ่มตรรกะสำหรับ The H.Q. filled with Fighting Spirits ***
        const hqNexus = gameState[blockerOwner].field.find(card => 
            card.effects && card.effects.some(eff => eff.keyword === 'enable_crush_on_block')
        );

        if (hqNexus) {
            const hqLevel = getCardLevel(hqNexus).level;
            const hqEffect = hqNexus.effects.find(eff => eff.keyword === 'enable_crush_on_block');
            const blockerHasCrush = blocker.effects.some(eff => eff.keyword === 'crush');

            if (blockerHasCrush && hqEffect.level.includes(hqLevel)) {
                console.log(`[H.Q. Effect] ${blocker.name} activates Crush on block!`);
                // เรียกใช้เอฟเฟกต์ Crush โดยตรง
                resolveTriggeredEffects(blocker, 'whenAttacks', blockerOwner, gameState);
            }
        }
        // *** END: เพิ่มตรรกะสำหรับ The H.Q. filled with Fighting Spirits ***
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
        if (gameState.attackState.defender === 'opponent') {
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

export function initiateMagicPayment(cardUid, timing, effectToUse, gameState) {
    const cardToUse = gameState.player.hand.find(c => c.uid === cardUid);
    if (!cardToUse) return;
    const effect = effectToUse || cardToUse.effects.find(e => e.timing === timing);
    if (!effect) return;
    const isFlashTiming = gameState.flashState.isActive && gameState.flashState.priority === 'player';
    const isMainStep = gameState.phase === 'main';
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
        timing: timing,
        effectToUse: effect
    };
}

export function confirmMagicPayment(gameState) {
    const { isPaying, cardToUse, costToPay, selectedCores, timing, effectToUse } = gameState.magicPaymentState;
    if (!isPaying || selectedCores.length < costToPay) return false;

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
    
    gameState.magicPaymentState = { isPaying: false, cardToUse: null, costToPay: 0, selectedCores: [], timing: null, effectToUse: null };
    
    if (effectToUse) {
        switch (effectToUse.keyword) {
            case 'deploy_from_trash':
                const nexusesToDeploy = [];
                const remainingTrash = [];

                // ค้นหา Nexus สีที่ถูกต้องในกองทิ้ง
                gameState.player.cardTrash.forEach(card => {
                    if (card.type === 'Nexus' && effectToUse.targetColors.includes(card.color)) {
                        nexusesToDeploy.push(card);
                    } else {
                        remainingTrash.push(card);
                    }
                });

                if (nexusesToDeploy.length > 0) {
                    console.log(`[Construction Effect] Deploying ${nexusesToDeploy.length} Nexuses from Trash.`);
                    // นำ Nexus ที่พบไปวางบนสนาม
                    gameState.player.field.push(...nexusesToDeploy);
                    // อัปเดตกองทิ้งโดยลบ Nexus ที่นำไปวางบนสนามออก
                    gameState.player.cardTrash = remainingTrash;
                }

                moveUsedMagicToTrash(cardToUse.uid, gameState);
                break;
            case 'core charge':
                if (effectToUse.buff_type) {
                    gameState.player.tempBuffs.push({ type: effectToUse.buff_type });
                    console.log(`[Magic Effect] Applied turn-wide buff: ${effectToUse.buff_type}`);
                }
                moveUsedMagicToTrash(cardToUse.uid, gameState);
                break;
            case 'draw':
                // 1. จั่วการ์ดตามจำนวนที่กำหนด
                for (let i = 0; i < effectToUse.quantity; i++) {
                    drawCard('player', gameState);
                }
                
                // 2. ตรวจสอบว่าต้องมีการทิ้งการ์ดต่อหรือไม่
                if (effectToUse.discard && effectToUse.discard > 0) {
                    initiateDiscard(effectToUse.discard, gameState);
                }

                // 3. ย้ายการ์ดเวทมนตร์ที่ใช้แล้วลงแทรช
                moveUsedMagicToTrash(cardToUse.uid, gameState);
                break;
            
            // *** START: เพิ่ม case 'discard' สำหรับ Magic Hammer ***
            case 'discard':
                if (effectToUse.quantity) {
                    discardOpponentDeck(effectToUse.quantity, 'opponent', gameState);
                }
                moveUsedMagicToTrash(cardToUse.uid, gameState);
                break;
            // *** END: เพิ่ม case 'discard' ***
            case 'power up':
                const validPowerUpTargets = findValidTargets(effectToUse.target, gameState);
                if (validPowerUpTargets.length > 0) {
                    setupTargetingState(effectToUse, (selectedUid) => {
                        applyPowerUpEffect(selectedUid, effectToUse.power, effectToUse.duration, gameState);
                        moveUsedMagicToTrash(cardToUse.uid, gameState);
                        gameState.targetingState = { isTargeting: false };
                    }, gameState);
                } else {
                    fizzleMagic(cardToUse.uid, gameState);
                }
                break;

            case 'destroy':
                const validDestroyTargets = findValidTargets(effectToUse.target, gameState);
                if (validDestroyTargets.length >= effectToUse.target.count) {
                    setupTargetingState(effectToUse, (selectedUid) => {
                        destroyCards([selectedUid], gameState);
                        moveUsedMagicToTrash(cardToUse.uid, gameState);
                        gameState.targetingState = { isTargeting: false };
                    }, gameState);
                } else {
                    fizzleMagic(cardToUse.uid, gameState);
                }
                break;

            case 'destroy_combo':
                const spiritTargetInfo = effectToUse.target.spirit;
                const validSpiritTargets = findValidTargets(spiritTargetInfo, gameState);

                if (validSpiritTargets.length > 0) {
                    const onSpiritTargeted = (selectedSpiritUid) => {
                        destroyCards([selectedSpiritUid], gameState);
                        
                        const nexusTargetInfo = effectToUse.target.nexus;
                        const validNexusTargets = findValidTargets(nexusTargetInfo, gameState);

                        if (validNexusTargets.length > 0) {
                            const onNexusTargeted = (selectedNexusUid) => {
                                destroyCards([selectedNexusUid], gameState);
                                moveUsedMagicToTrash(cardToUse.uid, gameState);
                                gameState.targetingState = { isTargeting: false };
                            };
                            setupTargetingState({ ...effectToUse, target: nexusTargetInfo }, onNexusTargeted, gameState);
                        } else {
                            moveUsedMagicToTrash(cardToUse.uid, gameState);
                            gameState.targetingState = { isTargeting: false };
                        }
                    };
                    setupTargetingState({ ...effectToUse, target: spiritTargetInfo }, onSpiritTargeted, gameState);
                } else {
                    fizzleMagic(cardToUse.uid, gameState);
                }
                break;
            
            default:
                moveUsedMagicToTrash(cardToUse.uid, gameState);
                break;
        }
    } else {
        moveUsedMagicToTrash(cardToUse.uid, gameState);
    }

    if (timing === 'flash') {
        gameState.flashState.hasPassed = { player: false, opponent: false };
        gameState.flashState.priority = 'opponent';
    }

    return true;
}


export function cancelMagicPayment(gameState) {
    if (!gameState.magicPaymentState.isPaying) return;
    gameState.magicPaymentState = { isPaying: false, cardToUse: null, costToPay: 0, selectedCores: [], timing: null };
}
export function initiateDiscard(count, gameState) {
    if (count > 0) {
        gameState.discardState = { isDiscarding: true, count: count, cardToDiscard: null };
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