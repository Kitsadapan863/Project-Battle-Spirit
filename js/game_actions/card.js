// js/game_actions/card.js
import { checkGameOver } from '../core/gameLoop.js';

/**
 * จั่วการ์ด
 */
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

/**
 * ทำลายการ์ดบนสนาม
 */
export function destroyCard(cardUid, ownerKey, gameState) {
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

/**
 * เริ่มกระบวนการแสดงการ์ดที่ถูกทิ้งจากเด็ค
 */
export function initiateDeckDiscard(count, opponentKey, gameState) {
    let discardedCards = [];
    console.log(`[Effect: Deck Discard] Discarding ${count} cards from ${opponentKey}'s deck.`);
    for (let i = 0; i < count; i++) {
        if (gameState[opponentKey].deck.length > 0) {
            const discardedCard = gameState[opponentKey].deck.shift();
            discardedCards.push(discardedCard);
        } else {
            break; // หยุดเมื่อเด็คหมด
        }
    }
    
    if (discardedCards.length > 0) {
        gameState.deckDiscardViewerState = {
            isActive: true,
            cards: discardedCards,
            owner: opponentKey
        };
    }
    
    return discardedCards; // ยังคง return การ์ดที่ทิ้ง เผื่อเอฟเฟกต์อื่นต้องใช้
}

/**
 * ยืนยันการทิ้งการ์ดจากเด็ค (หลังจากดูใน Modal แล้ว)
 */
export function confirmDeckDiscard(gameState) {
    const { isActive, cards, owner } = gameState.deckDiscardViewerState;
    if (!isActive) return false;

    // ย้ายการ์ดจาก state ชั่วคราวไปยัง cardTrash จริง
    gameState[owner].cardTrash.push(...cards);
    console.log(`Moved ${cards.length} discarded cards to ${owner}'s trash.`);

    // รีเซ็ต state
    gameState.deckDiscardViewerState = { isActive: false, cards: [], owner: null };
    return true;
}


/**
 * เริ่มกระบวนการทิ้งการ์ดจากบนมือ
 */
export function initiateDiscard(count, gameState) {
    if (count > 0) {
        gameState.discardState = { isDiscarding: true, count: count, cardToDiscard: null };
    }
}

/**
 * เลือกการ์ดที่จะทิ้ง
 */
export function selectCardForDiscard(cardUid, gameState) {
    if (!gameState.discardState.isDiscarding) return;
    if (gameState.discardState.cardToDiscard === cardUid) {
        gameState.discardState.cardToDiscard = null;
    } else {
        gameState.discardState.cardToDiscard = cardUid;
    }
}

/**
 * ยืนยันการทิ้งการ์ด
 */
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

/**
 * เคลียร์สนามจากการ์ดที่ไม่มีคอร์
 */
export function cleanupField(gameState) {
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

/**
 * ย้ายการ์ดเวทมนตร์ที่ใช้แล้วจากมือไปยัง Card Trash
 * @param {string} cardUid 
 * @param {object} gameState 
 */
export function moveUsedMagicToTrash(cardUid, gameState) {
    const cardIndex = gameState.player.hand.findIndex(c => c.uid === cardUid);
    if (cardIndex > -1) {
        const [usedCard] = gameState.player.hand.splice(cardIndex, 1);
        gameState.player.cardTrash.push(usedCard);
    }
}

export function destroyCards(uids, gameState) {
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