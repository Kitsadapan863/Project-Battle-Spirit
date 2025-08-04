// js/ui/index.js
import { getDOMElements, createCardElement, createCoreElement } from './components.js';
import { updateAllModals } from './modals.js';
import { attachDragAndDropListeners } from './dragDrop.js';

/**
 * ฟังก์ชันหลักในการอัปเดต UI ทั้งหมดของเกม
 * @param {object} gameState 
 * @param {object} callbacks 
 */
export function updateUI(gameState, callbacks) {
    if (!gameState) return;

    const dom = getDOMElements();

    // 1. อัปเดต Modal ทั้งหมด
    updateAllModals(gameState);

    // 2. อัปเดตมือของผู้เล่นและคู่ต่อสู้
    dom.playerHandContainer.innerHTML = '';
    gameState.player.hand.forEach(card => dom.playerHandContainer.appendChild(createCardElement(card, 'hand', 'player', gameState, callbacks)));

    dom.opponentHandContainer.innerHTML = '';
    gameState.opponent.hand.forEach(() => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.innerHTML = `<img src="../images/BS_back.webp" alt="Card Back"/>`;
        dom.opponentHandContainer.appendChild(cardEl);
    });

    // 4. อัปเดตสนาม
    dom.playerSpiritsContainer.innerHTML = '';
    dom.playerNexusesContainer.innerHTML = '';
    gameState.player.field.forEach(card => {
        const cardEl = createCardElement(card, 'field', 'player', gameState, callbacks);
        const coreContainer = cardEl.querySelector('.card-core-display');
        if (card.cores && coreContainer) {
            card.cores.forEach(core => {
                coreContainer.appendChild(createCoreElement(core, { type: 'field', spiritUid: card.uid }, gameState, callbacks));
            });
        }
        if (card.type === 'Spirit') dom.playerSpiritsContainer.appendChild(cardEl);
        else if (card.type === 'Nexus') dom.playerNexusesContainer.appendChild(cardEl);
    });
    
    dom.opponentSpiritsContainer.innerHTML = '';
    dom.opponentNexusesContainer.innerHTML = '';
    gameState.opponent.field.forEach(card => {
        const cardEl = createCardElement(card, 'field', 'opponent', gameState, callbacks);
        const coreContainer = cardEl.querySelector('.card-core-display');
        if (card.cores && coreContainer) {
            card.cores.forEach(core => {
                coreContainer.appendChild(createCoreElement(core, { type: 'field', spiritUid: card.uid }, gameState, callbacks));
            });
        }
        if (card.type === 'Spirit') dom.opponentSpiritsContainer.appendChild(cardEl);
        else if (card.type === 'Nexus') dom.opponentNexusesContainer.appendChild(cardEl);
    });

    // 5. อัปเดต Reserve, Trash, Life, และ Deck
    dom.playerReserveCoreContainer.innerHTML = '';
    gameState.player.reserve.forEach(core => dom.playerReserveCoreContainer.appendChild(createCoreElement(core, { type: 'reserve' }, gameState, callbacks)));
    
    dom.opponentReserveCoreContainer.innerHTML = '';
    gameState.opponent.reserve.forEach(core => dom.opponentReserveCoreContainer.appendChild(createCoreElement(core, { type: 'reserve' }, gameState, callbacks)));

    const playerReserveZone = document.getElementById('player-reserve-zone');
    if (playerReserveZone) {
        playerReserveZone.querySelector('span').textContent = `Your Reserve (${gameState.player.reserve.length})`;
    }
    const opponentReserveZone = document.getElementById('opponent-reserve-zone');
    if (opponentReserveZone) {
        opponentReserveZone.querySelector('span').textContent = `Opponent Reserve (${gameState.opponent.reserve.length})`;
    }

    // ---- START: เพิ่มโค้ดที่หายไปตรงนี้ ----
    dom.playerCostTrashZone.innerHTML = `<span>Cost Trash (${gameState.player.costTrash.length})</span>`;
    const playerCostCoreContainer = document.createElement('div');
    playerCostCoreContainer.className = 'core-container';
    gameState.player.costTrash.forEach(core => playerCostCoreContainer.appendChild(createCoreElement(core, { type: 'trash' }, gameState, callbacks)));
    dom.playerCostTrashZone.appendChild(playerCostCoreContainer);

    dom.opponentCostTrashZone.innerHTML = `<span>Cost Trash (${gameState.opponent.costTrash.length})</span>`;
    const opponentCostCoreContainer = document.createElement('div');
    opponentCostCoreContainer.className = 'core-container';
    gameState.opponent.costTrash.forEach(core => opponentCostCoreContainer.appendChild(createCoreElement(core, { type: 'trash' }, gameState, callbacks)));
    dom.opponentCostTrashZone.appendChild(opponentCostCoreContainer);
    // ---- END: เพิ่มโค้ดที่หายไปตรงนี้ ----

    dom.playerCardTrashZone.querySelector('span').textContent = `Card Trash (${gameState.player.cardTrash.length})`;
    dom.opponentCardTrashZone.querySelector('span').textContent = `Card Trash (${gameState.opponent.cardTrash.length})`;

    // แสดงรูปการ์ดใบบนสุดของ Player's Card Trash
    const latestPlayerCard = gameState.player.cardTrash.length > 0 ? gameState.player.cardTrash[gameState.player.cardTrash.length - 1] : null;
    const playerLatestCardImage = dom.playerCardTrashZone.querySelector('.latest-card-image');
    if (playerLatestCardImage) {
        if (latestPlayerCard) {
            playerLatestCardImage.style.backgroundImage = `url('${latestPlayerCard.image}')`;
        } else {
            playerLatestCardImage.style.backgroundImage = 'none';
        }
    }

    // แสดงรูปการ์ดใบบนสุดของ Opponent's Card Trash
    const latestOpponentCard = gameState.opponent.cardTrash.length > 0 ? gameState.opponent.cardTrash[gameState.opponent.cardTrash.length - 1] : null;
    const opponentLatestCardImage = dom.opponentCardTrashZone.querySelector('.latest-card-image');
    if (opponentLatestCardImage) {
        if (latestOpponentCard) {
            opponentLatestCardImage.style.backgroundImage = `url('${latestOpponentCard.image}')`;
        } else {
            opponentLatestCardImage.style.backgroundImage = 'none';
        }
    }
    
    dom.playerLifeCirclesContainer.innerHTML = '';
    for (let i = 0; i < gameState.player.life; i++) dom.playerLifeCirclesContainer.innerHTML += `<div class="life-circle"></div>`;
    dom.opponentLifeCirclesContainer.innerHTML = '';
    for (let i = 0; i < gameState.opponent.life; i++) dom.opponentLifeCirclesContainer.innerHTML += `<div class="life-circle"></div>`;
    
    dom.playerDeckElement.textContent = `Deck (${gameState.player.deck.length})`;
    dom.opponentDeckElement.textContent = `Deck (${gameState.opponent.deck.length})`;

    // 6. อัปเดตข้อมูลสถานะเกม
    // ... (โค้ดส่วนล่างเหมือนเดิม) ...
    dom.turnIndicator.textContent = gameState.turn === 'player' ? "Your Turn" : "Opponent's Turn";
    dom.turnIndicator.style.color = gameState.turn === 'player' ? '#00d2ff' : '#ff4141';
    if (dom.turnNumberElement) dom.turnNumberElement.textContent = gameState.gameTurn;

    dom.phaseIndicator.querySelectorAll('.phase-step').forEach(p => p.classList.remove('active-phase'));
    const activePhaseEl = document.getElementById(`phase-${gameState.phase}`);
    if (activePhaseEl) activePhaseEl.classList.add('active-phase');
    
    dom.phaseBtn.disabled = gameState.turn !== 'player' || gameState.summoningState.isSummoning || gameState.placementState.isPlacing || (gameState.attackState.isAttacking && gameState.attackState.defender === 'player') || gameState.flashState.isActive || gameState.magicPaymentState.isPaying || gameState.discardState.isDiscarding;
    
    // 7. อัปเดตเนื้อหาในหน้าต่าง Card Trash Viewer
    dom.cardTrashViewerContainer.innerHTML = '';
    gameState.player.cardTrash.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.innerHTML = `<img src="${card.image}" alt="${card.name}" draggable="false"/>`;
        dom.cardTrashViewerContainer.appendChild(cardEl);
    });

    dom.opponentCardTrashViewerContainer.innerHTML = '';
    gameState.opponent.cardTrash.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.innerHTML = `<img src="${card.image}" alt="${card.name}" draggable="false"/>`;
        dom.opponentCardTrashViewerContainer.appendChild(cardEl);
    });
    // 8. ผูก Listener ที่จำเป็นสำหรับสถานะปัจจุบัน
    attachDragAndDropListeners(gameState, callbacks);
}