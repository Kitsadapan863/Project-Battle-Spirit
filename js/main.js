// js/main.js
import { playerCards, opponentCards } from './cards.js';
import { 
    updateUI, phaseBtn, restartBtn, cancelSummonBtn, confirmSummonBtn, confirmPlacementBtn, gameOverModal, takeDamageBtn, 
    playerHandContainer, playerFieldElement, playerReserveCoreContainer, passFlashBtn, confirmMagicBtn, cancelMagicBtn, 
    cardTrashModal, closeTrashViewerBtn, playerCardTrashZone, opponentCardTrashZone, opponentCardTrashModal, 
    closeOpponentTrashViewerBtn, confirmDiscardBtn, confirmCoreRemovalBtn, cancelCoreRemovalBtn, cancelEffectChoiceBtn,
    opponentHandContainer, opponentFieldElement, cardTrashViewerContainer, opponentCardTrashViewerContainer 
} from './ui.js';
import { getSpiritLevelAndBP, getCardLevel } from './utils.js';
import { summonSpiritAI, drawCard, calculateCost, checkGameOver, cancelSummon, confirmSummon, confirmPlacement, performRefreshStep, takeLifeDamage, declareBlock, initiateSummon, selectCoreForPlacement, selectCoreForPayment, handleSpiritClick, enterFlashTiming, passFlash, initiateMagicPayment, confirmMagicPayment, cancelMagicPayment, initiateDiscard, selectCardForDiscard, confirmDiscard, confirmCoreRemoval, cancelCoreRemoval, clearTemporaryBuffs } from './actions.js';
import {resolveTriggeredEffects} from './effects.js'

let gameState;

const callbacks = {
    onInitiateSummon: (cardUid) => {
        initiateSummon(cardUid, gameState);
        updateUI(gameState, callbacks);
    },
    onSpiritClick: (cardData) => {
        if (handleSpiritClick(cardData, gameState)) {
            updateUI(gameState, callbacks);
        }
    },
    onSelectCoreForPayment: (coreId, from, spiritUid) => {
        selectCoreForPayment(coreId, from, spiritUid, gameState);
        updateUI(gameState, callbacks);
    },
    onSelectCoreForPlacement: (coreId, from, spiritUid) => {
        selectCoreForPlacement(coreId, from, spiritUid, gameState);
        updateUI(gameState, callbacks);
    },
    onUseMagic: (cardUid, timing, effectToUse) => {
        initiateMagicPayment(cardUid, timing, effectToUse, gameState);
        updateUI(gameState, callbacks);
    },
    onSelectCardForDiscard: (cardUid) => {
        selectCardForDiscard(cardUid, gameState);
        updateUI(gameState, callbacks);
    }
};

// --- Card Detail Viewer Logic ---
const cardDetailViewer = document.getElementById('card-detail-viewer');
const detailCardImage = document.getElementById('detail-card-image');
const detailCardEffects = document.getElementById('detail-card-effects');

function formatEffectText(card) {
    if (!card.effects || card.effects.length === 0) {
        return '';
    }
    return card.effects.map(effect => {
        const timingText = effect.timing.charAt(0).toUpperCase() + effect.timing.slice(1);
        const timing = `<strong>[${timingText}]</strong>`;
        const description = effect.description.replace(/\\n/g, '<br>');
        return `${timing}<br>${description}`;
    }).join('<br><br>');
}

function showCardDetails(cardId) {
    const allPlayerCards = [...gameState.player.hand, ...gameState.player.field, ...gameState.player.cardTrash];
    const allOpponentCards = [...gameState.opponent.hand, ...gameState.opponent.field, ...gameState.opponent.cardTrash];
    const cardData = allPlayerCards.find(c => c.uid === cardId) || allOpponentCards.find(c => c.uid === cardId);

    if (cardData) {
        detailCardImage.src = cardData.image;
        detailCardEffects.innerHTML = formatEffectText(cardData);
        cardDetailViewer.classList.add('visible');
    }
}

function hideCardDetails() {
    cardDetailViewer.classList.remove('visible');
}

function delegateHover(event) {
    const cardEl = event.target.closest('.card');
    if (cardEl) {
        const isOpponentHandCard = cardEl.closest('#opponent-hand');
        if (!isOpponentHandCard) {
            showCardDetails(cardEl.id);
        }
    }
}

function delegateMouseOut(event) {
    const cardEl = event.target.closest('.card');
    if (cardEl) {
        hideCardDetails();
    }
}
// --- จบส่วน Card Detail Viewer Logic ---


function advancePhase() {
    if (gameState.turn !== 'player' || gameState.summoningState.isSummoning || gameState.placementState.isPlacing || gameState.attackState.isAttacking || gameState.flashState.isActive || gameState.discardState.isDiscarding || gameState.targetingState.isTargeting) return;

    if (gameState.phase === 'attack' && !gameState.attackState.isAttacking) {
        endTurn();
    } else {
        switch (gameState.phase) {
            case 'main':
                if (gameState.gameTurn === 1) endTurn();
                else gameState.phase = 'attack';
                break;
            case 'attack':
                endTurn();
                break;
            default:
                endTurn();
                break;
        }
    }
    updateUI(gameState, callbacks);
}

function startPlayerTurn() {
    gameState.phase = 'start';
    updateUI(gameState, callbacks);
    setTimeout(() => {
        gameState.phase = 'core';
        if (gameState.gameTurn > 1) {
            gameState.player.reserve.push({ id: `core-plr-${Date.now()}` });
        }
        updateUI(gameState, callbacks);
    }, 500);
    setTimeout(() => {
        gameState.phase = 'draw';
        
        let extraDraws = 0;
        gameState.player.field.forEach(card => {
            if (card.effects) {
                card.effects.forEach(effect => {
                    const cardLevel = getCardLevel(card).level;
                    if (effect.timing === 'onDrawStep' && effect.level.includes(cardLevel)) {
                        extraDraws++;
                    }
                });
            }
        });

        drawCard('player', gameState);
        if (gameState.gameover) {
            updateUI(gameState, callbacks);
            return; 
        }

        for(let i = 0; i < extraDraws; i++) {
            drawCard('player', gameState);
            if (gameState.gameover) {
                updateUI(gameState, callbacks);
                return;
            }
        }

        if (extraDraws > 0) {
            initiateDiscard(extraDraws, gameState);
        }
        
        updateUI(gameState, callbacks);

        if (!gameState.discardState.isDiscarding) {
            setTimeout(proceedToRefresh, 500);
        }
    }, 1000);
}

function proceedToRefresh() {
    setTimeout(() => {
        gameState.phase = 'refresh';
        performRefreshStep('player', gameState);
        updateUI(gameState, callbacks);
    }, 500);
    setTimeout(() => {
        gameState.phase = 'main';
        updateUI(gameState, callbacks);
    }, 1000);
}

function runAiTurn() {
    gameState.phase = 'start';
    updateUI(gameState, callbacks);
    setTimeout(() => {
        gameState.phase = 'core';
        gameState.opponent.reserve.push({ id: `core-opp-${Date.now()}` });
        updateUI(gameState, callbacks);
    }, 500);
    setTimeout(() => {
        gameState.phase = 'draw';
        drawCard('opponent', gameState);
        if (gameState.gameover) {
            updateUI(gameState, callbacks);
            return;
        }
        updateUI(gameState, callbacks);
    }, 1000);
    setTimeout(() => {
        gameState.phase = 'refresh';
        performRefreshStep('opponent', gameState);
        updateUI(gameState, callbacks);
    }, 1500);
    setTimeout(() => {
        gameState.phase = 'main';
        const summonableCards = gameState.opponent.hand.filter(card => card.type === 'Spirit' && (calculateCost(card, 'opponent', gameState) + 1) <= gameState.opponent.reserve.length).sort((a, b) => b.cost - a.cost);
        if (summonableCards.length > 0) {
            if (summonSpiritAI('opponent', summonableCards[0].uid, gameState)) {
                 updateUI(gameState, callbacks);
            }
        }
        setTimeout(() => aiAttackStep(true), 1000);
    }, 2000);
}


function aiAttackStep(isNewAttackDeclaration) {
    if (gameState.gameover) return;
    gameState.phase = 'attack';
    
    if (isNewAttackDeclaration) {
        const attackers = gameState.opponent.field.filter(s => s.type === 'Spirit' && !s.isExhausted);
        
        if (attackers.length > 1) { 
            attackers.sort((a, b) => getSpiritLevelAndBP(b, 'opponent', gameState).bp - getSpiritLevelAndBP(a, 'opponent', gameState).bp);
            const attacker = attackers[0];
            
            attacker.isExhausted = true;
            
            gameState.attackState = { isAttacking: true, attackerUid: attacker.uid, defender: 'player', blockerUid: null, isClash: false };
            
            resolveTriggeredEffects(attacker, 'whenAttacks', 'opponent', gameState);

            enterFlashTiming(gameState, 'beforeBlock');
            updateUI(gameState, callbacks);
        } else {
            setTimeout(endAiTurn, 500);
        }
    } else {
        updateUI(gameState, callbacks);
    }
}


function endAiTurn() {
    if (gameState.gameover) return;
    gameState.phase = 'end';
    clearTemporaryBuffs('opponent', gameState);
    clearTemporaryBuffs('player', gameState);
    updateUI(gameState, callbacks);
    setTimeout(() => {
        gameState.turn = 'player';
        gameState.gameTurn++;
        startPlayerTurn();
    }, 500);
}

function endTurn() {
    gameState.phase = 'end';
    clearTemporaryBuffs('player', gameState);
    clearTemporaryBuffs('opponent', gameState);
    
    gameState.turn = 'opponent';
    gameState.gameTurn++;
    
    updateUI(gameState, callbacks);
    
    setTimeout(() => {
        runAiTurn();
    }, 1000);
}

function initializeGame() {
    let uniqueIdCounter = 0;
    
    const createPlayerDeck = () => JSON.parse(JSON.stringify(playerCards))
        .filter(Boolean)
        .map(c => ({...c, uid: `card-${uniqueIdCounter++}`, cores: [], isExhausted: false, tempBuffs: [] }))
        .sort(() => Math.random() - 0.5);
        
    const createOpponentDeck = () => JSON.parse(JSON.stringify(opponentCards))
        .filter(Boolean)
        .map(c => ({...c, uid: `card-${uniqueIdCounter++}`, cores: [], isExhausted: false, tempBuffs: [] }))
        .sort(() => Math.random() - 0.5);
    
    gameState = {
        turn: 'player', 
        gameTurn: 1, 
        gameover: false, 
        phase: 'start',
        summoningState: { isSummoning: false, cardToSummon: null, costToPay: 0, selectedCores: [] },
        placementState: { isPlacing: false, targetSpiritUid: null },
        attackState: { isAttacking: false, attackerUid: null, defender: null, blockerUid: null, isClash: false },
        flashState: { isActive: false, timing: null, priority: 'player', hasPassed: { player: false, opponent: false } },
        magicPaymentState: { isPaying: false, cardToUse: null, costToPay: 0, selectedCores: [], timing: null, effectToUse: null },
        discardState: { isDiscarding: false, count: 0, cardToDiscard: null },
        coreRemovalConfirmationState: { isConfirming: false, coreId: null, from: null, sourceUid: null },
        targetingState: { isTargeting: false, forEffect: null, onTarget: null },
        effectChoiceState: { isChoosing: false, card: null },
        player: { life: 5, deck: createPlayerDeck(), hand: [], field: [], reserve: [], costTrash: [], cardTrash: [], tempBuffs: [] }, // เพิ่ม tempBuffs
        opponent: { life: 5, deck: createOpponentDeck(), hand: [], field: [], reserve: [], costTrash: [], cardTrash: [], tempBuffs: [] } // เพิ่ม tempBuffs
    };

    for (let i = 0; i < 4; i++) {
        drawCard('player', gameState);
        drawCard('opponent', gameState);
    }
    for (let i = 0; i < 10; i++) {
        gameState.player.reserve.push({ id: `core-plr-init-${i}` });
        gameState.opponent.reserve.push({ id: `core-opp-init-${i}` });
    }

    const hoverAreas = [
        playerHandContainer, 
        playerFieldElement, 
        opponentFieldElement, 
        opponentHandContainer,
        cardTrashViewerContainer,
        opponentCardTrashViewerContainer
    ];
    hoverAreas.forEach(area => {
        if (area) {
            area.addEventListener('mouseover', delegateHover);
            area.addEventListener('mouseout', delegateMouseOut);
        }
    });

    gameOverModal.classList.remove('visible');
    startPlayerTurn();
}

phaseBtn.addEventListener('click', advancePhase);
restartBtn.addEventListener('click', initializeGame);

cancelSummonBtn.addEventListener('click', () => {
    cancelSummon(gameState);
    updateUI(gameState, callbacks);
});
confirmSummonBtn.addEventListener('click', () => {
    if (confirmSummon(gameState)) {
        updateUI(gameState, callbacks);
    }
});
confirmPlacementBtn.addEventListener('click', () => {
    confirmPlacement(gameState);
    updateUI(gameState, callbacks);
});
takeDamageBtn.addEventListener('click', () => {
    takeLifeDamage(gameState);
    updateUI(gameState, callbacks);
    setTimeout(() => aiAttackStep(true), 500);
});
playerCardTrashZone.addEventListener('click', () => {
    cardTrashModal.classList.add('visible');
});
opponentCardTrashZone.addEventListener('click', () => { 
    opponentCardTrashModal.classList.add('visible');
});
closeOpponentTrashViewerBtn.addEventListener('click', () => {
    opponentCardTrashModal.classList.remove('visible');
});
closeTrashViewerBtn.addEventListener('click', () => {
    cardTrashModal.classList.remove('visible');
});

passFlashBtn.addEventListener('click', () => {
    const resolutionStatus = passFlash(gameState);
    updateUI(gameState, callbacks);

    if (!gameState.flashState.isActive) {
        if (resolutionStatus === 'battle_resolved' && gameState.turn === 'opponent') {
            setTimeout(() => aiAttackStep(true), 500);
        }
        return;
    }

    if (gameState.flashState.priority === 'opponent') {
        setTimeout(() => {
            const finalResolutionStatus = passFlash(gameState);
            updateUI(gameState, callbacks);
            if (!gameState.flashState.isActive) {
                if (finalResolutionStatus === 'battle_resolved' && gameState.turn === 'opponent') {
                    setTimeout(() => aiAttackStep(true), 500);
                }
            }
        }, 500);
    }
});

cancelMagicBtn.addEventListener('click', () => {
    cancelMagicPayment(gameState);
    updateUI(gameState, callbacks);
});
confirmMagicBtn.addEventListener('click', () => {
    if (confirmMagicPayment(gameState)) {
        updateUI(gameState, callbacks);
        
        if (gameState.flashState.isActive) {
            setTimeout(() => {
                const resolutionStatus = passFlash(gameState);
                updateUI(gameState, callbacks);
                if (!gameState.flashState.isActive) {
                     if (resolutionStatus === 'battle_resolved' && gameState.turn === 'opponent') {
                         setTimeout(() => aiAttackStep(true), 500);
                    }
                }
            }, 500);
        }
    }
});

// *** START: แก้ไข Event Listener ของปุ่ม Confirm Discard ***
confirmDiscardBtn.addEventListener('click', () => {
    if (confirmDiscard(gameState)) {
        updateUI(gameState, callbacks);
        // ตรวจสอบว่าการทิ้งการ์ดเสร็จสิ้นแล้วหรือยัง
        if (!gameState.discardState.isDiscarding) {
            // จะเรียกใช้ proceedToRefresh() ก็ต่อเมื่อการทิ้งการ์ดนั้นเกิดใน Draw Phase เท่านั้น
            if (gameState.phase === 'draw') {
                proceedToRefresh();
            }
            // ถ้าการทิ้งการ์ดเกิดใน Main Phase (จาก Strong Draw) เราจะไม่ทำอะไรเลย
            // เพื่อให้ผู้เล่นสามารถเล่นใน Main Phase ต่อได้
        }
    }
});
// *** END: แก้ไข Event Listener ของปุ่ม Confirm Discard ***

confirmCoreRemovalBtn.addEventListener('click', () => {
    if (confirmCoreRemoval(gameState)) {
        updateUI(gameState, callbacks);
    }
});
cancelCoreRemovalBtn.addEventListener('click', () => {
    cancelCoreRemoval(gameState);
    updateUI(gameState, callbacks);
});
cancelEffectChoiceBtn.addEventListener('click', () => {
    gameState.effectChoiceState = { isChoosing: false, card: null };
    updateUI(gameState, callbacks);
});

function delegateClick(event) {
    const cardEl = event.target.closest('.card');
    const coreEl = event.target.closest('.core');

    if (coreEl) {
        const isPayingForSomething = gameState.summoningState.isSummoning || gameState.magicPaymentState.isPaying;
        const coreId = coreEl.id;
        const parentCardEl = coreEl.closest('.card');
        const from = parentCardEl ? 'field' : 'reserve';
        const spiritUid = parentCardEl ? parentCardEl.id : null;

        if (isPayingForSomething) {
            callbacks.onSelectCoreForPayment(coreId, from, spiritUid);
        } else if (gameState.placementState.isPlacing) {
            callbacks.onSelectCoreForPlacement(coreId, from, spiritUid);
        }
        return;
    }


    if (cardEl) {
        const cardId = cardEl.id;
        const cardDataInHand = gameState.player.hand.find(c => c.uid === cardId);
        const cardDataOnField = gameState.player.field.find(c => c.uid === cardId) || gameState.opponent.field.find(c => c.uid === cardId);

        if (cardDataOnField) {
            callbacks.onSpiritClick(cardDataOnField);
            return;
        }

        if (cardDataInHand) {
            if (gameState.discardState.isDiscarding) {
                callbacks.onSelectCardForDiscard(cardId);
                return;
            }

            const isPaying = gameState.summoningState.isSummoning || gameState.magicPaymentState.isPaying;
            const isPlacing = gameState.placementState.isPlacing;
            const canTakeAction = !isPaying && !isPlacing;

            if (canTakeAction) {
                const isPlayerTurn = gameState.turn === 'player';
                const isMainStep = gameState.phase === 'main';
                const isFlashTimingWithPlayerPriority = gameState.flashState.isActive && gameState.flashState.priority === 'player';
                
                const availableEffects = cardDataInHand.effects?.filter(e => 
                    (isFlashTimingWithPlayerPriority && e.timing === 'flash') || 
                    (isPlayerTurn && isMainStep && (e.timing === 'main' || e.timing === 'flash'))
                );

                if (!availableEffects || availableEffects.length === 0) {
                    if (isPlayerTurn && isMainStep && (cardDataInHand.type === 'Spirit' || cardDataInHand.type === 'Nexus')) {
                        callbacks.onInitiateSummon(cardId);
                    }
                    return;
                }

                const firstEffect = availableEffects[0];
                if (firstEffect.choiceId) {
                    const validChoices = availableEffects.filter(effect => 
                        effect.choiceId === firstEffect.choiceId && (!effect.prerequisite || effect.prerequisite(gameState))
                    );

                    if (validChoices.length > 0) {
                        gameState.effectChoiceState = { isChoosing: true, card: cardDataInHand };
                        const effectChoiceButtons = document.getElementById('effect-choice-buttons');
                        
                        effectChoiceButtons.innerHTML = validChoices.map(effect => 
                            `<button class="effect-choice-btn" data-effect-index="${cardDataInHand.effects.indexOf(effect)}">${effect.choiceText}</button>`
                        ).join('');

                        effectChoiceButtons.querySelectorAll('.effect-choice-btn').forEach(button => {
                            button.onclick = () => {
                                const effectIndex = parseInt(button.dataset.effectIndex, 10);
                                const chosenEffect = cardDataInHand.effects[effectIndex];
                                gameState.effectChoiceState = { isChoosing: false, card: null };
                                callbacks.onUseMagic(cardId, chosenEffect.timing, chosenEffect);
                            };
                        });
                        updateUI(gameState, callbacks);
                    }
                } 
                else if (cardDataInHand.type === 'Magic') {
                    const canUseMain = availableEffects.some(e => e.timing === 'main');
                    const canUseFlash = availableEffects.some(e => e.timing === 'flash');

                    if (isMainStep && canUseMain && canUseFlash) {
                        gameState.effectChoiceState = { isChoosing: true, card: cardDataInHand };
                        const effectChoiceButtons = document.getElementById('effect-choice-buttons');
                        effectChoiceButtons.innerHTML = `
                            <button id="effect-choice-main-btn">Use Main</button>
                            <button id="effect-choice-flash-btn">Use Flash</button>
                        `;
                        document.getElementById('effect-choice-main-btn').onclick = () => {
                            gameState.effectChoiceState = { isChoosing: false, card: null };
                            callbacks.onUseMagic(cardId, 'main');
                        };
                        document.getElementById('effect-choice-flash-btn').onclick = () => {
                            gameState.effectChoiceState = { isChoosing: false, card: null };
                            callbacks.onUseMagic(cardId, 'flash');
                        };
                        updateUI(gameState, callbacks);
                    } else if (canUseMain) {
                        callbacks.onUseMagic(cardId, 'main');
                    } else if (canUseFlash) {
                        callbacks.onUseMagic(cardId, 'flash');
                    }
                }
            }
        } 
        else if (cardDataOnField) {
            callbacks.onSpiritClick(cardDataOnField);
        }
    }
}

playerFieldElement.addEventListener('click', delegateClick);
opponentFieldElement.addEventListener('click', delegateClick); 
playerReserveCoreContainer.addEventListener('click', delegateClick);
playerHandContainer.addEventListener('click', delegateClick);

document.addEventListener('DOMContentLoaded', initializeGame);