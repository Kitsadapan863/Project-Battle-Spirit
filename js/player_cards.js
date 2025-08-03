const pathImage = '../images'

export const playerCards = [
    //Rock-Golem
    {
        id: 'card-rock-golem',
        name: 'Rock-Golem',
        image: '../images/Rock-Golem.webp',
        cost: 3,
        symbol_cost:{"blue":2},
        level:{ "level-1":{ "core": 1, "bp": 3000 }, "level-2":{ "core": 2, "bp": 4000 }, "level-3":{ "core": 4, "bp": 7000 } },
        type: 'Spirit', color: 'blue',
        family: ["Artificial Soldier"], 
        effects: [
            { level: [1, 2, 3], timing: 'whenAttacks',keyword: 'crush', description: "[LV1][LV2][LV3] [Crush]\n(When Attacks)\nMove cards from the top of your opponent's Deck to their trash equal to this spirit's LV." }
        ],
        symbol: {"blue":1},
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
        effects: [
            { level: [1, 2, 3], timing: 'whenAttacks',keyword: 'crush', description: "[LV1][LV2][LV3] [Crush]\n(When Attacks)\nMove cards from the top of your opponent's Deck to their trash equal to this spirit's LV." }
        ],
        symbol: {"blue":1},
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
        effects: [
            { level: [1, 2, 3], timing: 'whenAttacks',keyword: 'crush', description: "[LV1][LV2][LV3] [Crush]\n(When Attacks)\nMove cards from the top of your opponent's Deck to their trash equal to this spirit's LV." }
        ],
        symbol: {"blue":1},
    },
    //The MobileFortress Castle-Golem
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
            { level: [1, 2], timing: 'whenSummoned', keyword: 'discard', description: '[LV1][LV2] (When Summoned)\nFor each Nexus you control, discard five cards from the opposing decktop (Max 15).' },
            { level: [2], timing: 'whenAttacks', keyword:'discard', description: '[LV2] (When Attacks)\nFor each Blue symbol you control, discard a card from the opposing decktop.' }
        ],
        symbol: {"blue":1},
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
            { level: [1, 2], timing: 'whenSummoned', keyword: 'discard', description: '[LV1][LV2] (When Summoned)\nFor each Nexus you control, discard five cards from the opposing decktop (Max 15).' },
            { level: [2], timing: 'whenAttacks', keyword:'discard', description: '[LV2] (When Attacks)\nFor each Blue symbol you control, discard a card from the opposing decktop.' }
        ],
        symbol: {"blue":1},
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
            { level: [1, 2], timing: 'whenSummoned', keyword: 'discard', description: '[LV1][LV2] (When Summoned)\nFor each Nexus you control, discard five cards from the opposing decktop (Max 15).' },
            { level: [2], timing: 'whenAttacks', keyword:'discard', description: '[LV2] (When Attacks)\nFor each Blue symbol you control, discard a card from the opposing decktop.' }
        ],
        symbol: {"blue":1},
    },
    //The GiantHero Titus
{
    id: 'card-giantHero-titus',
    name: 'The GiantHero Titus',
    image: '../images/The GiantHero Titus.webp', 
    cost: 8,
    symbol_cost:{"blue":4},
    level:{ "level-1":{ "core": 1, "bp": 6000 }, "level-2":{ "core": 4, "bp": 9000 } },
    type: 'Spirit', color: 'blue',
    family: ["Fighting Spirit", "Soldier"], 
    effects: [
        { level: [1, 2], timing: 'whenSummoned', keyword: 'discard', count: 10, description: '[LV1][LV2] (When Summoned)\nDiscard 10 cards from the opposing decktop.' },
        { level: [2], timing: 'onOpponentDestroyedInBattle', keyword: 'discard', count: 10, description: '[LV2] (When Attacks)\nWhen this spirit destroys an opposing Spirit by BP comparison, discard 10 cards from the opposing decktop.' }
    ],
    symbol: {"blue":1},
},
{
    id: 'card-giantHero-titus',
    name: 'The GiantHero Titus',
    image: '../images/The GiantHero Titus.webp', 
    cost: 8,
    symbol_cost:{"blue":4},
    level:{ "level-1":{ "core": 1, "bp": 6000 }, "level-2":{ "core": 4, "bp": 9000 } },
    type: 'Spirit', color: 'blue',
    family: ["Fighting Spirit", "Soldier"], 
    effects: [
        { level: [1, 2], timing: 'whenSummoned', keyword: 'discard', count: 10, description: '[LV1][LV2] (When Summoned)\nDiscard 10 cards from the opposing decktop.' },
        { level: [2], timing: 'onOpponentDestroyedInBattle', keyword: 'discard', count: 10, description: '[LV2] (When Attacks)\nWhen this spirit destroys an opposing Spirit by BP comparison, discard 10 cards from the opposing decktop.' }
    ],
    symbol: {"blue":1},
},
{
    id: 'card-giantHero-titus',
    name: 'The GiantHero Titus',
    image: '../images/The GiantHero Titus.webp', 
    cost: 8,
    symbol_cost:{"blue":4},
    level:{ "level-1":{ "core": 1, "bp": 6000 }, "level-2":{ "core": 4, "bp": 9000 } },
    type: 'Spirit', color: 'blue',
    family: ["Fighting Spirit", "Soldier"], 
    effects: [
        { level: [1, 2], timing: 'whenSummoned', keyword: 'discard', count: 10, description: '[LV1][LV2] (When Summoned)\nDiscard 10 cards from the opposing decktop.' },
        { level: [2], timing: 'onOpponentDestroyedInBattle', keyword: 'discard', count: 10, description: '[LV2] (When Attacks)\nWhen this spirit destroys an opposing Spirit by BP comparison, discard 10 cards from the opposing decktop.' }
        
    ],
    symbol: {"blue":1},
},


    //The Burning Canyon
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
            { level: [1, 2], timing: 'onDrawStep', description: '[LV1][LV2] (Your Draw Step)\nDraw 1 card. Then, discard 1 card.' },
            { level: [2], timing: 'duringBattle', description: '[LV2] (Your Attack Step)\nSpirits you control get +1000BP.' }
        ],
        symbol: {"red":1},
    },
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
            { level: [1, 2], timing: 'onDrawStep', description: '[LV1][LV2] (Your Draw Step)\nDraw 1 card. Then, discard 1 card.' },
            { level: [2], timing: 'duringBattle', description: '[LV2] (Your Attack Step)\nSpirits you control get +1000BP.' }
        ],
        symbol: {"red":1},
    },
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
            { level: [1, 2], timing: 'onDrawStep', description: '[LV1][LV2] (Your Draw Step)\nDraw 1 card. Then, discard 1 card.' },
            { level: [2], timing: 'duringBattle', description: '[LV2] (Your Attack Step)\nSpirits you control get +1000BP.' }
        ],
        symbol: {"red":1},
    },
]