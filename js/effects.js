// js/effects.js
// This file will handle the logic for resolving card effects.

import { getCardLevel } from './utils.js';

function applyCrush(card, cardLevel, opponentKey, gameState) {
    console.log(`Activating [Crush] from ${card.name}`);
    const cardsToDiscard = cardLevel;
    for (let i = 0; i < cardsToDiscard; i++) {
        if (gameState[opponentKey].deck.length > 0) {
            const discardedCard = gameState[opponentKey].deck.shift();
            gameState[opponentKey].cardTrash.push(discardedCard);
            console.log(`[Crush] discarded ${discardedCard.name} from ${opponentKey}'s deck.`);
        }
    }
}

// This is the main function that will be called to resolve effects
export function resolveTriggeredEffects(card, timing, ownerKey, gameState) {
    if (!card.effects) return;

    const cardLevel = getCardLevel(card).level;
    const opponentKey = ownerKey === 'player' ? 'opponent' : 'player';

    card.effects.forEach(effect => {
        // Check if the effect's level and timing match
        if (effect.timing === timing && effect.level.includes(cardLevel)) {
            
            // Handle keywords
            if (effect.keyword) {
                switch (effect.keyword) {
                    case 'crush':
                        applyCrush(card, cardLevel, opponentKey, gameState);
                        break;
                    // Future keywords like 'rampage' or 'armor' can be added here
                    // case 'rampage':
                    //     applyRampage(card, ownerKey, gameState);
                    //     break;
                }
            }
            
            // Handle unique, non-keyword effects here in the future
        }
    });
}