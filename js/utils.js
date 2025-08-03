// js/utils.js

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

// *** START: อัปเกรดฟังก์ชัน getSpiritLevelAndBP ***
export function getSpiritLevelAndBP(spiritCard, ownerKey, gameState) {
    if (!spiritCard || !spiritCard.cores || !spiritCard.level) return { level: 0, bp: 0, isBuffed: false };
    
    let { level } = getCardLevel(spiritCard);
    let currentBP = 0;
    let isBuffed = false;

    // --- ตรรกะใหม่สำหรับ The Collapse of Battle Line ---
    if (gameState && ownerKey) {
        const owner = gameState[ownerKey];
        // ตรวจสอบว่าอยู่ในเทิร์นและเฟสที่ถูกต้องหรือไม่
        if (gameState.turn === ownerKey && gameState.phase === 'attack') {
            // ตรวจสอบว่า Spirit ที่กำลังคำนวณอยู่มี Crush หรือไม่
            const spiritHasCrush = spiritCard.effects && spiritCard.effects.some(e => e.keyword === 'crush');
            
            if (spiritHasCrush) {
                // ค้นหา Nexus ที่มีเอฟเฟกต์ force_max_level_on_crush บนสนาม
                const forceMaxLevelNexus = owner.field.find(card => 
                    card.type === 'Nexus' && 
                    card.effects && 
                    card.effects.some(eff => 
                        eff.keyword === 'force_max_level_on_crush' &&
                        eff.level.includes(getCardLevel(card).level)
                    )
                );

                if (forceMaxLevelNexus) {
                    // ถ้าเจอ ให้บังคับเป็นเลเวลสูงสุด
                    const maxLevel = Math.max(...Object.keys(spiritCard.level).map(l => parseInt(l.replace('level-', ''), 10)));
                    if (level !== maxLevel) {
                        console.log(`[Battle Line Effect] Forcing ${spiritCard.name} to its max level: ${maxLevel}`);
                        level = maxLevel;
                        isBuffed = true;
                    }
                }
            }
        }
    }
    // --- สิ้นสุดตรรกะใหม่ ---

    if (level > 0 && spiritCard.level[`level-${level}`]) {
        currentBP = spiritCard.level[`level-${level}`].bp || 0;
    }
    
    // Apply permanent Nexus effects (เช่น Burning Canyon)
    if (gameState && ownerKey) {
        const owner = gameState[ownerKey];
        if (gameState.turn === ownerKey && gameState.phase === 'attack') {
            owner.field.forEach(card => {
                if (card.effects) {
                    const nexusLevel = getCardLevel(card).level;
                    card.effects.forEach(eff => {
                        // เพิ่ม BP จากเอฟเฟกต์อื่นๆ ที่ไม่ใช่ force max level
                        if (eff.timing === 'duringBattle' && eff.level.includes(nexusLevel) && eff.description.includes('+1000BP')) {
                             currentBP += 1000;
                             isBuffed = true;
                        }
                    });
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
// *** END: อัปเกรดฟังก์ชัน getSpiritLevelAndBP ***