// js/ui.js
import { getSpiritLevelAndBP } from './utils.js';
import { attachDragAndDropListeners } from './dragDrop.js';

// DOM Element Queries
export const playerHandContainer = document.querySelector('#player-hand .card-container');
export const opponentHandContainer = document.querySelector('#opponent-hand .card-container');
export const playerFieldElement = document.getElementById('player-field');
export const opponentFieldElement = document.getElementById('opponent-field');
export const playerReserveCoreContainer = document.getElementById('player-reserve-core-container');
export const opponentReserveCoreContainer = document.getElementById('opponent-reserve-core-container');
export const playerCostTrashZone = document.getElementById('player-cost-trash-zone');
export const opponentCostTrashZone = document.getElementById('opponent-cost-trash-zone');
export const playerCardTrashZone = document.getElementById('player-card-trash-zone');
export const opponentCardTrashZone = document.getElementById('opponent-card-trash-zone');
export const playerLifeCirclesContainer = document.getElementById('player-life-circles');
export const opponentLifeCirclesContainer = document.getElementById('opponent-life-circles');
export const playerDeckElement = document.getElementById('player-deck');
export const opponentDeckElement = document.getElementById('opponent-deck');
export const turnIndicator = document.getElementById('turn-indicator');
export const phaseBtn = document.getElementById('phase-btn');
export const gameOverModal = document.getElementById('game-over-modal');
export const gameOverMessage = document.getElementById('game-over-message');
export const restartBtn = document.getElementById('restart-btn');
// Summon Modal
export const summonPaymentOverlay = document.getElementById('summon-payment-overlay');
export const summonPaymentTitle = document.getElementById('summon-payment-title');
export const paymentCostValue = document.getElementById('payment-cost-value');
export const paymentSelectedValue = document.getElementById('payment-selected-value');
export const confirmSummonBtn = document.getElementById('confirm-summon-btn');
export const cancelSummonBtn = document.getElementById('cancel-summon-btn');
// Placement Modal
export const confirmPlacementBtn = document.getElementById('confirm-placement-btn');
export const placementOverlay = document.getElementById('placement-overlay');
export const placementTitle = document.getElementById('placement-title');
export const phaseIndicator = document.getElementById('phase-indicator');
// Defense Modal
export const defenseOverlay = document.getElementById('defense-overlay');
export const defenseTitle = document.getElementById('defense-title');
export const defenseAttackerInfo = document.getElementById('defense-attacker-info');
export const takeDamageBtn = document.getElementById('take-damage-btn');
// Flash Modal
export const flashOverlay = document.getElementById('flash-overlay');
export const flashTitle = document.getElementById('flash-title');
export const flashPrompt = document.getElementById('flash-prompt');
export const passFlashBtn = document.getElementById('pass-flash-btn');
// Flash Payment Modal
export const flashPaymentOverlay = document.getElementById('flash-payment-overlay');
export const flashPaymentTitle = document.getElementById('flash-payment-title');
export const flashPaymentCostValue = document.getElementById('flash-payment-cost-value');
export const flashPaymentSelectedValue = document.getElementById('flash-payment-selected-value');
export const confirmFlashBtn = document.getElementById('confirm-flash-btn');
export const cancelFlashBtn = document.getElementById('cancel-flash-btn');


function createCardElement(cardData, location, gameState, callbacks) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    cardDiv.id = cardData.uid;
    cardDiv.innerHTML = `<img src="${cardData.image}" alt="${cardData.name}" draggable="false"/>`;

    if (location === 'hand') {
        const canUseFlash = gameState.flashState.isActive && cardData.hasFlash && gameState.flashState.priority === 'player';
        if (canUseFlash) {
            cardDiv.classList.add('can-flash');
        }
        cardDiv.addEventListener('click', () => {
            if(canUseFlash){
                 callbacks.onUseFlash(cardData.uid)
            } else if (cardData.type === 'Spirit' && gameState.phase === 'main' && gameState.turn === 'player'){
                callbacks.onInitiateSummon(cardData.uid)
            }
        });

    } else if (location === 'field') {
        const { level, bp } = getSpiritLevelAndBP(cardData);
        cardDiv.innerHTML += `
            <div class="card-info">
                <p>Lv${level} BP: ${bp}</p>
            </div>
            <div class="card-core-display"></div>
        `;
        if (cardData.isExhausted) {
            cardDiv.classList.add('exhausted');
        } else if (gameState.turn === 'player' && gameState.phase === 'attack' && !gameState.attackState.isAttacking && !gameState.summoningState.isSummoning && !gameState.placementState.isPlacing && gameState.gameTurn > 1) {
            cardDiv.classList.add('can-attack');
        }
        
        if (gameState.placementState.isPlacing && gameState.placementState.targetSpiritUid === cardData.uid) {
            cardDiv.classList.add('can-attack');
        }

        if (gameState.attackState.isAttacking && gameState.attackState.defender === 'player' && !cardData.isExhausted && !gameState.flashState.isActive) {
             cardDiv.classList.add('can-block');
        }

        cardDiv.addEventListener('click', () => callbacks.onSpiritClick(cardData));
    }
    return cardDiv;
}

function createCoreElement(coreData, locationInfo, gameState, callbacks) {
    const coreDiv = document.createElement('div');
    coreDiv.className = 'core';
    coreDiv.id = coreData.id;
    const isSummoning = gameState.summoningState.isSummoning;
    const isPayingForFlash = gameState.flashPaymentState.isPaying;
    const isPlacing = gameState.placementState.isPlacing;
    if (locationInfo.type === 'trash') {
        coreDiv.draggable = false;
        return coreDiv;
    }
    if (isSummoning || isPayingForFlash) {
        coreDiv.draggable = false;
        const paymentState = isSummoning ? gameState.summoningState : gameState.flashPaymentState;
        const isSelected = paymentState.selectedCores.some(c => c.coreId === coreData.id);
        coreDiv.classList.add('selectable-for-payment');
        if (isSelected) {
            coreDiv.classList.add('selected-for-payment');
        }
        coreDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            callbacks.onSelectCoreForPayment(coreData.id, locationInfo.type === 'field' ? 'field' : 'reserve', locationInfo.spiritUid);
        });
    }
    else if (isPlacing) {
        coreDiv.draggable = false;
        const isTargetSpiritCore = locationInfo.spiritUid === gameState.placementState.targetSpiritUid;
        if (!isTargetSpiritCore) {
            coreDiv.classList.add('selectable-for-placement');
            coreDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                callbacks.onSelectCoreForPlacement(coreData.id, locationInfo.type, locationInfo.spiritUid);
            });
        }
    }
    else {
        coreDiv.draggable = gameState.phase === 'main' && gameState.turn === 'player';
    }
    return coreDiv;
}


export function updateUI(gameState, callbacks) {
    if (!gameState) return;
    const { summoningState, placementState, attackState, flashState, flashPaymentState } = gameState;

    if (summoningState.isSummoning) {
        summonPaymentOverlay.classList.add('visible');
        summonPaymentTitle.textContent = `Summoning ${summoningState.cardToSummon.name}`;
        paymentCostValue.textContent = summoningState.costToPay;
        paymentSelectedValue.textContent = summoningState.selectedCores.length;
        confirmSummonBtn.disabled = summoningState.selectedCores.length < summoningState.costToPay;
    } else {
        summonPaymentOverlay.classList.remove('visible');
    }

    if (flashPaymentState.isPaying) {
        flashPaymentOverlay.classList.add('visible');
        flashPaymentTitle.textContent = `Use Magic: ${flashPaymentState.cardToUse.name}`;
        flashPaymentCostValue.textContent = flashPaymentState.costToPay;
        flashPaymentSelectedValue.textContent = flashPaymentState.selectedCores.length;
        confirmFlashBtn.disabled = flashPaymentState.selectedCores.length < flashPaymentState.costToPay;
    } else {
        flashPaymentOverlay.classList.remove('visible');
    }

    if (placementState.isPlacing) {
        placementOverlay.classList.add('visible');
        const targetSpirit = gameState.player.field.find(s => s.uid === placementState.targetSpiritUid);
        if (targetSpirit) {
            placementTitle.textContent = `Place Cores on ${targetSpirit.name}`;
        }
    } else {
        placementOverlay.classList.remove('visible');
    }
    
    if (attackState.isAttacking && attackState.defender === 'player' && !flashState.isActive) {
        defenseOverlay.classList.add('visible');
        const attacker = gameState.opponent.field.find(s => s.uid === attackState.attackerUid);
        if (attacker) {
            const { bp } = getSpiritLevelAndBP(attacker);
            defenseAttackerInfo.textContent = `Attacker: ${attacker.name} (BP: ${bp})`;
        }
    } else {
        defenseOverlay.classList.remove('visible');
    }

    if (flashState.isActive && !flashPaymentState.isPaying) {
        flashOverlay.classList.add('visible');
        flashTitle.textContent = `Flash Timing (${flashState.priority}'s Priority)`;
    } else {
        flashOverlay.classList.remove('visible');
    }

    if (gameState.gameover) {
        gameOverMessage.textContent = `${gameState.player.life <= 0 ? 'Opponent' : 'Player'} Wins!`;
        gameOverModal.classList.add('visible');
    }

    const allPhases = phaseIndicator.querySelectorAll('.phase-step');
    allPhases.forEach(p => p.classList.remove('active-phase'));
    const activePhaseEl = document.getElementById(`phase-${gameState.phase}`);
    if (activePhaseEl) {
        activePhaseEl.classList.add('active-phase');
    }

    if (gameState.turn === 'player') {
        if (attackState.isAttacking && attackState.defender === 'opponent' && !flashState.isActive) {
            phaseBtn.textContent = 'Resolve Attack';
        } else {
            switch(gameState.phase) {
                case 'main':
                    phaseBtn.textContent = gameState.gameTurn === 1 ? 'End Turn' : 'Go to Attack Step';
                    break;
                case 'attack':
                    phaseBtn.textContent = 'End Turn';
                    break;
                default:
                    phaseBtn.textContent = 'Next Step';
            }
        }
    }

    playerHandContainer.innerHTML = '';
    gameState.player.hand.forEach(card => playerHandContainer.appendChild(createCardElement(card, 'hand', gameState, callbacks)));
    opponentHandContainer.innerHTML = '';
    gameState.opponent.hand.forEach(() => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.innerHTML = `<img src="../images/BS_back.webp" alt="Card Back"/>`;
        opponentHandContainer.appendChild(cardEl);
    });

    playerFieldElement.innerHTML = '';
    gameState.player.field.forEach(card => {
        const cardEl = createCardElement(card, 'field', gameState, callbacks);
        const coreContainer = cardEl.querySelector('.card-core-display');
        if (card.cores && coreContainer) {
            card.cores.forEach(core => coreContainer.appendChild(createCoreElement(core, { type: 'field', spiritUid: card.uid }, gameState, callbacks)));
        }
        playerFieldElement.appendChild(cardEl);
    });
    opponentFieldElement.innerHTML = '';
    gameState.opponent.field.forEach(card => {
        const cardEl = createCardElement(card, 'field', gameState, callbacks);
        cardEl.classList.remove('can-attack', 'can-block');
        const coreContainer = cardEl.querySelector('.card-core-display');
        if (card.cores && coreContainer) {
            card.cores.forEach(core => coreContainer.appendChild(createCoreElement(core, { type: 'field', spiritUid: card.uid }, gameState, callbacks)));
        }
        opponentFieldElement.appendChild(cardEl);
    });

    playerReserveCoreContainer.innerHTML = '';
    gameState.player.reserve.forEach(core => playerReserveCoreContainer.appendChild(createCoreElement(core, { type: 'reserve' }, gameState, callbacks)));
    opponentReserveCoreContainer.innerHTML = '';
    gameState.opponent.reserve.forEach(core => opponentReserveCoreContainer.appendChild(createCoreElement(core, { type: 'reserve' }, gameState, callbacks)));
    
    // *** FIXED: Update text content for all zones with counts ***
    playerCostTrashZone.innerHTML = `<span>Cost Trash (${gameState.player.costTrash.length})</span>`;
    const playerCostCoreContainer = document.createElement('div');
    playerCostCoreContainer.className = 'core-container';
    gameState.player.costTrash.forEach(core => playerCostCoreContainer.appendChild(createCoreElement(core, { type: 'trash' }, gameState, callbacks)));
    playerCostTrashZone.appendChild(playerCostCoreContainer);

    opponentCostTrashZone.innerHTML = `<span>Cost Trash (${gameState.opponent.costTrash.length})</span>`;
    const opponentCostCoreContainer = document.createElement('div');
    opponentCostCoreContainer.className = 'core-container';
    gameState.opponent.costTrash.forEach(core => opponentCostCoreContainer.appendChild(createCoreElement(core, { type: 'trash' }, gameState, callbacks)));
    opponentCostTrashZone.appendChild(opponentCostCoreContainer);
    
    playerCardTrashZone.innerHTML = `<span>Card Trash (${gameState.player.cardTrash.length})</span>`;
    opponentCardTrashZone.innerHTML = `<span>Card Trash (${gameState.opponent.cardTrash.length})</span>`;
    
    const playerReserveZone = document.getElementById('player-reserve-zone');
    if (playerReserveZone) {
        playerReserveZone.querySelector('span').textContent = `Your Reserve (${gameState.player.reserve.length})`;
    }
    const opponentReserveZone = document.getElementById('opponent-reserve-zone');
    if (opponentReserveZone) {
        opponentReserveZone.querySelector('span').textContent = `Opponent Reserve (${gameState.opponent.reserve.length})`;
    }

    playerLifeCirclesContainer.innerHTML = '';
    for (let i = 0; i < gameState.player.life; i++) playerLifeCirclesContainer.innerHTML += `<div class="life-circle"></div>`;
    opponentLifeCirclesContainer.innerHTML = '';
    for (let i = 0; i < gameState.opponent.life; i++) opponentLifeCirclesContainer.innerHTML += `<div class="life-circle"></div>`;
    
    playerDeckElement.textContent = `Deck (${gameState.player.deck.length})`;
    opponentDeckElement.textContent = `Deck (${gameState.opponent.deck.length})`;
    
    turnIndicator.textContent = gameState.turn === 'player' ? "Your Turn" : "Opponent's Turn";
    turnIndicator.style.color = gameState.turn === 'player' ? '#00d2ff' : '#ff4141';
    phaseBtn.disabled = gameState.turn !== 'player' || summoningState.isSummoning || placementState.isPlacing || (attackState.isAttacking && attackState.defender === 'player') || flashState.isActive || flashPaymentState.isPaying;
    
    attachDragAndDropListeners(gameState);
}