// js/utils.js

// A generic function to get the level of any card with cores
export function getCardLevel(card) {
    if (!card || !card.cores || !card.level) return { level: 0 };
    const currentCores = card.cores.length;
    let currentLevel = 0;
    
    const levels = Object.keys(card.level)
        .map(key => ({ name: key, ...card.level[key] }))
        .sort((a, b) => b.core - a.core);

    for (const levelInfo of levels) {
        if (currentCores >= levelInfo.core) {
            currentLevel = parseInt(levelInfo.name.replace('level-', ''), 10);
            break; 
        }
    }
    return { level: currentLevel };
}


// FIXED: Function now accepts gameState to check for global effects like Nexus buffs
export function getSpiritLevelAndBP(spiritCard, ownerKey, gameState) {
    if (!spiritCard || !spiritCard.cores || !spiritCard.level) return { level: 0, bp: 0 };
    
    const { level } = getCardLevel(spiritCard);
    let currentBP = 0;

    if (level > 0 && spiritCard.level[`level-${level}`]) {
        currentBP = spiritCard.level[`level-${level}`].bp || 0;
    }
    
    // --- START: Apply Nexus Effects ---
    if (gameState && ownerKey) {
        const owner = gameState[ownerKey];
        // Check for "The Burning Canyon" effect
        if (gameState.turn === ownerKey && gameState.phase === 'attack') {
            owner.field.forEach(card => {
                if (card.id === 'nexus-burning-canyon') {
                    const nexusLevel = getCardLevel(card).level;
                    if (nexusLevel >= 2) {
                        currentBP += 1000; // Add 1000 BP
                    }
                }
            });
        }
    }
    // --- END: Apply Nexus Effects ---
    
    return { level: level, bp: currentBP };
}