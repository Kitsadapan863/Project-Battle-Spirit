// js/effects.js
import { getCardLevel } from './utils.js';
// *** START: แก้ไขการ import ***
import { applyPowerUpEffect, discardOpponentDeck } from './actions.js';
// *** END: แก้ไขการ import ***

function applyCrush(card, cardLevel, ownerKey, gameState) {
    const opponentKey = ownerKey === 'player' ? 'opponent' : 'player';
    
    let cardsToDiscard = cardLevel;
    console.log(`[Crush] Base discard from ${card.name} LV${cardLevel}: ${cardsToDiscard}`);

    if (card.effects) {
        const addCrushEffects = card.effects.filter(effect => 
            effect.timing === 'permanent' && 
            effect.keyword === 'add crush' && 
            effect.level.includes(cardLevel)
        );

        if (addCrushEffects.length > 0) {
            const highestBonus = Math.max(...addCrushEffects.map(e => e.count));
            console.log(`[Crush] Found 'add crush' bonus from itself (${card.name}): +${highestBonus}`);
            cardsToDiscard += highestBonus;
        }
    }

    console.log(`[Crush] Total cards to discard: ${cardsToDiscard}`);
    const discardedCards = discardOpponentDeck(cardsToDiscard, opponentKey, gameState);

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