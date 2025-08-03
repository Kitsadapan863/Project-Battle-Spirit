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

function applyCrush(card, cardLevel, opponentKey, gameState) {
    console.log(`Activating [Crush] from ${card.name}`);
    const cardsToDiscard = cardLevel;
    discardOpponentDeck(cardsToDiscard, opponentKey, gameState);
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
        if (effect.timing === timing && effect.level.includes(cardLevel)) {
            if (effect.keyword) {
                switch (effect.keyword) {
                    case 'crush':
                        applyCrush(card, cardLevel, opponentKey, gameState);
                        break;
                    case 'clash':
                        applyClash(card, ownerKey, gameState)
                        break;
                    case 'power up':
                        if (timing === 'whenAttacks') {
                           applyPowerUpEffect(card.uid, effect.power, effect.duration, gameState);
                        }
                        break;
                    
                    // *** START: แก้ไข case 'discard' ให้รองรับ Titus ***
                    case 'discard':
                        if (effect.count) {
                            // สำหรับเอฟเฟกต์ที่มีการระบุจำนวนตายตัว เช่น Titus
                            discardOpponentDeck(effect.count, opponentKey, gameState);
                        } else if (timing === 'whenSummoned') {
                            // สำหรับ Castle-Golem (When Summoned)
                            const nexusCount = gameState[ownerKey].field.filter(c => c.type === 'Nexus').length;
                            const cardsToDiscard = Math.min(nexusCount * 5, 15);
                            discardOpponentDeck(cardsToDiscard, opponentKey, gameState);
                        } else if (timing === 'whenAttacks') {
                            // สำหรับ Castle-Golem (When Attacks)
                            let blueSymbolCount = 0;
                            gameState[ownerKey].field.forEach(c => {
                                if (c.symbol && c.symbol.blue) {
                                    blueSymbolCount += c.symbol.blue;
                                }
                            });
                            discardOpponentDeck(blueSymbolCount, opponentKey, gameState);
                        }
                        break;
                    // *** END: แก้ไข case 'discard' ***
                }
            }
        }
    });
}