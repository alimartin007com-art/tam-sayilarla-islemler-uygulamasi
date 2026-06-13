// === EMO v3.1 - game.js ===
// Oyun döngüsü, kontrolleri, zamanlayıcı ve mağaza işlemleri

import * as State from './state.js';
import * as MathLogic from './math.js';
import * as UI from './ui.js';
import { allThemesMap } from './config.js';

export function startTimer() { 
    clearInterval(State.timer); 

    if (State.isBlitzMode || State.isSurvivalMode) {
        UI.timeEl.textContent = "∞";
        UI.timeBarEl.style.width = '100%';
        return;
    }
    
    if (State.freezeTime) { 
        UI.timeEl.textContent = "∞"; 
        UI.timeBarEl.style.width = '100%'; 
        UI.timeBarEl.style.backgroundColor = 'var(--accent)';
        State.setFreezeTime(false);
        UI.updateMeta(() => {}); // Main'de saveProfile bağlanacak
        return;
    } 
    
    const effectiveLevel = MathLogic.getEffectiveLevel();
    let tl = 0;
    if (effectiveLevel === 1) tl = 15; 
    else if (effectiveLevel === 2) tl = 25;
    else if (effectiveLevel === 3) tl = 45; 
    
    State.setInitialTime(tl);
    State.setTimeLeft(tl);
    
    UI.timeEl.textContent = tl + " sn"; 
    UI.timeBarEl.style.width = '100%';
    UI.timeBarEl.style.backgroundColor = 'var(--good)'; 
    
    const newTimer = setInterval(() => { 
        State.setTimeLeft(State.timeLeft - 1); 
        UI.timeEl.textContent = State.timeLeft + " sn"; 
        const percentage = (State.timeLeft / State.initialTime) * 100; 
        UI.timeBarEl.style.width = percentage + '%'; 
        
        if (percentage < 30) { 
            UI.timeBarEl.style.backgroundColor = 'var(--bad)'; 
        } else if (percentage < 60) { 
            UI.timeBarEl.style.backgroundColor = 'var(--header)'; 
        } else { 
            UI.timeBarEl.style.backgroundColor = 'var(--good)'; 
        } 
        
        if (State.timeLeft <= 0) { 
            clearInterval(State.timer); 
            handleWrongAnswer(State.currentProblem.ans);
            UI.notify("Süre doldu!", false); 
        } 
    }, 1000); 
    State.setTimer(newTimer);
}

export function updateGameTimerUI() {
    UI.gameTime.textContent = State.globalTimerLeft + "s";
    
    let maxTime = 60;
    if (State.isSurvivalMode) {
        maxTime = State.survivalStartTime + (10 * (State.survivalCorrectBonus / 2));
        if (State.globalTimerLeft > maxTime) {
            maxTime = State.globalTimerLeft;
        }
    }
    
    const percentage = (State.globalTimerLeft / maxTime) * 100;
    UI.gameTimeBar.style.width = Math.min(100, percentage) + '%';
    
    if (percentage < 30) { 
        UI.gameTimeBar.style.backgroundColor = 'var(--bad)'; 
    } else if (percentage < 60) { 
        UI.gameTimeBar.style.backgroundColor = 'var(--header)'; 
    } else { 
        UI.gameTimeBar.style.backgroundColor = 'var(--accent-dark)'; 
    }
}

export function startGame() { 
    if(State.gameState.running) { 
        endGame('Oyun durduruldu.'); 
        return; 
    } 
    clearInterval(State.timer);
    clearInterval(State.globalTimer);
    
    const selectedMode = document.getElementById("mode").value; 
    State.setGameState({ running: true, mode: selectedMode, level: document.getElementById("level").value });
    
    State.setIsBlitzMode(selectedMode === "speed");
    State.setIsSurvivalMode(selectedMode === "survival");
    
    State.setCurrentSessionWrongs([]);
    if (State.gameState.level === "adaptive") {
        State.setCurrentAdaptiveLevel(1);
        State.setAdaptiveHistory([]); 
    }

    if (State.isBlitzMode) { 
        State.gameState.total = -1;
        document.getElementById("questionCount").value = "-1";
        UI.notify("⚡ Blitz Modu başladı! 60 Saniyen var!", true); 
        UI.gameTimeLabel.textContent = "Kalan Oyun Süresi:";
        
        State.setGlobalTimerLeft(60);
        updateGameTimerUI();
        const gTimer = setInterval(() => {
            State.setGlobalTimerLeft(State.globalTimerLeft - 1);
            updateGameTimerUI();
            if (State.globalTimerLeft <= 0) {
                endGame(`⚡ Blitz Modu Bitti! Skor: ${State.gameState.score}`);
            }
        }, 1000);
        State.setGlobalTimer(gTimer);

    } 
    else if (State.isSurvivalMode) {
        State.gameState.total = -1;
        document.getElementById("questionCount").value = "-1";
        UI.notify("⏳ Hayatta Kalma Modu başladı! Süreye dikkat et!", true); 
        UI.gameTimeLabel.textContent = "Kalan Süre: ⏳";
        
        State.setGlobalTimerLeft(State.survivalStartTime);
        updateGameTimerUI();
        const gTimer = setInterval(() => {
            State.setGlobalTimerLeft(State.globalTimerLeft - 1);
            updateGameTimerUI();
            if (State.globalTimerLeft <= 0) {
                endGame(`⏳ Süre Bitti! Skor: ${State.gameState.score}`);
            }
        }, 1000);
        State.setGlobalTimer(gTimer);

    } else {
        State.gameState.total = Number(document.getElementById("questionCount").value);
        UI.gameTimeLabel.textContent = "Kalan Oyun Süresi:";
    }

    State.gameState.asked = 0; 
    State.gameState.correct = 0; 
    State.gameState.wrong = 0;
    State.gameState.score = 0; 
    State.setLives(3);
    State.setStreak(0);
    State.setMulCount(0);
    State.setFreezeTime(false);
    State.setDoubleScoreTurns(0);
    State.setDoubleXPTurns(0);
    State.setDoubleWalletTurns(0);
    State.setSkipTokens(3); 
    
    nextQuestion();
    UI.showPage('game', endGame); 
}

export function endGame(message) { 
    clearInterval(State.timer); 
    clearInterval(State.globalTimer);
    State.setGlobalTimer(null);
    UI.hideLevelUpModal();
    
    if (message) { 
        UI.equationEl.textContent = message;
        if (message.includes('Bitti') || message.includes('Tur bitti')) {
            State.gameStats.maxScore = Math.max(State.gameStats.maxScore, State.gameState.score);
            State.gameStats.gamesPlayed++;
            
            if (State.gameState.score >= State.badges.max_score_500.condition) {
                 earnBadge("max_score_500");
            }
            
            if (message.includes('Game Over') || message.includes('Süre Bitti')) {
                UI.notify("Oyun Bitti! Profilini kontrol et.", false);
            } else {
                UI.celebrate();
                UI.notify("Tebrikler! İstatistiklerini kontrol et.", true);
            }
            
            if (State.currentSessionWrongs.length > 0) {
                let btn = document.createElement('button');
                btn.textContent = "🧐 Yaptığım Hataları Gör";
                btn.className = "secondary";
                btn.style.marginTop = "15px";
                btn.style.width = "100%";
                btn.style.fontSize = "18px";
                btn.onclick = UI.showWrongHistory;
                UI.equationEl.appendChild(document.createElement('br'));
                UI.equationEl.appendChild(btn);
            }

        } else {
            UI.notify(message, false);
        }
    } else {
        UI.equationEl.textContent = 'Oyun Durduruldu.';
    }
    
    State.gameState.running = false; 
    UI.resultEl.textContent = ""; 
    UI.timeEl.textContent = "—"; 
    State.setCurrentProblem(null);
    State.setIsBlitzMode(false);
    State.setIsSurvivalMode(false);
    
    // Main üzerinden bağlanacak updateMeta var, callEvent tetikleyeceğiz ama basitlik için main'i bekleyeceğiz.
    // Şimdilik UI üzerinden dispatchEvent yapalım veya main'e callback atalım.
    document.dispatchEvent(new Event('gameStateUpdated'));
}

export function nextQuestion() {
    if (!State.gameState.running) return;
    
    if ((State.isBlitzMode || State.isSurvivalMode) && State.globalTimerLeft <= 0) {
        return;
    }
    
    if (State.gameState.total !== -1 && State.gameState.asked >= State.gameState.total) { 
        endGame(`Tur bitti! ${State.gameState.correct} doğru ile Skor: ${State.gameState.score}`);
        return; 
    } 

    State.gameState.asked++; 
    const prob = MathLogic.makeProblem(); 
    State.setCurrentProblem(prob);
    UI.equationEl.innerHTML = prob.text; 
    UI.answerInput.value = ""; 
    UI.resultEl.textContent = ""; 
    
    UI.answerInput.focus();
    
    startTimer();
    document.dispatchEvent(new Event('gameStateUpdated'));
}

export function checkAnswer() {
    if (!State.gameState.running || State.currentProblem === null) return;
    
    const correctAnswer = State.currentProblem.ans;
    let userAnswer = Number(UI.answerInput.value);
    if (UI.answerInput.value.trim() === "") return; 

    clearInterval(State.timer);
    
    if (userAnswer === correctAnswer) { 
        handleCorrectAnswer(); 
    } else { 
        handleWrongAnswer(correctAnswer); 
    }
    
    document.dispatchEvent(new Event('gameStateUpdated'));
}

function handleCorrectAnswer() {
    State.gameState.correct++;
    recordAdaptive(true);
    let pts = 10;
    if (State.doubleScoreTurns > 0) { 
        pts *= 2; 
        State.setDoubleScoreTurns(State.doubleScoreTurns - 1);
        UI.notify(`🔥 2x Puan! Kalan: ${State.doubleScoreTurns} soru.`, true);
    }
    State.setStreak(State.streak + 1);
    if (State.streak % 5 === 0) { 
        pts += 5 * State.streak; 
        UI.notify(`🔥 ${State.streak} Serisi! Bonus +${5*State.streak} puan!`, true); 
    }
    State.gameState.score += pts;
    
    const effectiveLevel = MathLogic.getEffectiveLevel();
    let bakiyeKazan = 10;
    if (effectiveLevel === 2) bakiyeKazan = 15;
    else if (effectiveLevel === 3) bakiyeKazan = 20;
    
    if (State.isBlitzMode || State.isSurvivalMode) bakiyeKazan = 15;
    
    if (State.doubleWalletTurns > 0) {
        bakiyeKazan *= 2;
        State.setDoubleWalletTurns(State.doubleWalletTurns - 1);
        UI.notify(`💰 2x Bakiye! Kalan: ${State.doubleWalletTurns} soru.`, true);
    }
    
    State.setWallet(State.wallet + bakiyeKazan);

    let xpGained = 5 + (effectiveLevel * 3) + (State.currentProblem.type === 'algebra' ? 5 : 0);
    addXP(xpGained);

    State.gameStats.totalCorrect++;
    updateOperationStats(State.currentProblem.type, true);
    
    UI.resultEl.textContent = "✅ Doğru!";
    UI.celebrate();
    UI.equationEl.classList.add('correct-flash');
    setTimeout(() => UI.equationEl.classList.remove('correct-flash'), 400);
    
    State.setCurrentProblem(null);
    const timeout = (State.isBlitzMode || State.isSurvivalMode) ? 200 : 700;
    setTimeout(nextQuestion, timeout);
    
    if (State.isSurvivalMode) {
        State.setGlobalTimerLeft(State.globalTimerLeft + State.survivalCorrectBonus);
        UI.notify(`+${State.survivalCorrectBonus} Saniye! ⏱️`, true);
        updateGameTimerUI();
    }
}

function handleWrongAnswer(correctAnswer) {
    State.gameState.wrong++;
    recordAdaptive(false);
    
    State.currentSessionWrongs.push({
        question: State.currentProblem.text,
        userAnswer: UI.answerInput.value,
        correctAnswer: correctAnswer,
        type: State.currentProblem.type,
        resultText: State.currentProblem.resultText
    });
    
    State.gameState.score = Math.max(0, State.gameState.score - 5);
    
    if (State.streakShields > 0) {
        State.setStreakShields(State.streakShields - 1);
        UI.notify("🛡️ Seri Kalkanı kullanıldı! Seri korunuyor.", true);
    } else {
        State.setStreak(0);
    }
    
    State.gameStats.totalWrong++;
    updateOperationStats(State.currentProblem.type, false);
    
    let resultMessage;
    if (State.currentProblem.type === 'algebra') {
        resultMessage = `❌ Yanlış! Doğru cevap: ${State.currentProblem.resultText} (Yani katsayısı ${correctAnswer})`;
    } else { 
        resultMessage = `❌ Yanlış! Doğru cevap: ${correctAnswer}`; 
    }
    UI.resultEl.textContent = resultMessage;
    
    UI.speakWrong(); 
    if (!State.isBlitzMode && !State.isSurvivalMode) loseLife();
    
    UI.equationEl.classList.add('wrong-flash', 'wrong-shake');
    setTimeout(() => UI.equationEl.classList.remove('wrong-flash', 'wrong-shake'), 400);

    UI.answerInput.value = ""; 
    UI.answerInput.focus(); 
    State.setCurrentProblem(null); 
    const timeout = 1500; 
    setTimeout(nextQuestion, timeout); 
    
    if (State.isSurvivalMode) {
        State.setGlobalTimerLeft(State.globalTimerLeft - State.survivalWrongPenalty);
        UI.notify(`-${State.survivalWrongPenalty} Saniye!`, false);
        updateGameTimerUI();
        if (State.globalTimerLeft <= 0) {
            State.setGlobalTimerLeft(0);
            endGame(`⏳ Süre Bitti! Skor: ${State.gameState.score}`);
        }
    }
}

function loseLife() {
    State.setLives(State.lives - 1);
    if (State.lives <= 0) {
        endGame("Tüm canlar bitti! Skor: " + State.gameState.score);
    }
    document.dispatchEvent(new Event('gameStateUpdated'));
}

export function skipQuestion() {
    if (!State.gameState.running || State.currentProblem === null) return;
    clearInterval(State.timer);
    
    if (State.skipTokens > 0) {
        State.setSkipTokens(State.skipTokens - 1);
        UI.notify("🎟️ Pas hakkı kullanıldı! Soru atlanıyor.", true);
        
        State.setCurrentProblem(null); 
        setTimeout(nextQuestion, 700);
        document.dispatchEvent(new Event('gameStateUpdated'));
        return;
    }
    UI.notify("🎟️ Kullanılabilir pas hakkınız yok!", false);
}

export function useHint() { 
    if (State.hints > 0 && State.currentProblem) { 
        State.setHints(State.hints - 1);
        const ans = State.currentProblem.ans; 
        let hintText = ""; 
        const firstChar = String(ans).charAt(0);
        if (State.currentProblem.type === 'algebra') { 
            hintText = `Cebirli ifade sadeleşmiş haliyle katsayısı ${firstChar} ile başlıyor.`;
        } else {
            hintText = `Cevap: ${firstChar} ile başlıyor.`;
        }
        UI.notify("💡 İpucu: " + hintText, true);
        document.dispatchEvent(new Event('gameStateUpdated'));
    } else if (State.currentProblem) {
        UI.notify("Yeterli ipucu hakkınız yok. Mağazadan satın alın!", false);
    }
}

function recordAdaptive(isCorrect) {
    if (State.gameState.level !== "adaptive") return;
    State.adaptiveHistory.push(isCorrect);
    if (State.adaptiveHistory.length > 10) State.adaptiveHistory.shift();
    
    if (State.adaptiveHistory.length >= 5) {
        let correctCount = State.adaptiveHistory.filter(x => x).length;
        let ratio = correctCount / State.adaptiveHistory.length;
        
        if (ratio >= 0.8 && State.currentAdaptiveLevel < 3) {
            State.setCurrentAdaptiveLevel(State.currentAdaptiveLevel + 1);
            UI.notify(`🤖 AI: Başarılısın! Zorluk seviyesi ${State.currentAdaptiveLevel}'e yükseltildi.`, true);
            State.setAdaptiveHistory([]); 
        } else if (ratio <= 0.4 && State.currentAdaptiveLevel > 1) {
            State.setCurrentAdaptiveLevel(State.currentAdaptiveLevel - 1);
            UI.notify(`🤖 AI: Zorlandığını fark ettim. Zorluk seviyesi ${State.currentAdaptiveLevel}'e düşürüldü.`, false);
            State.setAdaptiveHistory([]);
        }
    }
}

function updateOperationStats(operationType, isCorrect) {
    if (!State.currentProblem) return; 
    
    const type = operationType === 'mixed' ? State.currentProblem.type : operationType;
    const suffix = isCorrect ? 'Correct' : 'Wrong';
    const key = type + suffix;

    if (State.gameStats.hasOwnProperty(key)) {
        State.gameStats[key]++;
    }
    
    if (State.isBlitzMode) State.gameStats['blitz' + suffix]++;
    if (State.isSurvivalMode) State.gameStats['survival' + suffix]++;
}

function addXP(amount) {
    if (!State.gameState.running) return;
    
    if (State.doubleXPTurns > 0) {
        amount *= 2;
        State.setDoubleXPTurns(State.doubleXPTurns - 1);
        UI.notify(`⚡ 2x XP! Kalan: ${State.doubleXPTurns} soru.`, true);
    }
    
    State.setXP(State.xp + amount);
    let xpNeeded = UI.getXPForNextLevel(State.level);

    let levelUp = false;
    while (State.xp >= xpNeeded) {
        levelUp = true;
        State.setXP(State.xp - xpNeeded);
        State.setLevel(State.level + 1);
        
        let coinReward = 50 + (State.level * 10);
        let hintReward = 1;
        State.setWallet(State.wallet + coinReward);
        State.setHints(State.hints + hintReward);
        
        UI.showLevelUpModal(State.level, coinReward, hintReward);
        if(State.isSoundEnabled) UI.levelUpSound.play().catch(()=>{});

        xpNeeded = UI.getXPForNextLevel(State.level);
    }
    
    UI.updateXPBar();
    checkBadges();
}

export function earnBadge(k) { 
    let b = State.badges[k]; 
    if (b && !b.earned) { 
        b.earned = true; 
        UI.renderBadges();
        UI.notify("🏅 " + b.icon + " " + b.name + " rozetini kazandın!"); 
        UI.celebrate(); 
    } 
}

export function checkBadges() { 
    if (State.gameStats.totalCorrect >= State.badges.math_genius.condition) earnBadge("math_genius"); 
    if (State.gameStats.totalCorrect >= State.badges.total_100.condition) earnBadge("total_100");
    if (State.gameStats.mulCorrect >= State.badges.mul_master.condition) earnBadge("mul_master");
    if (State.gameStats.addCorrect >= State.badges.add_master.condition) earnBadge("add_master");
    if (State.gameStats.subCorrect >= State.badges.sub_master.condition) earnBadge("sub_master");
    if (State.gameStats.divCorrect >= State.badges.div_master.condition) earnBadge("div_master");
    if (State.gameStats.blitzCorrect >= State.badges.blitz_runner.condition) earnBadge("blitz_runner");
    if (State.gameStats.survivalCorrect >= State.badges.survivor_30.condition) earnBadge("survivor_30");
    if (State.gameStats.algebraCorrect >= State.badges.algebra_pro.condition) earnBadge("algebra_pro");
    if (State.gameStats.expCorrect >= State.badges.exp_power.condition) earnBadge("exp_power");
    if (State.streak >= State.badges.streak5.condition) earnBadge("streak5"); 
    if (State.streak >= State.badges.streak_10.condition) earnBadge("streak_10");
    if (State.wallet >= State.badges.rich.condition) earnBadge("rich"); 
    if (State.wallet >= State.badges.very_rich.condition) earnBadge("very_rich");
    if (State.itemsPurchased >= State.badges.pauper.condition) earnBadge("pauper");
    if (State.level >= State.badges.level_5.condition) earnBadge("level_5");
    if (State.level >= State.badges.level_10.condition) earnBadge("level_10");
    if (State.level >= State.badges.level_15.condition) earnBadge("level_15");
    if (State.ownedThemes.length >= State.badges.collector.condition) earnBadge("collector");
}

export function buyItem(item, cost) {
    if (item.startsWith('theme_')) {
        const themeName = item.split('_')[1];
        if (State.ownedThemes.includes(themeName)) {
            UI.notify("Bu temaya zaten sahipsin!", false);
            return;
        }
        if (State.wallet < cost) {
            UI.notify("Yetersiz Bakiye!", false);
            return;
        }
        
        State.setWallet(State.wallet - cost);
        State.ownedThemes.push(themeName);
        UI.notify(`🎨 ${allThemesMap[themeName]} teması satın alındı!`, true);
        if(State.isSoundEnabled) UI.buyThemeSound.play().catch(()=>{});
        
        UI.updateThemeSelectorUI();
        UI.setTheme(themeName);
        checkBadges();
        document.dispatchEvent(new Event('gameStateUpdated'));
        return;
    }
    
    if (State.wallet < cost) {
        UI.notify("Yetersiz Bakiye! Daha çok soru çözmelisin.", false);
        return;
    }
    State.setWallet(State.wallet - cost); 
    State.setItemsPurchased(State.itemsPurchased + 1);
    let message = ""; 
    switch(item) { 
        case 'life': State.setLives(State.lives + 1); message = "❤️ Ekstra Can satın alındı!"; break; 
        case 'hint': State.setHints(State.hints + 1); message = "💡 İpucu Hakkı satın alındı!"; break; 
        case 'shield': State.setStreakShields(State.streakShields + 1); message = "🛡️ Seri Kalkanı satın alındı!"; break;
        case 'konfeti': confetti({ particleCount: 200, spread: 180, origin: { y: 0.5 } });
        message = "🎉 Süper Konfeti! Kutlama zamanı!"; break; 
        case 'freeze': 
        State.setFreezeTime(true);
        message = "⏱️ Zaman Dondurucu aktif edildi! (1 Soru)"; break;
        case 'double': 
        State.setDoubleScoreTurns(5);
        message = "🔥 2x Puan Gücü aktif edildi! (5 Soru)"; break;
        case 'double_xp':
        State.setDoubleXPTurns(5);
        message = "⚡ 2x XP Gücü aktif edildi! (5 Soru)"; break;
        case 'double_wallet':
        State.setDoubleWalletTurns(5);
        message = "💰 2x Bakiye aktif edildi! (5 Soru)"; break;
        default: 
          State.setWallet(State.wallet + cost);
          State.setItemsPurchased(State.itemsPurchased - 1);
          return; 
    } 
    
    if(State.isSoundEnabled) UI.buyThemeSound.play().catch(()=>{});
    
    checkBadges();
    UI.notify(message, true); 
    document.dispatchEvent(new Event('gameStateUpdated'));
}
