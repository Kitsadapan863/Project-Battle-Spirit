// js/utils.js
// หน้าที่: เก็บฟังก์ชันกลางที่ใช้ร่วมกันในหลายไฟล์

export function getSpiritLevelAndBP(spiritCard) {
    if (!spiritCard || !spiritCard.cores) return { level: 0, bp: 0 };
    const currentCores = spiritCard.cores.length;
    let currentLevel = 0;
    let currentBP = 0;
    if (!spiritCard.level) return { level: 0, bp: 0 };
    const levels = Object.keys(spiritCard.level)
        .map(key => ({ name: key, ...spiritCard.level[key] }))
        .sort((a, b) => b.core - a.core);
    for (const levelInfo of levels) {
        if (currentCores >= levelInfo.core) {
            currentLevel = parseInt(levelInfo.name.replace('level-', ''), 10);
            currentBP = levelInfo.bp;
            break;
        }
    }
    return { level: currentLevel, bp: currentBP };
}
