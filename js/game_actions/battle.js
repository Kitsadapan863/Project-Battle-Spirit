
// js/game_actions/battle.js
import { getSpiritLevelAndBP, calculateTotalSymbols, getCardLevel } from '../utils.js';
import { resolveTriggeredEffects } from '../effects/index.js';
import { destroyCard } from './card.js';
import { checkGameOver } from '../core/gameLoop.js';

function clearBattleBuffs(playerKey, gameState) {
    gameState[playerKey].field.forEach(spirit => {
        if (spirit.tempBuffs?.length > 0) {
            spirit.tempBuffs = spirit.tempBuffs.filter(buff => buff.duration !== 'battle');
        }
    });
}

/**
 * ประกาศโจมตี
 */
export function declareAttack(attackerUid, gameState) {
    const attacker = gameState.player.field.find(s => s.uid === attackerUid);
    if (!attacker) return;
    
    attacker.isExhausted = true;
    gameState.attackState = { isAttacking: true, attackerUid, defender: 'opponent', blockerUid: null, isClash: false };
    
    resolveTriggeredEffects(attacker, 'whenAttacks', 'player', gameState);
    enterFlashTiming(gameState, 'beforeBlock');
}

/**
 * ประกาศป้องกัน (Block)
 */
export function declareBlock(blockerUid, gameState) {
    if (!gameState.attackState.isAttacking) return;
    
    const isPlayerBlocking = gameState.player.field.some(s => s.uid === blockerUid);
    const ownerKey = isPlayerBlocking ? 'player' : 'opponent';

    const blocker = gameState[ownerKey].field.find(s => s.uid === blockerUid);
    if (blocker) {
        blocker.isExhausted = true;

        const hqNexus = gameState[ownerKey].field.find(card => 
            card.type === 'Nexus' && card.effects?.some(eff => eff.keyword === 'enable_crush_on_block')
        );

        if (hqNexus) {
            // 2. ตรวจสอบว่า Nexus อยู่ในเลเวลที่เอฟเฟกต์ทำงาน และ Spirit ที่ Block มี Crush หรือไม่
            const hqLevel = getCardLevel(hqNexus).level;
            const hqEffect = hqNexus.effects.find(eff => eff.keyword === 'enable_crush_on_block');
            const blockerHasCrush = blocker.effects?.some(eff => eff.keyword === 'crush');

            if (blockerHasCrush && hqEffect && hqEffect.level.includes(hqLevel)) {
                console.log(`[H.Q. Effect] ${blocker.name} activates Crush on block!`);
                // 3. ถ้าเงื่อนไขครบ ให้เรียกใช้เอฟเฟกต์ 'whenAttacks' ของ Blocker (เพราะ Crush คือเอฟเฟกต์ whenAttacks)
                resolveTriggeredEffects(blocker, 'whenAttacks', ownerKey, gameState);
            }
        }
        // ปัจจุบันมีแค่ Player ที่ block ได้ แต่เผื่ออนาคต
        if (ownerKey === 'player') {
             resolveTriggeredEffects(blocker, 'whenBlocks', 'player', gameState);
        }
    }

    gameState.attackState.blockerUid = blockerUid;
    enterFlashTiming(gameState, 'afterBlock');
}

/**
 * คำนวณผลการต่อสู้
 */
function resolveBattle(gameState) {
    const { attackerUid, blockerUid } = gameState.attackState;
    const attackerOwner = gameState.player.field.some(s => s.uid === attackerUid) ? 'player' : 'opponent';
    const blockerOwner = gameState.player.field.some(s => s.uid === blockerUid) ? 'player' : 'opponent';
    
    const attacker = gameState[attackerOwner].field.find(s => s.uid === attackerUid);
    const blocker = gameState[blockerOwner].field.find(s => s.uid === blockerUid);

    if (!attacker || !blocker) {
        // กรณีหาตัวใดตัวหนึ่งไม่เจอ
        gameState.attackState = { isAttacking: false, attackerUid: null, defender: null, blockerUid: null };
        return;
    }

    const attackerResult = getSpiritLevelAndBP(attacker, attackerOwner, gameState);
    const blockerResult = getSpiritLevelAndBP(blocker, blockerOwner, gameState);

    if (attackerResult.bp > blockerResult.bp) {
        resolveTriggeredEffects(attacker, 'onOpponentDestroyedInBattle', attackerOwner, gameState);
        destroyCard(blockerUid, blockerOwner, gameState);
    } else if (blockerResult.bp > attackerResult.bp) {
        destroyCard(attackerUid, attackerOwner, gameState);
    } else {
        destroyCard(attackerUid, attackerOwner, gameState);
        destroyCard(blockerUid, blockerOwner, gameState);
    }
    
    clearBattleBuffs('player', gameState);
    clearBattleBuffs('opponent', gameState);
    gameState.attackState = { isAttacking: false, attackerUid: null, defender: null, blockerUid: null };
}

/**
 * ลดไลฟ์เมื่อไม่ป้องกัน
 */
export function takeLifeDamage(gameState) {
    const { attackerUid, defender } = gameState.attackState;
    if (!attackerUid || !defender) {
        gameState.attackState = { isAttacking: false, attackerUid: null, defender: null, blockerUid: null };
        return;
    }
    const attackingPlayer = defender === 'opponent' ? 'player' : 'opponent';
    const defendingPlayer = defender;
    const attacker = gameState[attackingPlayer].field.find(s => s.uid === attackerUid);
    if (attacker) {
        const damage = calculateTotalSymbols(attacker);
        for (let i = 0; i < damage; i++) {
            if (gameState[defendingPlayer].life > 0) {
                gameState[defendingPlayer].life--;
                gameState[defendingPlayer].reserve.push({ id: `core-from-life-${defendingPlayer}-${Date.now()}-${i}` });
            }
        }
    }
    clearBattleBuffs(attackingPlayer, gameState);
    gameState.attackState = { isAttacking: false, attackerUid: null, defender: null, blockerUid: null };
    checkGameOver(gameState);
}

/**
 * เข้าสู่ช่วง Flash Timing
 */
export function enterFlashTiming(gameState, timing) {
    gameState.flashState = {
        isActive: true,
        timing: timing,
        priority: gameState.turn === 'player' ? 'opponent' : 'player',
        hasPassed: { player: false, opponent: false }
    };
}

/**
 * ผู้เล่นเลือกที่จะผ่าน (Pass) ในช่วง Flash
 */
export function passFlash(gameState) {
    if (!gameState.flashState.isActive) return null;
    const { priority, hasPassed } = gameState.flashState;
    const otherPlayer = priority === 'player' ? 'opponent' : 'player';
    if (hasPassed[otherPlayer]) {
        return resolveFlashWindow(gameState);
    }
    hasPassed[priority] = true;
    gameState.flashState.priority = otherPlayer;
    return null;
}

/**
 * จบช่วง Flash และดำเนินการต่อ
 */
export function resolveFlashWindow(gameState) {
    gameState.flashState.isActive = false;
    if (gameState.flashState.timing === 'beforeBlock') {
        if (gameState.attackState.defender === 'opponent') {
            const attacker = gameState.player.field.find(s => s.uid === gameState.attackState.attackerUid);
            const potentialBlockers = gameState.opponent.field.filter(s => !s.isExhausted && s.type === 'Spirit');
            potentialBlockers.sort((a,b) => getSpiritLevelAndBP(b, 'opponent', gameState).bp - getSpiritLevelAndBP(a, 'opponent', gameState).bp);
            const bestBlocker = potentialBlockers.length > 0 ? potentialBlockers[0] : null;
            if (gameState.attackState.isClash && bestBlocker) {
                 console.log("Clash is active! Opponent is forced to block.");
                 declareBlock(bestBlocker.uid, gameState);
            } else if (bestBlocker && getSpiritLevelAndBP(bestBlocker, 'opponent', gameState).bp >= getSpiritLevelAndBP(attacker, 'player', gameState).bp) {
                declareBlock(bestBlocker.uid, gameState);
            } else {
                takeLifeDamage(gameState);
            }
        }
        return 'waiting_for_block_or_damage';

    } else if (gameState.flashState.timing === 'afterBlock') {
        resolveBattle(gameState);
        return 'battle_resolved';
    }
    return null;
}