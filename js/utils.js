// js/utils.js

/**
 * คำนวณเลเวลปัจจุบันของการ์ด (Spirit หรือ Nexus) จากจำนวนคอร์ที่วางอยู่
 * @param {object} card - อ็อบเจกต์การ์ดที่ต้องการตรวจสอบ
 * @returns {{level: number}} - อ็อบเจกต์ที่เก็บเลเวลปัจจุบัน
 */
export function getCardLevel(card) {
    if (!card || !card.cores || !card.level) return { level: 0 };

    const currentCores = card.cores.length;
    let currentLevel = 0;
    
    // เรียงลำดับเลเวลจากสูงสุดไปต่ำสุดเพื่อให้เจอเลเวลที่ถูกต้องก่อน
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

/**
 * คำนวณเลเวลและ BP ของ Spirit โดยรวมบัฟชั่วคราวและเอฟเฟกต์จาก Nexus
 * @param {object} spiritCard - Spirit ที่ต้องการคำนวณ
 * @param {string} ownerKey - 'player' หรือ 'opponent'
 * @param {object} gameState - สถานะของเกมทั้งหมด
 * @returns {{level: number, bp: number, isBuffed: boolean}} - เลเวล, BP สุทธิ, และสถานะว่าถูกบัฟหรือไม่
 */
export function getSpiritLevelAndBP(spiritCard, ownerKey, gameState) {
    if (!spiritCard || !spiritCard.cores || !spiritCard.level) return { level: 0, bp: 0, isBuffed: false };
    
    let { level } = getCardLevel(spiritCard);
    let currentBP = 0;
    let isBuffed = false;

    // --- ตรรกะสำหรับเอฟเฟกต์พิเศษที่บังคับเลเวลสูงสุด (เช่น The Collapse of Battle Line) ---
    if (gameState?.turn === ownerKey && gameState.phase === 'attack') {
        const spiritHasCrush = spiritCard.effects?.some(e => e.keyword === 'crush');
        if (spiritHasCrush) {
            const forceMaxLevelNexus = gameState[ownerKey].field.find(card => 
                card.type === 'Nexus' && card.effects?.some(eff => 
                    eff.keyword === 'force_max_level_on_crush' && eff.level.includes(getCardLevel(card).level)
                )
            );

            if (forceMaxLevelNexus) {
                const maxLevel = Math.max(...Object.keys(spiritCard.level).map(l => parseInt(l.replace('level-', ''), 10)));
                if (level !== maxLevel) {
                    level = maxLevel;
                    isBuffed = true; // ถือว่าเป็นการบัฟชนิดหนึ่ง
                }
            }
        }
    }

    // กำหนด BP พื้นฐานตามเลเวล
    if (level > 0 && spiritCard.level[`level-${level}`]) {
        currentBP = spiritCard.level[`level-${level}`].bp || 0;
    }
    
    // --- เพิ่ม BP จากเอฟเฟกต์ถาวรของ Nexus (เช่น The Burning Canyon) ---
    if (gameState?.turn === ownerKey && gameState.phase === 'attack') {
        gameState[ownerKey].field.forEach(card => {
            if (card.type === 'Nexus' && card.effects) {
                const nexusLevel = getCardLevel(card).level;
                card.effects.forEach(eff => {
                    if (eff.timing === 'duringBattle' && eff.level.includes(nexusLevel) && eff.description.includes('+1000BP')) {
                         currentBP += 1000;
                         isBuffed = true;
                    }
                });
            }
        });
    }
    
    // --- เพิ่ม BP จากบัฟชั่วคราว (เช่น การ์ดเวทมนตร์) ---
    if (spiritCard.tempBuffs?.length > 0) {
        spiritCard.tempBuffs.forEach(buff => {
            if (buff.type === 'BP') {
                currentBP += buff.value;
                isBuffed = true;
            }
        });
    }
    
    return { level: level, bp: currentBP, isBuffed: isBuffed };
}

/**
 * คำนวณค่าร่ายสุทธิของ Spirit หรือ Magic หลังหักลดจากสัญลักษณ์บนสนาม
 * @param {object} cardToSummon - การ์ดที่ต้องการคำนวณค่าร่าย
 * @param {string} playerType - 'player' หรือ 'opponent'
 * @param {object} gameState - สถานะของเกมทั้งหมด
 * @returns {number} - ค่าร่ายสุทธิ
 */
export function calculateCost(cardToSummon, playerType, gameState) {
    const player = gameState[playerType];
    const baseCost = cardToSummon.cost;
    let totalReduction = 0;
    const fieldSymbols = { red: 0, purple: 0, green: 0, white: 0, blue: 0, yellow: 0 };

    // นับสัญลักษณ์ทั้งหมดบนสนาม
    player.field.forEach(card => {
        if (card.symbol) {
            for (const color in card.symbol) {
                if (fieldSymbols.hasOwnProperty(color)) {
                    fieldSymbols[color] += card.symbol[color];
                }
            }
        }
    });

    // คำนวณส่วนลดสูงสุดที่เป็นไปได้
    if (cardToSummon.symbol_cost) {
        let potentialReduction = 0;
        for (const color in cardToSummon.symbol_cost) {
            if (fieldSymbols.hasOwnProperty(color)) {
                potentialReduction += fieldSymbols[color];
            }
        }
        
        let maxReduction = 0;
        for (const color in cardToSummon.symbol_cost) {
            maxReduction += cardToSummon.symbol_cost[color];
        }
        
        totalReduction = Math.min(potentialReduction, maxReduction);
    }
    
    return Math.max(0, baseCost - totalReduction);
}

/**
 * คำนวณจำนวนสัญลักษณ์ทั้งหมดบนการ์ดเพื่อใช้ในการคำนวณดาเมจ
 * @param {object} spiritCard - Spirit ที่กำลังโจมตี
 * @returns {number} - จำนวนดาเมจ (อย่างน้อย 1)
 */
export function calculateTotalSymbols(spiritCard) {
    if (!spiritCard || !spiritCard.symbol) return 1;
    let total = 0;
    for (const color in spiritCard.symbol) {
        total += spiritCard.symbol[color];
    }
    return total > 0 ? total : 1;
}