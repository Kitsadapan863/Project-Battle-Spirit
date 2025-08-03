// js/effects.js
import { getCardLevel, getSpiritLevelAndBP } from './utils.js';
import { applyPowerUpEffect, discardOpponentDeck } from './actions.js';

// *** START: แก้ไขฟังก์ชัน applyCrush ให้ถูกต้องตามกฎ ***
function applyCrush(card, cardLevel, ownerKey, gameState) {
    const opponentKey = ownerKey === 'player' ? 'opponent' : 'player';
    
    // 1. เริ่มต้นจำนวนที่จะทิ้งด้วยเลเวลของ Spirit ที่ใช้ Crush
    let cardsToDiscard = cardLevel;
    console.log(`[Crush] Base discard from ${card.name} LV${cardLevel}: ${cardsToDiscard}`);

    // 2. ตรวจสอบหาโบนัส "add crush" โดยจะทำงานเฉพาะใน Attack Step
    if (gameState.phase === 'attack') {
        // --- ส่วนที่แก้ไข ---
        // ตรวจสอบหาโบนัสจาก "ตัวเองเท่านั้น" (The Collapse of Battle Line)
        gameState[ownerKey].field.forEach(fieldCard => {
            // ตรวจสอบเฉพาะ Nexus เท่านั้น เพื่อหาเอฟเฟกต์ที่ส่งผลทั้งสนาม
            if (fieldCard.type === 'Nexus' && fieldCard.effects) {
                const fieldCardLevel = getCardLevel(fieldCard).level;
                const activeAddCrushEffects = fieldCard.effects.filter(effect => 
                    effect.timing === 'permanent' && 
                    effect.keyword === 'add crush' && 
                    effect.level.includes(fieldCardLevel)
                );
                if (activeAddCrushEffects.length > 0) {
                    const totalBonusFromCard = activeAddCrushEffects.reduce((sum, effect) => sum + effect.count, 0);
                    console.log(`[Crush] Found 'add crush' total bonus from ${fieldCard.name}: +${totalBonusFromCard}`);
                    cardsToDiscard += totalBonusFromCard;
                }
            }
        });

        // ตรวจสอบหาโบนัสจาก "ตัวเอง" (Steam-Golem)
        if (card.effects) {
            const selfAddCrushEffects = card.effects.filter(effect => 
                effect.timing === 'permanent' && 
                effect.keyword === 'add crush' && 
                effect.level.includes(cardLevel)
            );
            if (selfAddCrushEffects.length > 0) {
                const totalBonusFromSelf = selfAddCrushEffects.reduce((sum, effect) => sum + effect.count, 0);
                console.log(`[Crush] Found 'add crush' self-bonus from ${card.name}: +${totalBonusFromSelf}`);
                cardsToDiscard += totalBonusFromSelf;
            }
        }
        // --- สิ้นสุดส่วนที่แก้ไข ---
    }
    
    console.log(`[Crush] Total cards to discard: ${cardsToDiscard}`);
    const discardedCards = discardOpponentDeck(cardsToDiscard, opponentKey, gameState);

    // ตรวจสอบหาเอฟเฟกต์ Power Up ที่เชื่อมโยงกับ Crush (สำหรับ Ambrose)
    if (card.effects) {
        const powerUpEffect = card.effects.find(effect =>
            effect.keyword === 'power up' &&
            effect.triggered_by === 'crush' &&
            effect.level.includes(cardLevel)
        );

        if (powerUpEffect) {
            const discardedSpiritCount = discardedCards.filter(c => c.type === 'Spirit').length;
            if (discardedSpiritCount > 0) {
                const totalPowerUp = discardedSpiritCount * powerUpEffect.power;
                console.log(`[Ambrose Effect] Discarded ${discardedSpiritCount} Spirits, granting +${totalPowerUp} BP.`);
                applyPowerUpEffect(card.uid, totalPowerUp, powerUpEffect.duration, gameState);
            }
        }
    }
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

    const { level: cardLevel } = getSpiritLevelAndBP(card, ownerKey, gameState);
    
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