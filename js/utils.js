// js/utils.js
// หน้าที่: เก็บฟังก์ชันกลางที่ใช้ร่วมกันในหลายไฟล์
// NEW: A generic function to get the level of any card with cores
export function getCardLevel(card) {
    if (!card || !card.cores || !card.level) return { level: 0 };
    const currentCores = card.cores.length;
    let currentLevel = 0;
    
    // Get level definitions and sort them from highest core requirement to lowest
    const levels = Object.keys(card.level)
        .map(key => ({ name: key, ...card.level[key] }))
        .sort((a, b) => b.core - a.core);

    for (const levelInfo of levels) {
        // Find the first level requirement that is met
        if (currentCores >= levelInfo.core) {
            currentLevel = parseInt(levelInfo.name.replace('level-', ''), 10);
            break; 
        }
    }
    return { level: currentLevel };
}


// FIXED: Simplified to use the new getCardLevel function
export function getSpiritLevelAndBP(spiritCard) {
    if (!spiritCard || !spiritCard.cores || !spiritCard.level) return { level: 0, bp: 0 };
    
    const { level } = getCardLevel(spiritCard);
    let currentBP = 0;

    // If a valid level is found, get the corresponding BP
    if (level > 0 && spiritCard.level[`level-${level}`]) {
        currentBP = spiritCard.level[`level-${level}`].bp || 0;
    }
    
    return { level: level, bp: currentBP };
}