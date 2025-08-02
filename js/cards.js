// js/cards.js

// I've cleaned up the duplicate entries from your provided list.
export const allCards = [
    {
        id: 'card-drakwurm-nova',
        name: 'The StarSlayerDragon Darkwurm Nova',
        image: '../images/The StarSlayerDragon Darkwurm Nova.webp',
        cost: 7,
        symbol_cost:{"purple":4},
        level:{ "level-1":{ "core": 1, "bp": 5000 }, "level-2":{ "core": 3, "bp": 8000 }, "level-3":{ "core": 5, "bp": 13000 } },
        type: 'Spirit', color: 'purple',
        family: ["Astral Dragon", "Nightling"], 
        effects: ['When this Spirit attacks: Destroy 1 opposing Spirit with 5000 BP or less.'],
        symbol: {"purple":2},
    },
    {
        id: 'card-siegwurm',
        name: 'The ThunderEmperorDragon Siegwurm',
        image: '../images/The ThunderEmperorDragon Siegwurm.webp',
        cost: 6,
        symbol_cost:{"red":3},
        level:{ "level-1":{ "core": 1, "bp": 4000 }, "level-2":{ "core": 3, "bp": 6000 }, "level-3":{ "core": 5, "bp": 9000 } },
        type: 'Spirit', color: 'red',
        family: ["Astral Dragon", "Ancient Dragon"], 
        effects: ['[Flash] (Your Attack Step) By paying 1 cost: This Spirit gains +3000 BP.'],
        symbol: {"red":1},
    },
    {
        id: 'card-strike-siegwurm',
        name: 'The Moonlight Dragon Strike Siegwurm',
        image: '../images/The_Moonlight_Dragon_Strike_Siegwurm.webp',
        cost: 6,
        symbol_cost:{"white":3},
        level:{ "level-1":{ "core": 1, "bp": 5000 }, "level-2":{ "core": 3, "bp": 8000 }, "level-3":{ "core": 4, "bp": 10000 } },
        type: 'Spirit', color: 'white',
        family: ["Astral Deity", "Armed Machine"], 
        effects: ['[When Summoned] Destroy 1 opposing Spirit with 6000 BP or less.'],
        symbol: {"white":1},
    },
    {
        id: 'card-rock-golem',
        name: 'Rock-Golem',
        image: '../images/Rock-Golem.webp',
        cost: 3,
        symbol_cost:{"blue":2},
        level:{ "level-1":{ "core": 1, "bp": 3000 }, "level-2":{ "core": 2, "bp": 4000 }, "level-3":{ "core": 4, "bp": 7000 } },
        type: 'Spirit', color: 'blue',
        family: ["Artificial Soldier"], 
        effects: ['This Spirit gains +1000 BP for each Core on it.'],
        symbol: {"blue":1},
    },
    {
        id: 'card-gigantic-thor',
        name: 'The Gigantic Thor',
        image: '../images/The Gigantic Thor.webp',
        cost: 7,
        symbol_cost:{"white":3},
        level:{ "level-1":{ "core": 1, "bp": 4000 }, "level-2":{ "core": 2, "bp": 6000 }, "level-3":{ "core": 4, "bp": 8000 } },
        type: 'Spirit', color: 'white',
        family: ["Android", "Armed Machine"],
        effects: ['[Flash] (Your Attack Step) This Spirit can block during opponent\'s attack step.'],
        symbol: {"white":1},
    },
    {
        id: 'card-castle-golem',
        name: 'The MobileFortress Castle-Golem',
        image: '../images/The MobileFortress Castle-Golem.webp',
        cost: 8,
        symbol_cost:{"blue":4},
        level:{ "level-1":{ "core": 1, "bp": 6000 }, "level-2":{ "core": 6, "bp": 12000 } },
        type: 'Spirit', color: 'blue',
        family: ["Artificial Soldier"], 
        effects: [
            '[LV1][LV2] (When Summoned) For each Nexus you control, discard five cards from the opposing decktop (Max 15).',
            '[LV2] (When Attacks) For each Blue symbol you control, discard a card from the opposing decktop.'
        ],
        symbol: {"blue":1},
    },
    //  *** NEW: Magic Cards with Flash ***

    {
        id: 'magic-ice-age-shield',
        name: 'Ice Age Shield',
        image: '../images/Ice Age Shield.webp',
        cost: 2,
        symbol_cost:{"white":1},
        type: 'Magic',
        color: 'white',
        effects: {
            flash: '[Flash]: End the Attack Step.'
        },
    },
    {
        id: 'magic-brave-draw',
        name: 'Brave Draw',
        image: '../images/Brave Draw.webp',
        cost: 5,
        symbol_cost:{"red":3},
        type: 'Magic',
        color: 'red',
        effects: {
            main: '[Main]: Draw 2 cards from your deck.',
            flash: '[Flash]: During this battle, 1 of your Spirits gets +2000 BP.'
        },
    },
    {
        id: 'magic-ice-age-shield',
        name: 'Ice Age Shield',
        image: '../images/Ice Age Shield.webp',
        cost: 2,
        symbol_cost:{"white":1},
        type: 'Magic',
        color: 'white',
        effects: {
            flash: '[Flash]: End the Attack Step.'
        },
    },
    {
        id: 'magic-brave-draw',
        name: 'Brave Draw',
        image: '../images/Brave Draw.webp',
        cost: 5,
        symbol_cost:{"red":3},
        type: 'Magic',
        color: 'red',
        effects: {
            main: '[Main]: Draw 2 cards from your deck.',
            flash: '[Flash]: During this battle, 1 of your Spirits gets +2000 BP.'
        },
    },
    // *** NEW: Nexus Card ***
    {
        id: 'nexus-burning-canyon',
        name: 'The Burning Canyon',
        image: '../images/The Burning Canyon.webp', 
        cost: 3,
        symbol_cost:{"red":2},
        level:{ "level-1":{ "core": 0 }, "level-2":{ "core": 1 } },
        type: 'Nexus', 
        color: 'red',
        effects: [
            '[LV1][LV2] (Your Draw Step) Draw 1 card. Then, discard 1 card.',
            '[LV2] (During Your Battle Phase) Spirits you control get +1000BP.'
        ],
        symbol: {"red":1},
    },

];
