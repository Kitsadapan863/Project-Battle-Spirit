// js/ui.js
// หน้าที่: จัดการทุกอย่างที่เกี่ยวกับการแสดงผล (DOM) และรับ Event จากผู้ใช้
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
export const summonPaymentOverlay = document.getElementById('summon-payment-overlay');
export const summonPaymentTitle = document.getElementById('summon-payment-title');
export const paymentCostValue = document.getElementById('payment-cost-value');
export const paymentSelectedValue = document.getElementById('payment-selected-value');
export const confirmSummonBtn = document.getElementById('confirm-summon-btn');
export const cancelSummonBtn = document.getElementById('cancel-summon-btn');
export const confirmPlacementBtn = document.getElementById('confirm-placement-btn');
export const placementOverlay = document.getElementById('placement-overlay');
export const placementTitle = document.getElementById('placement-title');
export const phaseIndicator = document.getElementById('phase-indicator');
export const defenseOverlay = document.getElementById('defense-overlay');
export const defenseTitle = document.getElementById('defense-title');
export const defenseAttackerInfo = document.getElementById('defense-attacker-info');
export const takeDamageBtn = document.getElementById('take-damage-btn');

function createCardElement(cardData, location, gameState, callbacks) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    cardDiv.id = cardData.uid;
    cardDiv.innerHTML = `<img src="${cardData.image}" alt="${cardData.name}" draggable="false"/>`;

    if (location === 'hand') {
        cardDiv.addEventListener('click', () => callbacks.onInitiateSummon(cardData.uid));
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

        if (gameState.attackState.isAttacking && gameState.attackState.defender === 'player' && !cardData.isExhausted) {
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
    const { isSummoning, selectedCores } = gameState.summoningState;
    const { isPlacing } = gameState.placementState;

    if (locationInfo.type === 'trash') {
        coreDiv.draggable = false;
        return coreDiv;
    }

    const isSelectedForPayment = isSummoning && selectedCores.some(c => c.coreId === coreData.id);

    if (isSummoning) {
        coreDiv.draggable = false;
        coreDiv.classList.add('selectable-for-payment');
        if (isSelectedForPayment) {
            coreDiv.classList.add('selected-for-payment');
        }
        coreDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            callbacks.onSelectCoreForPayment(coreData.id, locationInfo.type, locationInfo.spiritUid);
        });
    } else if (isPlacing) {
        coreDiv.draggable = false;
        const isTargetSpiritCore = locationInfo.spiritUid === gameState.placementState.targetSpiritUid;
        if (!isTargetSpiritCore) {
            coreDiv.classList.add('selectable-for-placement');
            coreDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                callbacks.onSelectCoreForPlacement(coreData.id, locationInfo.type, locationInfo.spiritUid);
            });
        }
    } else {
        coreDiv.draggable = gameState.phase === 'main';
    }
    return coreDiv;
}

export function updateUI(gameState, callbacks) {
    if (!gameState) return;
    const { summoningState, placementState, attackState } = gameState;

    if (summoningState.isSummoning) {
        summonPaymentOverlay.classList.add('visible');
        summonPaymentTitle.textContent = `Summoning ${summoningState.cardToSummon.name}`;
        paymentCostValue.textContent = summoningState.costToPay;
        paymentSelectedValue.textContent = summoningState.selectedCores.length;
        confirmSummonBtn.disabled = summoningState.selectedCores.length < summoningState.costToPay;
    } else {
        summonPaymentOverlay.classList.remove('visible');
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
    
    if (attackState.isAttacking && attackState.defender === 'player') {
        const attacker = gameState.opponent.field.find(s => s.uid === attackState.attackerUid);
        if (attacker) {
            const { bp } = getSpiritLevelAndBP(attacker);
            defenseAttackerInfo.textContent = `Attacker: ${attacker.name} (BP: ${bp})`;
            defenseOverlay.classList.add('visible');
        }
    } else {
        defenseOverlay.classList.remove('visible');
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
        if (attackState.isAttacking && attackState.defender === 'opponent') {
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
        cardEl.classList.remove('can-attack');
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
    
    playerCostTrashZone.innerHTML = '<span>Cost Trash</span>';
    gameState.player.costTrash.forEach(core => playerCostTrashZone.appendChild(createCoreElement(core, { type: 'trash' }, gameState, callbacks)));
    opponentCostTrashZone.innerHTML = '<span>Cost Trash</span>';
    gameState.opponent.costTrash.forEach(core => opponentCostTrashZone.appendChild(createCoreElement(core, { type: 'trash' }, gameState, callbacks)));
    
    playerCardTrashZone.innerHTML = `<span>Card Trash (${gameState.player.cardTrash.length})</span>`;
    opponentCardTrashZone.innerHTML = `<span>Card Trash (${gameState.opponent.cardTrash.length})</span>`;
    
    playerLifeCirclesContainer.innerHTML = '';
    for (let i = 0; i < gameState.player.life; i++) playerLifeCirclesContainer.innerHTML += `<div class="life-circle"></div>`;
    opponentLifeCirclesContainer.innerHTML = '';
    for (let i = 0; i < gameState.opponent.life; i++) opponentLifeCirclesContainer.innerHTML += `<div class="life-circle"></div>`;
    
    playerDeckElement.textContent = `Deck (${gameState.player.deck.length})`;
    opponentDeckElement.textContent = `Deck (${gameState.opponent.deck.length})`;
    
    turnIndicator.textContent = gameState.turn === 'player' ? "Your Turn" : "Opponent's Turn";
    turnIndicator.style.color = gameState.turn === 'player' ? '#00d2ff' : '#ff4141';
    phaseBtn.disabled = gameState.turn !== 'player' || summoningState.isSummoning || placementState.isPlacing || (attackState.isAttacking && attackState.defender === 'player');
    
    attachDragAndDropListeners(gameState);
}
