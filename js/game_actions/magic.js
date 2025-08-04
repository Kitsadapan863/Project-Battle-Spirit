// js/game_actions/magic.js
import { calculateCost } from '../utils.js';
import { resolveTriggeredEffects } from '../effects/index.js'; // อาจจะต้องสร้างไฟล์นี้
// ---- START: แก้ไข/เพิ่ม import ----
import { drawCard, discardOpponentDeck, initiateDiscard, moveUsedMagicToTrash, destroyCards, applyPowerUpEffect  } from './card.js';
// ---- END: แก้ไข/เพิ่ม import ----

// ---- START: เพิ่ม Helper Functions ----
function setupTargetingState(effect, onCompleteCallback, gameState) {
    gameState.targetingState = {
        isTargeting: true,
        forEffect: effect,
        onTarget: onCompleteCallback,
    };
}

function findValidTargets(targetInfo, gameState) {
    let potentialTargets = [];
    if (targetInfo.scope === 'opponent' || targetInfo.scope === 'any') {
        potentialTargets.push(...gameState.opponent.field);
    }
    if (targetInfo.scope === 'player' || targetInfo.scope === 'any') {
        potentialTargets.push(...gameState.player.field);
    }

    return potentialTargets.filter(card => {
        const cardOwnerKey = gameState.player.field.some(c => c.uid === card.uid) ? 'player' : 'opponent';
        return (targetInfo.scope === 'any' || targetInfo.scope === cardOwnerKey) &&
               card.type.toLowerCase() === 'spirit' && // Assuming target type is always spirit for now
               (!targetInfo.bpOrLess || getSpiritLevelAndBP(card, cardOwnerKey, gameState).bp <= targetInfo.bpOrLess);
    });
}

function fizzleMagic(cardUid, gameState) {
    console.log("Effect fizzled, not enough valid targets.");
    moveUsedMagicToTrash(cardUid, gameState);
}
/**
 * เริ่มกระบวนการใช้เวทมนตร์
 */
export function initiateMagicPayment(cardUid, timing, effectToUse, gameState) {
    const cardToUse = gameState.player.hand.find(c => c.uid === cardUid);
    if (!cardToUse) return;
    const effect = effectToUse || cardToUse.effects.find(e => e.timing === timing);
    if (!effect) return;
    const isFlashTiming = gameState.flashState.isActive && gameState.flashState.priority === 'player';
    const isMainStep = gameState.phase === 'main';
    if (timing === 'flash' && !isFlashTiming && !isMainStep) return;
    if (timing === 'main' && !isMainStep) return;
    const finalCost = calculateCost(cardToUse, 'player', gameState);
    const totalAvailableCores = gameState.player.reserve.length + gameState.player.field.reduce((sum, card) => sum + (card.cores ? card.cores.length : 0), 0);
    if (totalAvailableCores < finalCost) {
        console.log("Not enough available cores to use magic.");
        return;
    }
    gameState.magicPaymentState = {
        isPaying: true,
        cardToUse: cardToUse,
        costToPay: finalCost,
        selectedCores: [],
        timing: timing,
        effectToUse: effect
    };
}

/**
 * ยืนยันการจ่ายค่าร่ายและใช้เวทมนตร์
 */
export function confirmMagicPayment(gameState) {
    const { isPaying, cardToUse, costToPay, selectedCores, timing, effectToUse } = gameState.magicPaymentState;
    if (!isPaying || selectedCores.length < costToPay) return false;

    for (const coreInfo of selectedCores) {
        let sourceArray;
        if (coreInfo.from === 'reserve') {
            sourceArray = gameState.player.reserve;
        } else {
            const sourceCard = gameState.player.field.find(s => s.uid === coreInfo.spiritUid);
            sourceArray = sourceCard ? sourceCard.cores : undefined;
        }
        if (sourceArray) {
            const coreIndex = sourceArray.findIndex(c => c.id === coreInfo.coreId);
            if (coreIndex > -1) {
                const [paidCore] = sourceArray.splice(coreIndex, 1);
                gameState.player.costTrash.push(paidCore);
            }
        }
    }
    
    gameState.magicPaymentState = { isPaying: false, cardToUse: null, costToPay: 0, selectedCores: [], timing: null, effectToUse: null };
    
    if (effectToUse) {
        switch (effectToUse.keyword) {
            case 'deploy_from_trash':
                const nexusesToDeploy = [];
                const remainingTrash = [];

                // ค้นหา Nexus สีที่ถูกต้องในกองทิ้ง
                gameState.player.cardTrash.forEach(card => {
                    if (card.type === 'Nexus' && effectToUse.targetColors.includes(card.color)) {
                        nexusesToDeploy.push(card);
                    } else {
                        remainingTrash.push(card);
                    }
                });

                if (nexusesToDeploy.length > 0) {
                    console.log(`[Construction Effect] Deploying ${nexusesToDeploy.length} Nexuses from Trash.`);
                    // นำ Nexus ที่พบไปวางบนสนาม
                    gameState.player.field.push(...nexusesToDeploy);
                    // อัปเดตกองทิ้งโดยลบ Nexus ที่นำไปวางบนสนามออก
                    gameState.player.cardTrash = remainingTrash;
                }

                moveUsedMagicToTrash(cardToUse.uid, gameState);
                break;
            case 'core charge':
                if (effectToUse.buff_type) {
                    gameState.player.tempBuffs.push({ type: effectToUse.buff_type });
                    console.log(`[Magic Effect] Applied turn-wide buff: ${effectToUse.buff_type}`);
                }
                moveUsedMagicToTrash(cardToUse.uid, gameState);
                break;
            case 'draw':
                // 1. จั่วการ์ดตามจำนวนที่กำหนด
                for (let i = 0; i < effectToUse.quantity; i++) {
                    drawCard('player', gameState);
                }
                
                // 2. ตรวจสอบว่าต้องมีการทิ้งการ์ดต่อหรือไม่
                if (effectToUse.discard && effectToUse.discard > 0) {
                    initiateDiscard(effectToUse.discard, gameState);
                }

                // 3. ย้ายการ์ดเวทมนตร์ที่ใช้แล้วลงแทรช
                moveUsedMagicToTrash(cardToUse.uid, gameState);
                break;
            
            // *** START: เพิ่ม case 'discard' สำหรับ Magic Hammer ***
            case 'discard':
                if (effectToUse.quantity) {
                    discardOpponentDeck(effectToUse.quantity, 'opponent', gameState);
                }
                moveUsedMagicToTrash(cardToUse.uid, gameState);
                break;
            // *** END: เพิ่ม case 'discard' ***
            case 'power up':
                const validPowerUpTargets = findValidTargets(effectToUse.target, gameState);
                if (validPowerUpTargets.length > 0) {
                    setupTargetingState(effectToUse, (selectedUid) => {
                        applyPowerUpEffect(selectedUid, effectToUse.power, effectToUse.duration, gameState);
                        moveUsedMagicToTrash(cardToUse.uid, gameState);
                        gameState.targetingState = { isTargeting: false };
                    }, gameState);
                } else {
                    fizzleMagic(cardToUse.uid, gameState);
                }
                break;

            case 'destroy':
                const validDestroyTargets = findValidTargets(effectToUse.target, gameState);
                if (validDestroyTargets.length >= effectToUse.target.count) {
                    setupTargetingState(effectToUse, (selectedUid) => {
                        destroyCards([selectedUid], gameState);
                        moveUsedMagicToTrash(cardToUse.uid, gameState);
                        gameState.targetingState = { isTargeting: false };
                    }, gameState);
                } else {
                    fizzleMagic(cardToUse.uid, gameState);
                }
                break;

            case 'destroy_combo':
                const spiritTargetInfo = effectToUse.target.spirit;
                const validSpiritTargets = findValidTargets(spiritTargetInfo, gameState);

                if (validSpiritTargets.length > 0) {
                    const onSpiritTargeted = (selectedSpiritUid) => {
                        destroyCards([selectedSpiritUid], gameState);
                        
                        const nexusTargetInfo = effectToUse.target.nexus;
                        const validNexusTargets = findValidTargets(nexusTargetInfo, gameState);

                        if (validNexusTargets.length > 0) {
                            const onNexusTargeted = (selectedNexusUid) => {
                                destroyCards([selectedNexusUid], gameState);
                                moveUsedMagicToTrash(cardToUse.uid, gameState);
                                gameState.targetingState = { isTargeting: false };
                            };
                            setupTargetingState({ ...effectToUse, target: nexusTargetInfo }, onNexusTargeted, gameState);
                        } else {
                            moveUsedMagicToTrash(cardToUse.uid, gameState);
                            gameState.targetingState = { isTargeting: false };
                        }
                    };
                    setupTargetingState({ ...effectToUse, target: spiritTargetInfo }, onSpiritTargeted, gameState);
                } else {
                    fizzleMagic(cardToUse.uid, gameState);
                }
                break;
            
            default:
                moveUsedMagicToTrash(cardToUse.uid, gameState);
                break;
        }
    } else {
        moveUsedMagicToTrash(cardToUse.uid, gameState);
    }

    if (timing === 'flash') {
        gameState.flashState.hasPassed = { player: false, opponent: false };
        gameState.flashState.priority = 'opponent';
    }

    return true;
}


/**
 * ยกเลิกการใช้เวทมนตร์
 */
export function cancelMagicPayment(gameState) {
    if (!gameState.magicPaymentState.isPaying) return;
    gameState.magicPaymentState = { isPaying: false, cardToUse: null, costToPay: 0, selectedCores: [], timing: null };
}