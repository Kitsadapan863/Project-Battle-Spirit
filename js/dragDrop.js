// js/dragDrop.js
// หน้าที่: จัดการการลากและวาง Core ในช่วง Main Step
import { moveCore } from './actions.js';
import { updateUI, playerReserveCoreContainer } from './ui.js';

function handleDrop(e, gameState) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over-core');
    if (gameState.turn !== 'player' || gameState.phase !== 'main' || gameState.summoningState.isSummoning || gameState.placementState.isPlacing) return;

    const type = e.dataTransfer.getData('type');
    if (type !== 'core') return;

    const coreId = e.dataTransfer.getData('id');
    const from = e.dataTransfer.getData('from');
    const sourceCardUid = e.dataTransfer.getData('cardUid');
    const targetElement = e.currentTarget;
    const targetCardUid = targetElement.classList.contains('card') ? targetElement.id : null;

    // FIXED: Pass the correct callbacks object to updateUI
    if (moveCore(coreId, from, sourceCardUid, targetElement.id, targetCardUid, gameState)) {
        updateUI(gameState, window.appCallbacks); // Assuming callbacks are globally accessible for now
    }
}

export function attachDragAndDropListeners(gameState, callbacks) { // Pass callbacks in
    // Store callbacks for use in handleDrop
    window.appCallbacks = callbacks;

    if (gameState.turn !== 'player' || gameState.phase !== 'main' || gameState.summoningState.isSummoning || gameState.placementState.isPlacing) {
        return;
    }

    document.querySelectorAll('.core[draggable="true"]').forEach(core => {
        if (core.dataset.dragListenerAttached === 'true') return;
        core.dataset.dragListenerAttached = 'true';

        core.addEventListener('dragstart', e => {
            e.stopPropagation();
            const parentCardEl = e.target.closest('.card');
            const parentReserveEl = e.target.closest('.zone.reserve');
            
            e.dataTransfer.setData('type', 'core');
            e.dataTransfer.setData('id', core.id);
            if (parentCardEl) {
                e.dataTransfer.setData('from', 'card');
                e.dataTransfer.setData('cardUid', parentCardEl.id);
            } else if (parentReserveEl) {
                e.dataTransfer.setData('from', 'reserve');
            }
            e.currentTarget.classList.add('dragging');
        });
        core.addEventListener('dragend', e => e.currentTarget.classList.remove('dragging'));
    });

    // The selector '#player-field .card' correctly targets both Spirits and Nexuses
    const dropZones = [playerReserveCoreContainer.parentElement, ...document.querySelectorAll('#player-field .card')];
    dropZones.forEach(zone => {
        if (zone.dataset.dropListenerAttached === 'true') return;
        zone.dataset.dropListenerAttached = 'true';

        zone.addEventListener('dragover', e => {
            e.preventDefault();
            zone.classList.add('drag-over-core');
        });
        zone.addEventListener('dragleave', e => {
            e.currentTarget.classList.remove('drag-over-core');
        });
        zone.addEventListener('drop', (e) => handleDrop(e, gameState));
    });
}