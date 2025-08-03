// js/ui.js
import { getSpiritLevelAndBP, getCardLevel } from './utils.js';
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
export const cardTrashModal = document.getElementById('card-trash-modal');
export const cardTrashViewerTitle = document.getElementById('card-trash-viewer-title');
export const cardTrashViewerContainer = document.getElementById('card-trash-viewer-container');
export const closeTrashViewerBtn = document.getElementById('close-trash-viewer-btn');
export const opponentCardTrashModal = document.getElementById('opponent-card-trash-modal');
export const opponentCardTrashViewerTitle = document.getElementById('opponent-card-trash-viewer-title');
export const opponentCardTrashViewerContainer = document.getElementById('opponent-card-trash-viewer-container');
export const closeOpponentTrashViewerBtn = document.getElementById('close-opponent-trash-viewer-btn');
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
export const flashOverlay = document.getElementById('flash-overlay');
export const flashTitle = document.getElementById('flash-title');
export const flashPrompt = document.getElementById('flash-prompt');
export const passFlashBtn = document.getElementById('pass-flash-btn');
export const magicPaymentOverlay = document.getElementById('magic-payment-overlay');
export const magicPaymentTitle = document.getElementById('magic-payment-title');
export const magicPaymentCostValue = document.getElementById('magic-payment-cost-value');
export const magicPaymentSelectedValue = document.getElementById('magic-payment-selected-value');
export const confirmMagicBtn = document.getElementById('confirm-magic-btn');
export const cancelMagicBtn = document.getElementById('cancel-magic-btn');
export const discardOverlay = document.getElementById('discard-overlay');
export const discardTitle = document.getElementById('discard-title');
export const discardPrompt = document.getElementById('discard-prompt');
export const confirmDiscardBtn = document.getElementById('confirm-discard-btn');
export const coreRemovalConfirmationOverlay = document.getElementById('core-removal-confirmation-overlay');
export const confirmCoreRemovalBtn = document.getElementById('confirm-core-removal-btn');
export const cancelCoreRemovalBtn = document.getElementById('cancel-core-removal-btn');
// NEW: Effect Choice Modal Elements
export const effectChoiceModal = document.getElementById('effect-choice-modal');
export const effectChoiceTitle = document.getElementById('effect-choice-title');
export const effectChoiceButtons = document.getElementById('effect-choice-buttons');
export const cancelEffectChoiceBtn = document.getElementById('cancel-effect-choice-btn');
// NEW: Targeting Overlay Elements
export const targetingOverlay = document.getElementById('targeting-overlay');
export const targetingTitle = document.getElementById('targeting-title');
export const targetingPrompt = document.getElementById('targeting-prompt');

function createCardElement(cardData, location, owner, gameState, callbacks) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    cardDiv.id = cardData.uid;
    cardDiv.innerHTML = `<img src="${cardData.image}" alt="${cardData.name}" draggable="false"/>`;

    if (location === 'hand') {
        const isPlayerTurn = gameState.turn === 'player';
        const isMainStep = gameState.phase === 'main';
        const isFlashTiming = gameState.flashState.isActive && gameState.flashState.priority === 'player';
        const isDiscarding = gameState.discardState.isDiscarding;
        
        const canUseFlash = cardData.effects?.some(e => e.timing === 'flash');
        const canUseMain = cardData.effects?.some(e => e.timing === 'main');

        if (isFlashTiming && canUseFlash) {
            cardDiv.classList.add('can-flash');
        } else if (isPlayerTurn && isMainStep && cardData.type === 'Magic' && (canUseMain || canUseFlash)) {
            cardDiv.classList.add('can-main');
        } else if (isDiscarding) {
            cardDiv.classList.add('can-discard');
            if (gameState.discardState.cardToDiscard === cardData.uid) {
                cardDiv.classList.add('selected-for-discard');
            }
        }
    } else if (location === 'field') {
        if (cardData.type === 'Nexus') {
            const { level } = getCardLevel(cardData);
            cardDiv.classList.add('nexus');
            cardDiv.innerHTML += `
                <div class="card-info">
                    <p>Lv${level} Nexus</p>
                </div>
                <div class="card-core-display"></div>
            `;
        } else { // Spirit logic
            const { level, bp, isBuffed } = getSpiritLevelAndBP(cardData, owner, gameState);
            const bpClass = isBuffed ? 'bp-buffed' : '';
            cardDiv.innerHTML += `
                <div class="card-info">
                    <p class="${bpClass}">Lv${level} BP: ${bp}</p>
                </div>
                <div class="card-core-display"></div>
            `;
            if (cardData.isExhausted) {
                cardDiv.classList.add('exhausted');
            } else if (owner === 'player' && gameState.turn === 'player' && gameState.phase === 'attack' && !gameState.attackState.isAttacking && !gameState.summoningState.isSummoning && !gameState.placementState.isPlacing && gameState.gameTurn > 1) {
                cardDiv.classList.add('can-attack');
            }
        }
        
        if (gameState.placementState.isPlacing && gameState.placementState.targetSpiritUid === cardData.uid) {
            cardDiv.classList.add('can-attack');
        }

        if (owner === 'player' && cardData.type === 'Spirit' && gameState.attackState.isAttacking && gameState.attackState.defender === 'player' && !cardData.isExhausted && !gameState.flashState.isActive) {
             cardDiv.classList.add('can-block');
        }

        // MODIFIED: Add targeting highlight based on scope
        if (gameState.targetingState.isTargeting && cardData.type === 'Spirit' && gameState.targetingState.forEffect.target) {
            const { scope } = gameState.targetingState.forEffect.target;
            const isPlayerCard = (owner === 'player');
            const isOpponentCard = (owner === 'opponent');

            if ((scope === 'player' && isPlayerCard) ||
                (scope === 'opponent' && isOpponentCard) ||
                (scope === 'any' && (isPlayerCard || isOpponentCard))) {
                cardDiv.classList.add('can-be-targeted');
            }
        }
    }
    return cardDiv;
}


// *** FIXED: Simplified click handling logic ***
function createCoreElement(coreData, locationInfo, gameState, callbacks) {
    const coreDiv = document.createElement('div');
    coreDiv.className = 'core';
    coreDiv.id = coreData.id;
    const isPaying = gameState.summoningState.isSummoning || gameState.magicPaymentState.isPaying;
    const isPlacing = gameState.placementState.isPlacing;

    if (locationInfo.type === 'trash') {
        coreDiv.draggable = false;
        return coreDiv;
    }
    
    // If we are in a special state (paying, placing), cores become clickable
    if (isPaying || isPlacing) {
        coreDiv.draggable = false;
        
        if (isPaying) {
            const paymentState = gameState.summoningState.isSummoning ? gameState.summoningState : gameState.magicPaymentState;
            const isSelected = paymentState.selectedCores.some(c => c.coreId === coreData.id);
            coreDiv.classList.add('selectable-for-payment');
            if (isSelected) {
                coreDiv.classList.add('selected-for-payment');
            }
            coreDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                callbacks.onSelectCoreForPayment(coreData.id, locationInfo.type === 'field' ? 'field' : 'reserve', locationInfo.spiritUid);
            });
        } else { // isPlacing
            coreDiv.classList.add('selectable-for-placement');
            coreDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                callbacks.onSelectCoreForPlacement(coreData.id, locationInfo.type === 'field' ? 'field' : 'reserve', locationInfo.spiritUid);
            });
        }
    } else { // Standard main step drag-and-drop
        coreDiv.draggable = gameState.phase === 'main' && gameState.turn === 'player';
    }
    return coreDiv;
}


export function updateUI(gameState, callbacks) {
    if (!gameState) return;
    const { summoningState, placementState, attackState, flashState, magicPaymentState, discardState, effectChoiceState, targetingState } = gameState;

    if (summoningState.isSummoning) {
        summonPaymentOverlay.classList.add('visible');
        summonPaymentTitle.textContent = `Summoning ${summoningState.cardToSummon.name}`;
        paymentCostValue.textContent = summoningState.costToPay;
        paymentSelectedValue.textContent = summoningState.selectedCores.length;
        confirmSummonBtn.disabled = summoningState.selectedCores.length < summoningState.costToPay;
    } else {
        summonPaymentOverlay.classList.remove('visible');
    }

    if (magicPaymentState.isPaying) {
        magicPaymentOverlay.classList.add('visible');
        magicPaymentTitle.textContent = `Use Magic: ${magicPaymentState.cardToUse.name}`;
        magicPaymentCostValue.textContent = magicPaymentState.costToPay;
        magicPaymentSelectedValue.textContent = magicPaymentState.selectedCores.length;
        confirmMagicBtn.disabled = magicPaymentState.selectedCores.length < magicPaymentState.costToPay;
    } else {
        magicPaymentOverlay.classList.remove('visible');
    }

    if (placementState.isPlacing) {
        placementOverlay.classList.add('visible');
        const targetCard = gameState.player.field.find(s => s.uid === placementState.targetSpiritUid);
        if (targetCard) {
            placementTitle.textContent = `Place Cores on ${targetCard.name}`;
        }
    } else {
        placementOverlay.classList.remove('visible');
    }
    
    if (attackState.isAttacking && attackState.defender === 'player' && !flashState.isActive) {
        defenseOverlay.classList.add('visible');
        const attacker = gameState.opponent.field.find(s => s.uid === attackState.attackerUid);
        if (attacker) {
            // แก้ไขบรรทัดนี้เพื่อรับค่า BP ให้ถูกต้อง
            const { bp } = getSpiritLevelAndBP(attacker, 'opponent', gameState);
            defenseAttackerInfo.textContent = `Attacker: ${attacker.name} (BP: ${bp})`;
        }

        const playerHasBlockers = gameState.player.field.some(s => s.type === 'Spirit' && !s.isExhausted);
        if (attackState.isClash && playerHasBlockers) {
            takeDamageBtn.style.display = 'none';
            defenseTitle.textContent = "Clash! You Must Block!";
        } else {
            takeDamageBtn.style.display = 'block';
            defenseTitle.textContent = "Opponent is Attacking!";
        }
    } else {
        defenseOverlay.classList.remove('visible');
    }

    // MODIFIED: Flash overlay should hide when targeting
    if (flashState.isActive && !magicPaymentState.isPaying && !targetingState.isTargeting) {
        flashOverlay.classList.add('visible');
        flashTitle.textContent = `Flash Timing (${flashState.priority}'s Priority)`;
    } else {
        flashOverlay.classList.remove('visible');
    }

    // NEW: Show targeting overlay when active
    if (targetingState.isTargeting) {
        targetingOverlay.classList.add('visible');
    } else {
        targetingOverlay.classList.remove('visible');
    }

    if (discardState.isDiscarding) {
        discardOverlay.classList.add('visible');
        discardPrompt.textContent = `Please select ${discardState.count} card(s) from your hand to discard.`;
        confirmDiscardBtn.disabled = !discardState.cardToDiscard;
    } else {
        discardOverlay.classList.remove('visible');
    }

    // NEW: Core Removal Confirmation Modal Visibility
    if (gameState.coreRemovalConfirmationState.isConfirming) {
        coreRemovalConfirmationOverlay.classList.add('visible');
    } else {
        coreRemovalConfirmationOverlay.classList.remove('visible');
    }

    // NEW: Effect Choice Modal Visibility
    if (effectChoiceState && effectChoiceState.isChoosing) {
        effectChoiceModal.classList.add('visible');
        effectChoiceTitle.textContent = `Choose Effect: ${effectChoiceState.card.name}`;
    } else {
        effectChoiceModal.classList.remove('visible');
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
    gameState.player.hand.forEach(card => playerHandContainer.appendChild(createCardElement(card, 'hand', 'player', gameState, callbacks)));
    opponentHandContainer.innerHTML = '';
    gameState.opponent.hand.forEach(() => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.innerHTML = `<img src="../images/BS_back.webp" alt="Card Back"/>`;
        opponentHandContainer.appendChild(cardEl);
    });

    const playerSpiritsContainer = document.getElementById('player-spirits-container');
    const playerNexusesContainer = document.getElementById('player-nexuses-container');
    if (playerSpiritsContainer) playerSpiritsContainer.innerHTML = '';
    if (playerNexusesContainer) playerNexusesContainer.innerHTML = '';

    gameState.player.field.forEach(card => {
        const cardEl = createCardElement(card, 'field', 'player', gameState, callbacks);
        const coreContainer = cardEl.querySelector('.card-core-display');
        if (card.cores && coreContainer) {
            card.cores.forEach(core => {
                coreContainer.appendChild(createCoreElement(core, { type: 'field', spiritUid: card.uid }, gameState, callbacks));
            });
        }
        if (card.type === 'Spirit' && playerSpiritsContainer) {
            playerSpiritsContainer.appendChild(cardEl);
        } else if (card.type === 'Nexus' && playerNexusesContainer) {
            playerNexusesContainer.appendChild(cardEl);
        }
    });

    const opponentSpiritsContainer = document.getElementById('opponent-spirits-container');
    const opponentNexusesContainer = document.getElementById('opponent-nexuses-container');
    if (opponentSpiritsContainer) opponentSpiritsContainer.innerHTML = '';
    if (opponentNexusesContainer) opponentNexusesContainer.innerHTML = '';

    gameState.opponent.field.forEach(card => {
        const cardEl = createCardElement(card, 'field', 'opponent', gameState, callbacks);
        const coreContainer = cardEl.querySelector('.card-core-display');
        if (card.cores && coreContainer) {
            card.cores.forEach(core => {
                coreContainer.appendChild(createCoreElement(core, { type: 'field', spiritUid: card.uid }, gameState, callbacks));
            });
        }
        if (card.type === 'Spirit' && opponentSpiritsContainer) {
            opponentSpiritsContainer.appendChild(cardEl);
        } else if (card.type === 'Nexus' && opponentNexusesContainer) {
            opponentNexusesContainer.appendChild(cardEl);
        }
    });

    playerReserveCoreContainer.innerHTML = '';
    gameState.player.reserve.forEach(core => playerReserveCoreContainer.appendChild(createCoreElement(core, { type: 'reserve' }, gameState, callbacks)));
    opponentReserveCoreContainer.innerHTML = '';
    gameState.opponent.reserve.forEach(core => opponentReserveCoreContainer.appendChild(createCoreElement(core, { type: 'reserve' }, gameState, callbacks)));
    
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
    
    playerCardTrashZone.querySelector('span').textContent = `Card Trash (${gameState.player.cardTrash.length})`;
    const latestPlayerCard = gameState.player.cardTrash.length > 0 ? gameState.player.cardTrash[gameState.player.cardTrash.length - 1] : null;
    const playerLatestCardImage = playerCardTrashZone.querySelector('.latest-card-image');
    if (playerLatestCardImage) {
        if (latestPlayerCard) {
            playerLatestCardImage.style.backgroundImage = `url('${latestPlayerCard.image}')`;
        } else {
            playerLatestCardImage.style.backgroundImage = 'none';
        }
    }

    opponentCardTrashZone.querySelector('span').textContent = `Card Trash (${gameState.opponent.cardTrash.length})`;
    const latestOpponentCard = gameState.opponent.cardTrash.length > 0 ? gameState.opponent.cardTrash[gameState.opponent.cardTrash.length - 1] : null;
    const opponentLatestCardImage = opponentCardTrashZone.querySelector('.latest-card-image');
    if (opponentLatestCardImage) {
        if (latestOpponentCard) {
            opponentLatestCardImage.style.backgroundImage = `url('${latestOpponentCard.image}')`;
        } else {
            opponentLatestCardImage.style.backgroundImage = 'none';
        }
    }
    
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

    const turnNumberElement = document.getElementById('turn-number');
    if (turnNumberElement) {
        turnNumberElement.textContent = gameState.gameTurn;
    }
    
    phaseBtn.disabled = gameState.turn !== 'player' || summoningState.isSummoning || placementState.isPlacing || (attackState.isAttacking && attackState.defender === 'player') || flashState.isActive || magicPaymentState.isPaying || discardState.isDiscarding;
    
    attachDragAndDropListeners(gameState, callbacks);

    cardTrashViewerContainer.innerHTML = '';
    gameState.player.cardTrash.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.innerHTML = `<img src="${card.image}" alt="${card.name}" draggable="false"/>`;
        cardTrashViewerContainer.appendChild(cardEl);
    });

    opponentCardTrashViewerContainer.innerHTML = '';
    gameState.opponent.cardTrash.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.innerHTML = `<img src="${card.image}" alt="${card.name}" draggable="false"/>`;
        opponentCardTrashViewerContainer.appendChild(cardEl);
    });
}