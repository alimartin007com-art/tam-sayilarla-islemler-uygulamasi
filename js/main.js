// === EMO v3.1 - main.js ===
// Entry point, ana olay dinleyicileri ve profil yönetimi

import * as State from './state.js';
import * as UI from './ui.js';
import * as Game from './game.js';
import * as MathLogic from './math.js';
import * as FirebaseModule from './firebase.js';

// --- Profil Fonksiyonları ---

export function saveProfile() {
    const dataToSave = { 
        wallet: State.wallet, lives: State.lives, hints: State.hints, badges: State.badges, gameStats: State.gameStats, 
        isSoundEnabled: State.isSoundEnabled, itemsPurchased: State.itemsPurchased,
        xp: State.xp, level: State.level, streakShields: State.streakShields, ownedThemes: State.ownedThemes, 
        doubleWalletTurns: State.doubleWalletTurns, skipTokens: State.skipTokens, customUsername: State.customUsername
    };
    
    // Yerel Kayıt
    localStorage.setItem("mathProfileV3.0", JSON.stringify(dataToSave));
    
    // Firebase Kaydı
    FirebaseModule.saveToFirebase(dataToSave);
}

export function loadProfile() {
    const saved = localStorage.getItem("mathProfileV3.0");
    if (saved) {
        const p = JSON.parse(saved);
        applyProfileData(p);
    }
}

export function applyProfileData(p) {
    if (p.wallet !== undefined) State.setWallet(p.wallet);
    if (p.lives !== undefined) State.setLives(p.lives);
    if (p.hints !== undefined) State.setHints(p.hints);
    if (p.xp !== undefined) State.setXP(p.xp);
    if (p.level !== undefined) State.setLevel(p.level);
    if (p.streakShields !== undefined) State.setStreakShields(p.streakShields);
    if (p.ownedThemes) {
        // Eski profildeki temaları mevcut varsayılan temalarla birleştir (kayıp tema olmaması için)
        const merged = [...new Set([...State.ownedThemes, ...p.ownedThemes])];
        State.setOwnedThemes(merged);
    }
    if (p.badges) {
        for (const key in p.badges) {
            if (State.badges[key]) {
                State.badges[key].earned = p.badges[key].earned;
            }
        }
    }
    if (p.gameStats) {
        for (const key in p.gameStats) {
            State.gameStats[key] = p.gameStats[key];
        }
    }
    if (p.isSoundEnabled !== undefined) {
        State.setIsSoundEnabled(p.isSoundEnabled);
        UI.soundToggleBtn.textContent = State.isSoundEnabled ? "🔊 Ses Açık" : "🔇 Ses Kapalı";
    }
    if (p.itemsPurchased !== undefined) State.setItemsPurchased(p.itemsPurchased);
    if (p.doubleWalletTurns !== undefined) State.setDoubleWalletTurns(p.doubleWalletTurns);
    if (p.skipTokens !== undefined) State.setSkipTokens(p.skipTokens);
    if (p.customUsername !== undefined) {
        State.setCustomUsername(p.customUsername);
        if (State.customUsername) {
            const el = document.getElementById('usernameInput');
            if (el) el.value = State.customUsername;
        }
    }
    
    UI.updateThemeShopUI();
    UI.renderBadges();
    UI.updateMeta(saveProfile);
}

// --- Window (Global) Exportları ---
window.showPage = (pageId) => {
    if (State.gameState.running) {
        Game.endGame('Oyun durduruldu.');
    }
    UI.showPage(pageId, Game.endGame);
};

window.openShop = () => {
    UI.shopEl.classList.toggle('hidden');
    if (!UI.shopEl.classList.contains('hidden')) {
        UI.updateThemeShopUI();
    }
};

window.startQuickGame = (mode) => {
    document.getElementById("mode").value = mode;
    document.getElementById("level").value = (mode === 'speed' || mode === 'survival') ? '2' : '1'; 
    document.getElementById("questionCount").value = (mode === 'speed' || mode === 'survival') ? '-1' : '10';
    Game.startGame();
};

window.saveCustomUsername = () => {
    const val = document.getElementById('usernameInput').value.trim();
    if (val.length < 3) {
        UI.notify("Kullanıcı adı en az 3 karakter olmalı!", false);
        return;
    }
    State.setCustomUsername(val);
    saveProfile();
    UI.notify("Kullanıcı adı kaydedildi!", true);
};

window.buyItem = Game.buyItem;

window.resetStats = () => {
    if (confirm("Tüm istatistiklerin (doğru/yanlış, oynanan oyun sayısı vb.) sıfırlanacak. (Bakiye, XP, Can, İpucu, Rozetler ve Eşyalar korunacak.) Emin misin?")) {
        State.resetGameStats();
        State.resetStatBadges();
        saveProfile();
        UI.updateMeta(saveProfile);
        UI.notify("İstatistikler sıfırlandı!", true);
        window.showPage('home');
    }
};

window.resetProfile = () => {
    if (confirm("TÜM PROFİLİN (Bakiye, rozetler, seviye, her şey) sıfırlanacak. Bu işlem geri alınamaz! Emin misin?")) {
        localStorage.removeItem("mathProfileV3.0");
        State.setWallet(0); State.setLives(3); State.setHints(0); State.setSkipTokens(0);
        State.setXP(0); State.setLevel(1); State.setStreakShields(0); State.setOwnedThemes(['light', 'dark', 'matrix', 'retro', 'gold', 'arctic', 'cyberpunk', 'sakura', 'summer']);
        State.resetGameStats();
        State.resetBadges();
        State.setCustomUsername("");
        saveProfile();
        UI.updateMeta(saveProfile);
        UI.setTheme('light');
        UI.notify("Profil sıfırlandı!", true);
        window.showPage('home');
    }
};

window.openAuthModal = FirebaseModule.openAuthModal;
window.login = FirebaseModule.login;
window.register = FirebaseModule.register;
window.loginWithGoogle = FirebaseModule.loginWithGoogle;
window.logout = () => FirebaseModule.logout(UI.notify, loadProfile);
window.changeLeaderboardCategory = FirebaseModule.changeLeaderboardCategory;

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    UI.submitBtn.addEventListener('click', Game.checkAnswer);

    UI.answerInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); 
            if(State.currentProblem) {
                Game.checkAnswer();
            }
        }
    });

    UI.skipBtn.addEventListener('click', Game.skipQuestion);
    UI.hintBtn.addEventListener('click', Game.useHint);
    UI.startBtn.addEventListener('click', Game.startGame);
    
    UI.soundToggleBtn.addEventListener('click', () => {
        State.setIsSoundEnabled(!State.isSoundEnabled);
        UI.soundToggleBtn.textContent = State.isSoundEnabled ? "🔊 Ses Açık" : "🔇 Ses Kapalı";
        saveProfile();
        UI.notify(State.isSoundEnabled ? "Sesler açıldı." : "Sesler kapatıldı.", true);
    });
    
    UI.levelUpCloseBtn.addEventListener('click', UI.hideLevelUpModal);

    document.getElementById('wrongHistoryCloseBtn').addEventListener('click', () => {
        document.getElementById('wrongHistoryModal').classList.add('hidden');
    });

    UI.themeSelector.addEventListener('change', (e) => {
        UI.setTheme(e.target.value);
        saveProfile();
    });

    UI.gamePageBtn.addEventListener('click', () => { 
        if (State.gameState.running) {
            Game.endGame('Oyun durduruldu.');
        }
        UI.showPage('game', Game.endGame); 
    });

    // gameStateUpdated olayı tetiklendiğinde profili kaydet
    document.addEventListener('gameStateUpdated', () => {
        UI.updateMeta(saveProfile);
        saveProfile();
    });

    // Başlangıç işlemleri
    loadProfile();
    
    // Auth Listener
    FirebaseModule.initFirebase((user) => {
        const authBtn = document.getElementById('authBtn');
        const userStatus = document.getElementById('userStatus');
        
        if (user) {
            document.getElementById('authModal').classList.add('hidden');
            if (authBtn) authBtn.style.display = 'none';
            if (userStatus) {
                userStatus.style.display = 'inline-block';
                userStatus.innerHTML = `👤 ${user.displayName || user.email} | <a href="#" onclick="logout()" style="color:var(--bad);">Çıkış</a>`;
            }
            FirebaseModule.loadProfileFromFirebase(
                user.uid, 
                (p) => { applyProfileData(p); }, 
                saveProfile, 
                UI.notify
            );
            FirebaseModule.updateLeaderboard();
        } else {
            if (authBtn) authBtn.style.display = 'inline-block';
            if (userStatus) userStatus.style.display = 'none';
            loadProfile(); // Yerel profile dön
            const lbList = document.getElementById("leaderboardList");
            if (lbList) lbList.innerHTML = "<p>Liderlik tablosunu görmek için giriş yapın.</p>";
        }
    });

    const savedTheme = localStorage.getItem('mathThemeV3.0') || 'light';
    UI.updateThemeSelectorUI();
    UI.setTheme(savedTheme);

    UI.showPage('home', Game.endGame);
});
