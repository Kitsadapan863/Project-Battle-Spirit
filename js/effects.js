// js/effects.js
import { getCardLevel } from './utils.js';
import { applyPowerUpEffect } from './actions.js';

function discardOpponentDeck(count, opponentKey, gameState) {
    console.log(`Activating Deck Discard: ${count} cards`);
    for (let i = 0; i < count; i++) {
        if (gameState[opponentKey].deck.length > 0) {
            const discardedCard = gameState[opponentKey].deck.shift();
            gameState[opponentKey].cardTrash.push(discardedCard);
            console.log(`[Deck Discard] discarded ${discardedCard.name} from ${opponentKey}'s deck.`);
        }
    }
}

// *** START: แก้ไขฟังก์ชัน applyCrush ให้ถูกต้องตามกฎ ***
function applyCrush(card, cardLevel, ownerKey, gameState) {
    const opponentKey = ownerKey === 'player' ? 'opponent' : 'player';
    
    // 1. เริ่มต้นจำนวนที่จะทิ้งด้วยเลเวลของ Spirit ที่ใช้ Crush
    let cardsToDiscard = cardLevel;
    console.log(`[Crush] Base discard from ${card.name} LV${cardLevel}: ${cardsToDiscard}`);

    // 2. ตรวจสอบหาโบนัส "add crush" จาก "ตัวเองเท่านั้น"
    if (card.effects) {
        const addCrushEffects = card.effects.filter(effect => 
            effect.timing === 'permanent' && 
            effect.keyword === 'add crush' && 
            effect.level.includes(cardLevel) // ตรวจสอบว่าเอฟเฟกต์ทำงานที่เลเวลปัจจุบันหรือไม่
        );

        if (addCrushEffects.length > 0) {
            // ใช้โบนัสที่มากที่สุด (กรณี LV3 ของ Steam-Golem ที่มีเอฟเฟกต์ LV2 ทับซ้อนอยู่)
            const highestBonus = Math.max(...addCrushEffects.map(e => e.count));
            console.log(`[Crush] Found 'add crush' bonus from itself (${card.name}): +${highestBonus}`);
            cardsToDiscard += highestBonus;
        }
    }

    // 3. สั่งทิ้งเด็คด้วยจำนวนสุดท้าย
    console.log(`[Crush] Total cards to discard: ${cardsToDiscard}`);
    discardOpponentDeck(cardsToDiscard, opponentKey, gameState);
}
// *** END: แก้ไขฟังก์ชัน applyCrush ***

function applyClash(card, ownerKey, gameState) {
    console.log(`Activating [Clash] from ${card.name}`);
    if (gameState.attackState.isAttacking) {
        gameState.attackState.isClash = true;
    }
}

export function resolveTriggeredEffects(card, timing, ownerKey, gameState) {
    if (!card.effects) return;

    const cardLevel = getCardLevel(card).level;
    const opponentKey = ownerKey === 'player' ? 'opponent' : 'player';

    card.effects.forEach(effect => {
        // timing 'permanent' จะไม่ถูกเรียกจากตรงนี้ แต่จะถูกตรวจสอบโดยฟังก์ชันอื่นโดยตรง
        if (effect.timing !== 'permanent' && effect.timing === timing && effect.level.includes(cardLevel)) {
            if (effect.keyword) {
                switch (effect.keyword) {
                    case 'crush':
                        applyCrush(card, cardLevel, ownerKey, gameState);
                        break;
                    case 'clash':
                        applyClash(card, ownerKey, gameState);
                        break;
                    case 'power up':
                        if (timing === 'whenAttacks') {
                           applyPowerUpEffect(card.uid, effect.power, effect.duration, gameState);
                        }
                        break;
                    
                    case 'discard':
                        if (effect.count) {
                            discardOpponentDeck(effect.count, opponentKey, gameState);
                        } else if (timing === 'whenSummoned') {
                            const nexusCount = gameState[ownerKey].field.filter(c => c.type === 'Nexus').length;
                            const cardsToDiscard = Math.min(nexusCount * 5, 15);
                            discardOpponentDeck(cardsToDiscard, opponentKey, gameState);
                        } else if (timing === 'whenAttacks') {
                            let blueSymbolCount = 0;
                            gameState[ownerKey].field.forEach(c => {
                                if (c.symbol && c.symbol.blue) {
                                    blueSymbolCount += c.symbol.blue;
                                }
                            });
                            discardOpponentDeck(blueSymbolCount, opponentKey, gameState);
                        }
                        break;
                }
            }
        }
    });
}