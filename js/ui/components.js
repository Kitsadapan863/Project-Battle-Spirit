// js/ui/components.js
import { getSpiritLevelAndBP, getCardLevel } from '../utils.js';
import { updateUI } from './index.js';
// Centralized DOM Element Queries
export function getDOMElements() {
    return {
        // Game Board
        playerHandContainer: document.querySelector('#player-hand .card-container'),
        opponentHandContainer: document.querySelector('#opponent-hand .card-container'),
        playerFieldElement: document.getElementById('player-field'),
        opponentFieldElement: document.getElementById('opponent-field'),
        playerSpiritsContainer: document.getElementById('player-spirits-container'), // แก้ไขจาก Spิrits เป็น Spirits
        playerNexusesContainer: document.getElementById('player-nexuses-container'),
        opponentSpiritsContainer: document.getElementById('opponent-spirits-container'),
        opponentNexusesContainer: document.getElementById('opponent-nexuses-container'),
        playerReserveCoreContainer: document.getElementById('player-reserve-core-container'),
        opponentReserveCoreContainer: document.getElementById('opponent-reserve-core-container'),
        playerCostTrashZone: document.getElementById('player-cost-trash-zone'),
        opponentCostTrashZone: document.getElementById('opponent-cost-trash-zone'),
        playerCardTrashZone: document.getElementById('player-card-trash-zone'),
        opponentCardTrashZone: document.getElementById('opponent-card-trash-zone'),
        playerLifeCirclesContainer: document.getElementById('player-life-circles'),
        opponentLifeCirclesContainer: document.getElementById('opponent-life-circles'),
        playerDeckElement: document.getElementById('player-deck'),
        opponentDeckElement: document.getElementById('opponent-deck'),
        
        // Game Info
        turnIndicator: document.getElementById('turn-indicator'),
        turnNumberElement: document.getElementById('turn-number'),
        phaseIndicator: document.getElementById('phase-indicator'),
        phaseBtn: document.getElementById('phase-btn'),
        restartBtn: document.getElementById('restart-btn'),

        // Card Detail Viewer
        cardDetailViewer: document.getElementById('card-detail-viewer'),
        detailCardImage: document.getElementById('detail-card-image'),
        detailCardEffects: document.getElementById('detail-card-effects'),

        // ---- START: CORRECTED THIS BLOCK ----
        // Modal Containers
        gameOverModal: document.getElementById('game-over-modal'),
        cardTrashModal: document.getElementById('card-trash-modal'),
        opponentCardTrashModal: document.getElementById('opponent-card-trash-modal'),
        effectChoiceModal: document.getElementById('effect-choice-modal'),

        // Modal Action Buttons & Content
        cardTrashViewerContainer: document.getElementById('card-trash-viewer-container'), // <-- เพิ่มที่นี่
        opponentCardTrashViewerContainer: document.getElementById('opponent-card-trash-viewer-container'), // <-- เพิ่มที่นี่
        effectChoiceTitle: document.getElementById('effect-choice-title'),
        effectChoiceButtons: document.getElementById('effect-choice-buttons'),
        confirmSummonBtn: document.getElementById('confirm-summon-btn'),
        cancelSummonBtn: document.getElementById('cancel-summon-btn'),
        confirmPlacementBtn: document.getElementById('confirm-placement-btn'),
        takeDamageBtn: document.getElementById('take-damage-btn'),
        passFlashBtn: document.getElementById('pass-flash-btn'),
        confirmMagicBtn: document.getElementById('confirm-magic-btn'),
        cancelMagicBtn: document.getElementById('cancel-magic-btn'),
        confirmDiscardBtn: document.getElementById('confirm-discard-btn'),
        confirmCoreRemovalBtn: document.getElementById('confirm-core-removal-btn'),
        cancelCoreRemovalBtn: document.getElementById('cancel-core-removal-btn'),
        closeTrashViewerBtn: document.getElementById('close-trash-viewer-btn'),
        closeOpponentTrashViewerBtn: document.getElementById('close-opponent-trash-viewer-btn'),
        cancelEffectChoiceBtn: document.getElementById('cancel-effect-choice-btn'),
        // ---- END: CORRECTED THIS BLOCK ----
    };
}


/**
 * สร้าง DOM element สำหรับการ์ด 1 ใบ
 */
export function createCardElement(cardData, location, owner, gameState, callbacks) {
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
        // MODIFIED: Add highlight based on detailed targeting info
        if (gameState.targetingState.isTargeting && gameState.targetingState.forEffect.target) {
            const targetInfo = gameState.targetingState.forEffect.target;
            const cardOwner = owner;

            const isCorrectScope = targetInfo.scope === 'any' || targetInfo.scope === cardOwner;
            const isCorrectType = cardData.type.toLowerCase() === targetInfo.type;
            const meetsBPCondition = !targetInfo.bpOrLess || getSpiritLevelAndBP(cardData, cardOwner, gameState).bp <= targetInfo.bpOrLess;
            
            if (isCorrectScope && isCorrectType && meetsBPCondition) {
                cardDiv.classList.add('can-be-targeted');
            }
        }
    }
    return cardDiv;
}

/**
 * สร้าง DOM element สำหรับคอร์ 1 เม็ด
 */
export function createCoreElement(coreData, locationInfo, gameState, callbacks) {
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


// --- Card Detail Viewer Logic ---
const { cardDetailViewer, detailCardImage, detailCardEffects } = getDOMElements();

function formatEffectText(card) {
    if (!card.effects || card.effects.length === 0) return '';
    return card.effects.map(effect => {
        const timingText = `<strong>[${effect.timing.charAt(0).toUpperCase() + effect.timing.slice(1)}]</strong>`;
        const description = effect.description.replace(/\\n/g, '<br>');
        return `${timingText}<br>${description}`;
    }).join('<br><br>');
}

export function delegateHover(event, gameState) {
    const cardEl = event.target.closest('.card');
    if (!cardEl || cardEl.closest('#opponent-hand')) {
        hideCardDetails();
        return;
    }
    
    const allCards = [...gameState.player.hand, ...gameState.player.field, ...gameState.player.cardTrash, ...gameState.opponent.field, ...gameState.opponent.cardTrash];
    const cardData = allCards.find(c => c.uid === cardEl.id);

    if (cardData) {
        detailCardImage.src = cardData.image;
        detailCardEffects.innerHTML = formatEffectText(cardData);
        cardDetailViewer.classList.add('visible');
    }
}

export function delegateMouseOut() {
    hideCardDetails();
}

function hideCardDetails() {
    cardDetailViewer.classList.remove('visible');
}

/**
 * แสดง Modal สำหรับเลือก Main/Flash effect
 */
export function showEffectChoiceModal(card, onChoose, gameState, callbacks) {
    const { effectChoiceModal, effectChoiceTitle, effectChoiceButtons } = getDOMElements();
    gameState.effectChoiceState = { isChoosing: true, card: card };
    effectChoiceTitle.textContent = `Choose Effect: ${card.name}`;
    
    effectChoiceButtons.innerHTML = `
        <button id="effect-choice-main-btn">Use Main</button>
        <button id="effect-choice-flash-btn">Use Flash</button>
    `;
    
    document.getElementById('effect-choice-main-btn').onclick = () => {
        gameState.effectChoiceState = { isChoosing: false, card: null };
        onChoose('main');
        updateUI(gameState, callbacks);
    };
    document.getElementById('effect-choice-flash-btn').onclick = () => {
        gameState.effectChoiceState = { isChoosing: false, card: null };
        onChoose('flash');
        updateUI(gameState, callbacks);
    };
    
    effectChoiceModal.classList.add('visible');
}