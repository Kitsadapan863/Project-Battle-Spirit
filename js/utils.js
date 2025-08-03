// js/utils.js

// ... (getCardLevel function is the same) ...
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


// FIXED: Function now includes temporary BP buffs in calculation
export function getSpiritLevelAndBP(spiritCard, ownerKey, gameState) {
    if (!spiritCard || !spiritCard.cores || !spiritCard.level) return { level: 0, bp: 0, isBuffed: false };
    
    const { level } = getCardLevel(spiritCard);
    let currentBP = 0;
    let isBuffed = false;

    if (level > 0 && spiritCard.level[`level-${level}`]) {
        currentBP = spiritCard.level[`level-${level}`].bp || 0;
    }
    
    // Apply permanent Nexus effects
    if (gameState && ownerKey) {
        const owner = gameState[ownerKey];
        if (gameState.turn === ownerKey && gameState.phase === 'attack') {
            owner.field.forEach(card => {
                if (card.id === 'nexus-burning-canyon') {
                    const nexusLevel = getCardLevel(card).level;
                    if (nexusLevel >= 2) {
                        currentBP += 1000;
                        isBuffed = true;
                    }
                }
            });
        }
    }
    
    // Apply temporary buffs from Magic, etc.
    if (spiritCard.tempBuffs && spiritCard.tempBuffs.length > 0) {
        spiritCard.tempBuffs.forEach(buff => {
            if (buff.type === 'BP') {
                currentBP += buff.value;
                isBuffed = true;
            }
        });
    }
    
    return { level: level, bp: currentBP, isBuffed: isBuffed };
}