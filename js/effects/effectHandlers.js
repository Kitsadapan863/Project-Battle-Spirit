// js/effects/effectHandlers.js
import { getCardLevel } from '../utils.js';
import { initiateDeckDiscard } from '../game_actions/card.js';

/**
 * เพิ่มพลัง (BP) ให้กับ Spirit ชั่วคราว
 * @param {string} cardUid - UID ของการ์ดเป้าหมาย
 * @param {number} power - ค่า BP ที่จะเพิ่ม
 * @param {string} duration - 'turn' หรือ 'battle'
 * @param {object} gameState - สถานะเกม
 */
export function applyPowerUp(cardUid, power, duration, gameState) {
    const targetSpirit = gameState.player.field.find(s => s.uid === cardUid) || gameState.opponent.field.find(s => s.uid === cardUid);
    if (targetSpirit) {
        if (!targetSpirit.tempBuffs) {
            targetSpirit.tempBuffs = [];
        }
        targetSpirit.tempBuffs.push({ type: 'BP', value: power, duration: duration });
        console.log(`[Effect: Power Up] ${targetSpirit.name} gets +${power} BP for the ${duration}.`);
    }
}


/**
 * จัดการเอฟเฟกต์ [Crush]
 */
export function applyCrush(card, cardLevel, ownerKey, gameState) {
    const opponentKey = ownerKey === 'player' ? 'opponent' : 'player';
    let cardsToDiscard = cardLevel;

    // ตรวจสอบโบนัสจาก Nexus (เช่น The Collapse of Battle Line)
    gameState[ownerKey].field.forEach(fieldCard => {
        if (fieldCard.type === 'Nexus' && fieldCard.effects) {
            const fieldCardLevel = getCardLevel(fieldCard).level;
            fieldCard.effects.forEach(effect => {
                if (effect.keyword === 'add crush' && effect.level.includes(fieldCardLevel)) {
                    cardsToDiscard += effect.count;
                }
            });
        }
    });
    
    // ตรวจสอบโบนัสจากตัวเอง (เช่น Steam-Golem)
    // if (card.effects) {
    //     card.effects.forEach(effect => {
    //         if (effect.keyword === 'add crush' && effect.timing === 'permanent' && effect.level.includes(cardLevel)) {
    //             cardsToDiscard += effect.count;
    //         }
    //     });
    // }
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

    const discardedCards = initiateDeckDiscard(cardsToDiscard, opponentKey, gameState);

    // ตรวจสอบเอฟเฟกต์ที่ทำงานหลัง Crush (เช่น The Two-Sword Ambrose)
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
                applyPowerUp(card.uid, totalPowerUp, powerUpEffect.duration, gameState);
            }
        }
    }
    
    if (discardedCards.length > 0) {
        // วนลูปการ์ดในสนามของผู้ใช้ Crush เพื่อหา Nexus ที่เกี่ยวข้อง
        gameState[ownerKey].field.forEach(fieldCard => {
            if (fieldCard.type === 'Nexus' && fieldCard.effects) {
                const fieldCardLevel = getCardLevel(fieldCard).level;
                const coreOnCrushEffect = fieldCard.effects.find(eff => 
                    eff.keyword === 'core_on_crush' && eff.level.includes(fieldCardLevel)
                );

                if (coreOnCrushEffect) {
                    console.log(`[H.Q. LV2 Effect] Gained ${coreOnCrushEffect.count} core from Crush effect.`);
                    // เพิ่มคอร์ตามจำนวนที่เอฟเฟกต์กำหนด (ในที่นี้คือ 1)
                    for (let i = 0; i < coreOnCrushEffect.count; i++) {
                        gameState[ownerKey].reserve.push({ id: `core-from-hq-${Date.now()}-${i}` });
                    }
                }
            }
        });
    }
}

/**
 * จัดการเอฟเฟกต์ [Clash]
 */
export function applyClash(card, gameState) {
    console.log(`[Effect: Clash] activated by ${card.name}. Opponent must block.`);
    if (gameState.attackState.isAttacking) {
        gameState.attackState.isClash = true;
    }
}

/**
 * จัดการเอฟเฟกต์ Discard จากเด็คคู่ต่อสู้ (ที่ไม่ได้มาจาก Crush)
 */
export function applyDiscard(card, effect, ownerKey, gameState) {
    const opponentKey = ownerKey === 'player' ? 'opponent' : 'player';
    let cardsToDiscard = 0;

    if (effect.count) {
        // กรณีระบุจำนวนตายตัว (The GiantHero Titus)
        cardsToDiscard = effect.count;
    } else {
        // กรณีขึ้นอยู่กับเงื่อนไขอื่น (The MobileFortress Castle-Golem)
        if (effect.timing === 'whenSummoned') {
            const nexusCount = gameState[ownerKey].field.filter(c => c.type === 'Nexus').length;
            cardsToDiscard = Math.min(nexusCount * 5, 15);
        } else if (effect.timing === 'whenAttacks') {
            let blueSymbolCount = 0;
            gameState[ownerKey].field.forEach(c => {
                if (c.symbol?.blue) {
                    blueSymbolCount += c.symbol.blue;
                }
            });
            cardsToDiscard = blueSymbolCount;
        }
    }

    if (cardsToDiscard > 0) {
        initiateDeckDiscard(cardsToDiscard, opponentKey, gameState);
    }
}