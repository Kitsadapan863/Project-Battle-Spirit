// js/ui.js
// หน้าที่: จัดการทุกอย่างที่เกี่ยวกับการแสดงผล (DOM) และรับ Event จากผู้ใช้
import { handleSpiritClick, initiateSummon, selectCoreForPayment, selectCoreForPlacement } from './actions.js';
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

export function getSpiritLevelAndBP(spiritCard) {
    if (!spiritCard || !spiritCard.cores) return { level: 0, bp: 0 };
    const currentCores = spiritCard.cores.length;
    let currentLevel = 0;
    let currentBP = 0;
    if (!spiritCard.level) return { level: 0, bp: 0 };
    const levels = Object.keys(spiritCard.level)
        .map(key => ({ name: key, ...spiritCard.level[key] }))
        .sort((a, b) => b.core - a.core);
    for (const levelInfo of levels) {
        if (currentCores >= levelInfo.core) {
            currentLevel = parseInt(levelInfo.name.replace('level-', ''), 10);
            currentBP = levelInfo.bp;
            break;
        }
    }
    return { level: currentLevel, bp: currentBP };
}

function createCardElement(cardData, location, gameState) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    cardDiv.id = cardData.uid;
    cardDiv.innerHTML = `<img src="${cardData.image}" alt="${cardData.name}" draggable="false"/>`;

    if (location === 'hand') {
        cardDiv.addEventListener('click', () => {
            initiateSummon(cardData.uid, gameState);
            updateUI(gameState);
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
        } else if (gameState.turn === 'player' && gameState.phase === 'attack' && !gameState.summoningState.isSummoning && !gameState.placementState.isPlacing && gameState.gameTurn > 1) {
            cardDiv.classList.add('can-attack');
        }
        
        if (gameState.placementState.isPlacing && gameState.placementState.targetSpiritUid === cardData.uid) {
            cardDiv.classList.add('can-attack'); // Re-use green pulse animation for placement target
        }

        cardDiv.addEventListener('click', () => {
            if (handleSpiritClick(cardData, gameState)) {
                updateUI(gameState);
            }
        });
    }
    return cardDiv;
}

function createCoreElement(coreData, locationInfo, gameState) {
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
            selectCoreForPayment(coreData.id, locationInfo.type, locationInfo.spiritUid, gameState);
            updateUI(gameState);
        });
    } else if (isPlacing) {
        coreDiv.draggable = false;
        const isTargetSpiritCore = locationInfo.spiritUid === gameState.placementState.targetSpiritUid;
        if (!isTargetSpiritCore) {
            coreDiv.classList.add('selectable-for-placement');
            coreDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                selectCoreForPlacement(coreData.id, locationInfo.type, locationInfo.spiritUid, gameState);
                updateUI(gameState);
            });
        }
    } else {
        // *** CHANGE: Core is only draggable during the Main Step ***
        coreDiv.draggable = gameState.phase === 'main';
    }
    return coreDiv;
}

export function updateUI(gameState) {
    if (!gameState) return;
    const { summoningState, placementState } = gameState;

    // Update Modals
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
    
    if (gameState.gameover) {
        gameOverMessage.textContent = `${gameState.player.life <= 0 ? 'Opponent' : 'Player'} Wins!`;
        gameOverModal.classList.add('visible');
    }

    // Update Phase Indicator
    const allPhases = phaseIndicator.querySelectorAll('.phase-step');
    allPhases.forEach(p => p.classList.remove('active-phase'));
    const activePhaseEl = document.getElementById(`phase-${gameState.phase}`);
    if (activePhaseEl) {
        activePhaseEl.classList.add('active-phase');
    }

    // Update Phase Button Text and State
    if (gameState.turn === 'player') {
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

    // Render Game Board
    playerHandContainer.innerHTML = '';
    gameState.player.hand.forEach(card => playerHandContainer.appendChild(createCardElement(card, 'hand', gameState)));

    opponentHandContainer.innerHTML = '';
    gameState.opponent.hand.forEach(() => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.innerHTML = `<img src="../images/BS_back.webp" alt="Card Back"/>`;
        opponentHandContainer.appendChild(cardEl);
    });

    playerFieldElement.innerHTML = '';
    gameState.player.field.forEach(card => {
        const cardEl = createCardElement(card, 'field', gameState);
        const coreContainer = cardEl.querySelector('.card-core-display');
        if (card.cores && coreContainer) {
            card.cores.forEach(core => coreContainer.appendChild(createCoreElement(core, { type: 'field', spiritUid: card.uid }, gameState)));
        }
        playerFieldElement.appendChild(cardEl);
    });

    opponentFieldElement.innerHTML = '';
    gameState.opponent.field.forEach(card => {
        const cardEl = createCardElement(card, 'field', gameState);
        cardEl.classList.remove('can-attack');
        const coreContainer = cardEl.querySelector('.card-core-display');
        if (card.cores && coreContainer) {
            card.cores.forEach(core => coreContainer.appendChild(createCoreElement(core, { type: 'field', spiritUid: card.uid }, gameState)));
        }
        opponentFieldElement.appendChild(cardEl);
    });

    playerReserveCoreContainer.innerHTML = '';
    gameState.player.reserve.forEach(core => playerReserveCoreContainer.appendChild(createCoreElement(core, { type: 'reserve' }, gameState)));
    opponentReserveCoreContainer.innerHTML = '';
    gameState.opponent.reserve.forEach(core => opponentReserveCoreContainer.appendChild(createCoreElement(core, { type: 'reserve' }, gameState)));
    
    playerCostTrashZone.innerHTML = '<span>Cost Trash</span>';
    gameState.player.costTrash.forEach(core => playerCostTrashZone.appendChild(createCoreElement(core, { type: 'trash' }, gameState)));
    opponentCostTrashZone.innerHTML = '<span>Cost Trash</span>';
    gameState.opponent.costTrash.forEach(core => opponentCostTrashZone.appendChild(createCoreElement(core, { type: 'trash' }, gameState)));
    
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
    phaseBtn.disabled = gameState.turn !== 'player' || summoningState.isSummoning || placementState.isPlacing;
    
    attachDragAndDropListeners(gameState);
}
