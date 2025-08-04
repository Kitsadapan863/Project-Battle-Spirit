// js/state.js
import { playerCards } from './data/playerDeck.js';
import { opponentCards } from './data/opponentDeck.js';
import { updateUI } from './ui/index.js';
import { initiateSummon, selectCoreForPayment, confirmSummon, cancelSummon, selectCoreForPlacement, confirmPlacement } from './game_actions/summon.js';
import { handleSpiritClick } from './core/eventManager.js';
import { initiateMagicPayment } from './game_actions/magic.js';
import { selectCardForDiscard } from './game_actions/card.js';
import { startPlayerTurn } from './core/gameLoop.js';
// ---- START: EDIT THIS BLOCK ----
// แก้ไขการ import โดยนำ getDOMElements เข้ามาแทน
import { delegateHover, delegateMouseOut, getDOMElements } from './ui/components.js';
// ---- END: EDIT THIS BLOCK ----

let uniqueIdCounter = 0;

const createDeck = (cards) => JSON.parse(JSON.stringify(cards))
    .filter(Boolean)
    .map(c => ({ ...c, uid: `card-${uniqueIdCounter++}`, cores: [], isExhausted: false, tempBuffs: [] }))
    .sort(() => Math.random() - 0.5);

export function initializeGame() {
    uniqueIdCounter = 0;
    const gameState = {
        turn: 'player',
        gameTurn: 1,
        gameover: false,
        phase: 'start',
        summoningState: { isSummoning: false, cardToSummon: null, costToPay: 0, selectedCores: [] },
        placementState: { isPlacing: false, targetSpiritUid: null },
        attackState: { isAttacking: false, attackerUid: null, defender: null, blockerUid: null, isClash: false },
        flashState: { isActive: false, timing: null, priority: 'player', hasPassed: { player: false, opponent: false } },
        magicPaymentState: { isPaying: false, cardToUse: null, costToPay: 0, selectedCores: [], timing: null, effectToUse: null },
        discardState: { isDiscarding: false, count: 0, cardToDiscard: null },
        coreRemovalConfirmationState: { isConfirming: false, coreId: null, from: null, sourceUid: null },
        targetingState: { isTargeting: false, forEffect: null, onTarget: null },
        effectChoiceState: { isChoosing: false, card: null },
        player: { life: 5, deck: createDeck(playerCards), hand: [], field: [], reserve: [], costTrash: [], cardTrash: [], tempBuffs: [] },
        opponent: { life: 5, deck: createDeck(opponentCards), hand: [], field: [], reserve: [], costTrash: [], cardTrash: [], tempBuffs: [] }
    };

    const callbacks = {
        onInitiateSummon: (cardUid) => {
            initiateSummon(cardUid, gameState);
            updateUI(gameState, callbacks);
        },
        onSpiritClick: (cardData) => {
            if (handleSpiritClick(cardData, gameState, callbacks)) {
                updateUI(gameState, callbacks);
            }
        },
        onSelectCoreForPayment: (coreId, from, spiritUid) => {
            selectCoreForPayment(coreId, from, spiritUid, gameState);
            updateUI(gameState, callbacks);
        },
        onSelectCoreForPlacement: (coreId, from, spiritUid) => {
            selectCoreForPlacement(coreId, from, spiritUid, gameState);
            updateUI(gameState, callbacks);
        },
        onUseMagic: (cardUid, timing, effectToUse) => {
            initiateMagicPayment(cardUid, timing, effectToUse, gameState);
            updateUI(gameState, callbacks);
        },
        onSelectCardForDiscard: (cardUid) => {
            selectCardForDiscard(cardUid, gameState);
            updateUI(gameState, callbacks);
        }
    };

    for (let i = 0; i < 4; i++) {
        if (gameState.player.deck.length > 0) gameState.player.hand.push(gameState.player.deck.shift());
        if (gameState.opponent.deck.length > 0) gameState.opponent.hand.push(gameState.opponent.deck.shift());
    }
    for (let i = 0; i < 4; i++) {
        gameState.player.reserve.push({ id: `core-plr-init-${i}` });
        gameState.opponent.reserve.push({ id: `core-opp-init-${i}` });
    }

    // ---- START: EDIT THIS BLOCK ----
    // เรียกใช้ getDOMElements() เพื่อเอา DOM elements มาใช้งาน
    const dom = getDOMElements();
    const hoverAreas = [
        dom.playerHandContainer,
        dom.playerFieldElement,
        dom.opponentFieldElement,
        dom.opponentHandContainer,
        dom.cardTrashViewerContainer,
        dom.opponentCardTrashViewerContainer
    ];
    // ---- END: EDIT THIS BLOCK ----
    
    hoverAreas.forEach(area => {
        if (area) {
            area.addEventListener('mouseover', (e) => delegateHover(e, gameState));
            area.addEventListener('mouseout', delegateMouseOut);
        }
    });

    document.getElementById('game-over-modal').classList.remove('visible');
    startPlayerTurn(gameState, callbacks);
    
    return { gameState, callbacks };
}