// js/effects.js
import { getCardLevel } from './utils.js';
import { applyPowerUpEffect } from './actions.js';

function discardOpponentDeck(count, opponentKey, gameState) {
    let discardedCards = [];
    console.log(`Activating Deck Discard: ${count} cards`);
    for (let i = 0; i < count; i++) {
        if (gameState[opponentKey].deck.length > 0) {
            const discardedCard = gameState[opponentKey].deck.shift();
            gameState[opponentKey].cardTrash.push(discardedCard);
            discardedCards.push(discardedCard); // เก็บข้อมูลการ์ดที่ทิ้ง
            console.log(`[Deck Discard] discarded ${discardedCard.name} from ${opponentKey}'s deck.`);
        }
    }
    return discardedCards; // ส่งคืน array ของการ์ดที่ทิ้งทั้งหมด
}

function applyCrush(card, cardLevel, ownerKey, gameState) {
    const opponentKey = ownerKey === 'player' ? 'opponent' : 'player';
    
    // 1. คำนวณจำนวนทิ้งเริ่มต้น + โบนัสจาก Steam-Golem
    let cardsToDiscard = cardLevel;
    if (card.effects) {
        const addCrushEffects = card.effects.filter(effect => 
            effect.timing === 'permanent' && 
            effect.keyword === 'add crush' && 
            effect.level.includes(cardLevel)
        );
        if (addCrushEffects.length > 0) {
            const highestBonus = Math.max(...addCrushEffects.map(e => e.count));
            cardsToDiscard += highestBonus;
        }
    }
    console.log(`[Crush] ${card.name} will discard ${cardsToDiscard} cards.`);

    // 2. สั่งทิ้งเด็ค และรับข้อมูลการ์ดที่ถูกทิ้งกลับมา
    const discardedCards = discardOpponentDeck(cardsToDiscard, opponentKey, gameState);

    // 3. ตรวจสอบหาเอฟเฟกต์ Power Up ที่เชื่อมโยงกับ Crush บนตัวเอง
    if (card.effects) {
        const powerUpEffect = card.effects.find(effect =>
            effect.keyword === 'power up' &&
            effect.triggered_by === 'crush' &&
            effect.level.includes(cardLevel)
        );

        if (powerUpEffect) {
            // นับจำนวน Spirit cards ที่ถูกทิ้ง
            const discardedSpiritCount = discardedCards.filter(c => c.type === 'Spirit').length;
            if (discardedSpiritCount > 0) {
                const totalPowerUp = discardedSpiritCount * powerUpEffect.power;
                console.log(`[Ambrose Effect] Discarded ${discardedSpiritCount} Spirits, granting +${totalPowerUp} BP.`);
                // สั่งเพิ่มพลัง
                applyPowerUpEffect(card.uid, totalPowerUp, powerUpEffect.duration, gameState);
            }
        }
    }
}

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
                        // Power up ทั่วไปที่ไม่เชื่อมกับ Crush จะทำงานที่นี่
                        if (!effect.triggered_by) {
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