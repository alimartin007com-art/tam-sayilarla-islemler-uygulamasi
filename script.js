// === EMO v3.0 - script5.js ===
// --- FIREBASE YAPILANDIRMASI ---
// Firebase API anahtarları istemci tarafında çalışması gerektiği için gizlenmez.
// Güvenlik; Firebase Kuralları (Security Rules) ve Alan Adı (Domain) kısıtlamalarıyla sağlanır.
const firebaseConfig = {
  apiKey: "AIzaSyCR2LWyzcoT2wPwGzS3oF47RnNx6LxZbHE",
  authDomain: "eglenceli-matematik-oyun-f2396.firebaseapp.com",
  databaseURL: "https://eglenceli-matematik-oyun-f2396-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "eglenceli-matematik-oyun-f2396",
  storageBucket: "eglenceli-matematik-oyun-f2396.firebasestorage.app",
  messagingSenderId: "803199070316",
  appId: "1:803199070316:web:c56ce976770efee1b5e849",
  measurementId: "G-E5NFXTYYT8"
};

// Firebase başlatma
let database, auth, googleProvider;
let currentUser = null;
try {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    auth = firebase.auth();
    googleProvider = new firebase.auth.GoogleAuthProvider();
    
    auth.onAuthStateChanged(user => {
        currentUser = user;
        const authBtn = document.getElementById('authBtn');
        if (user) {
            authBtn.textContent = "👤 Çıkış Yap";
            authBtn.onclick = logout;
            loadProfileFromFirebase(user.uid);
            updateLeaderboard();
            document.getElementById('authModal').classList.add('hidden');
        } else {
            authBtn.textContent = "👤 Giriş Yap";
            authBtn.onclick = openAuthModal;
        }
    });
} catch (error) {
    console.error("Firebase başlatılamadı (Lütfen config ayarlarını yapın):", error);
}

function openAuthModal() {
    document.getElementById('authError').textContent = "";
    document.getElementById('authEmail').value = "";
    document.getElementById('authPassword').value = "";
    document.getElementById('authModal').classList.remove('hidden');
}

function login() {
    const email = document.getElementById('authEmail').value;
    const pass = document.getElementById('authPassword').value;
    if(auth) {
        auth.signInWithEmailAndPassword(email, pass).catch(err => {
            document.getElementById('authError').textContent = err.message;
        });
    }
}

function register() {
    const email = document.getElementById('authEmail').value;
    const pass = document.getElementById('authPassword').value;
    if(auth) {
        auth.createUserWithEmailAndPassword(email, pass).catch(err => {
            document.getElementById('authError').textContent = err.message;
        });
    }
}

function loginWithGoogle() {
    if (window.location.protocol === 'file:') {
        var errBox = document.getElementById('authError');
        errBox.textContent = '';
        var warningDiv = document.createElement('div');
        warningDiv.style.cssText = 'background:rgba(255,152,0,0.15);border-left:4px solid var(--header);padding:12px;border-radius:8px;font-size:13px;text-align:left;line-height:1.4;color:var(--text);margin-bottom:15px;';
        var msg = '';
        msg += '<b>⚠️ Tarayıcı Güvenlik Kısıtlaması:<\/b><br>';
        msg += 'Google Giriş özelliği doğrudan çift tıklatılan dosyalarda (file:\/\/) çalışmaz.<br><br>';
        msg += '<b>Nasıl Çalıştırılır?<\/b><br>';
        msg += '1. VS Code kullanıyorsanız sağ alt köşedeki <b>"Go Live"<\/b> (Live Server) butonuna tıklayın.<br>';
        msg += '2. Veya terminalde bu klasörde <b>npx http-server<\/b> komutunu çalıştırarak <b>http:\/\/localhost:8080<\/b> adresinden oyunu açın.';
        warningDiv.innerHTML = msg;
        errBox.appendChild(warningDiv);
        return;
    }
    if(auth) {
        auth.signInWithPopup(googleProvider).catch(function(err) {
            console.error("Google Giriş Hatası:", err);
            var errorMsg = "Google Girişi Hatalı: " + err.message;
            if (err.code === 'auth/operation-not-supported-in-this-environment') {
                errorMsg = "Google Girişi bu ortamda desteklenmiyor. Lütfen oyunu yerel sunucu (localhost) üzerinden açın.";
            } else if (err.code === 'auth/auth-domain-config-required') {
                errorMsg = "Hata: Firebase yetkilendirilmiş alan adı (Authorized Domain) yapılandırılmamış.";
            }
            document.getElementById('authError').textContent = errorMsg;
        });
    }
}

function logout() {
    if(auth) {
        auth.signOut();
        notify("Çıkış yapıldı. Yerel profile dönüldü.", true);
        loadProfileFromLocal(); // Yerel profile dön
    }
}

function loadProfileFromFirebase(uid) {
    database.ref('users/' + uid).once('value').then(snapshot => {
        const p = snapshot.val();
        if (p) {
            applyProfileData(p);
            notify("Bulut profili yüklendi!", true);
        } else {
            // Yeni kullanıcı, yerel verileri buluta kaydet
            saveProfile();
            notify("Hesap oluşturuldu, veriler buluta eşitlendi!", true);
        }
    }).catch(err => console.error("Firebase veri çekme hatası:", err));
}

let currentLeaderboardCategory = "totalCorrect";

function changeLeaderboardCategory() {
    const sel = document.getElementById("leaderboardCategory");
    if(sel) {
        currentLeaderboardCategory = sel.value;
        updateLeaderboard();
    }
}

function updateLeaderboard() {
    if(!database) return;
    
    // score'a göre değil, seçili kategoriye göre sırala
    database.ref('leaderboard').orderByChild(currentLeaderboardCategory).limitToLast(10).on('value', snapshot => {
        const list = [];
        snapshot.forEach(child => {
            list.push(child.val());
        });
        list.reverse(); // En yüksek puan/doğru en üstte
        
        const lbList = document.getElementById("leaderboardList");
        if(!lbList) return;
        lbList.innerHTML = "";
        if(list.length === 0) {
            lbList.innerHTML = "<p>Henüz kimse skor kaydetmedi.</p>";
            return;
        }
        
        const categoryLabels = {
            totalCorrect: "Toplam Doğru",
            addCorrect: "Toplama Doğrusu",
            subCorrect: "Çıkarma Doğrusu",
            mulCorrect: "Çarpma Doğrusu",
            divCorrect: "Bölme Doğrusu",
            blitzCorrect: "Blitz Doğrusu",
            survivalCorrect: "Hayatta Kalma Doğrusu",
            score: "Skor"
        };
        const label = categoryLabels[currentLeaderboardCategory] || "Doğru";

        list.forEach((entry, index) => {
            const div = document.createElement('div');
            div.className = "history-item";
            div.style.display = "flex";
            div.style.justifyContent = "space-between";
            let rank = index + 1;
            let icon = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "🎖️";
            
            // Eğer eski veri ise undefined olabilir, 0 yap
            let val = entry[currentLeaderboardCategory] || 0;
            
            div.innerHTML = `
                <div style="font-weight: bold; font-size: 16px; color: var(--accent);">${icon} ${entry.username} (Seviye ${entry.level || 1})</div>
                <div style="font-weight: bold;">${label}: ${val}</div>
            `;
            lbList.appendChild(div);
        });
    });
}

// 🔊 Ses efektleri
const correctSound = new Audio("https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg");
const wrongSound = new Audio("https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg");
const levelUpSound = new Audio("https://actions.google.com/sounds/v1/impacts/wind_chimes.ogg");
const buyThemeSound = new Audio("https://actions.google.com/sounds/v1/coins/magic_chime.ogg");

// DÜZENLEME: Seslerin daha hızlı yüklenmesi için DOMContentLoaded bekleniyor
document.addEventListener('DOMContentLoaded', () => {
    correctSound.load(); 
    wrongSound.load();
    levelUpSound.load();
    buyThemeSound.load();
});

// --- DOM Elementleri ---
const shopEl = document.getElementById("shop");
const equationEl = document.getElementById("equation");
const answerInput = document.getElementById("answer");
const submitBtn = document.getElementById("submit");
const skipBtn = document.getElementById("skip");
const resultEl = document.getElementById("result");
const hintBtn = document.getElementById("hintBtn");
const startBtn = document.getElementById("startBtn");
const gamePageBtn = document.getElementById("gamePageBtn");
const timeBarEl = document.getElementById("timeBar"); 
const mathSymbolsBg = document.getElementById("mathSymbolsBg");
const soundToggleBtn = document.getElementById("soundToggleBtn"); 
const levelUpModal = document.getElementById("levelUpModal");
const levelUpCloseBtn = document.getElementById("levelUpCloseBtn");
const levelUpNewLevel = document.getElementById("levelUpNewLevel");
const levelUpNewLevel2 = document.getElementById("levelUpNewLevel2");
const levelUpCoinReward = document.getElementById("levelUpCoinReward");
const levelUpHintReward = document.getElementById("levelUpHintReward");

const themeSelector = document.getElementById("themeSelector");
const inputNumeric = document.getElementById("input-numeric");
const xpBar = document.getElementById("xpBar");
const xpText = document.getElementById("xpText");
const gameTimerPill = document.getElementById("game-timer-pill");
const gameTimeBar = document.getElementById("gameTimeBar");
const gameTime = document.getElementById("gameTime");
const gameTimeLabel = document.getElementById("gameTimeLabel");
const questionTimerPill = document.getElementById("question-timer-pill");

const modeDisplayPill = document.getElementById("mode-display");
const modeDisplayText = document.getElementById("modeDisplayText");

// DÜZENLEME: Footer elementleri
const mainFooter = document.getElementById("main-footer");
const homePage = document.getElementById("home");

// Meta Elementler 
const scoreEl = document.getElementById("score");
const correctEl = document.getElementById("correct");
const wrongEl = document.getElementById("wrong");
const levelDisplayEl = document.getElementById("levelDisplay");
const timeEl = document.getElementById("time");
const streakEl = document.getElementById("streak");
const shieldsEl = document.getElementById("shields");
const skipsEl = document.getElementById("skips");

// --- Global Oyun Durumu ---
let wallet = 0;
let lives = 3;
let currentSessionWrongs = [];
let adaptiveHistory = [];
let currentAdaptiveLevel = 1;
let hints = 0;
let skipTokens = 0;
let isSoundEnabled = true; 
let itemsPurchased = 0;
let freezeTime = false; 
let doubleScoreTurns = 0;
let doubleXPTurns = 0;
let doubleWalletTurns = 0;
let streak = 0;
let mulCount = 0; 
let timer = null;
let globalTimer = null;
let globalTimerLeft = 60;
let timeLeft = 0;
let initialTime = 0; 
let currentProblem = null;
let isBlitzMode = false;

let isSurvivalMode = false; 
let survivalStartTime = 10;
let survivalCorrectBonus = 3;
let survivalWrongPenalty = 2;

// XP & Seviye Sistemi
let xp = 0;
let level = 1;
let streakShields = 0;
let customUsername = "";

// YENİ v3.0: Tema Sahipliği - Tüm temalar ücretsiz
let ownedThemes = ['light', 'dark', 'matrix', 'retro', 'gold', 'arctic', 'cyberpunk', 'sakura', 'summer'];

// YENİ v3.0: Tüm temaların haritası
const allThemesMap = {
    light: '☀️ Aydınlık',
    dark: '🌙 Karanlık',
    matrix: '📟 Matrix',
    retro: '🎨 Retro',
    gold: '⚜️ Altın',
    arctic: '❄️ Arktik',
    cyberpunk: '🌃 Cyberpunk',
    sakura: '🌸 Sakura',
    summer: '🏖️ Yaz Tatili'
};

// YENİ v3.0: Arka plan sembolleri
const basicOps = ['+', '−', '×', '÷'];
const mathSymbols = [
    ...basicOps, ...basicOps, ...basicOps, ...basicOps, ...basicOps,
    '(', ')', 'x', 'y', 'z', '=', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'π', '√'
];
const snowflakes = ['❄️', '❅', '❆'];
const digitalRain = ['0', '1'];
const petals = ['🌸', '❁', '❀'];
const summerIcons = ['🏖️', '🌊', '☀️', '🐚', '🦀', '🌴'];

let gameState = {
    running: false,
    mode: "mixed",
    level: 1,
    total: -1, 
    asked: 0,
    correct: 0,
    wrong: 0,
    score: 0,
};

let gameStats = {
    gamesPlayed: 0,
    maxScore: 0,
    totalCorrect: 0,
    totalWrong: 0,
    addCorrect: 0, addWrong: 0,
    subCorrect: 0, subWrong: 0,
    mulCorrect: 0, mulWrong: 0,
    divCorrect: 0, divWrong: 0,
    parenCorrect: 0, parenWrong: 0,
    missingCorrect: 0, missingWrong: 0,
    expCorrect: 0, expWrong: 0,
    algebraCorrect: 0, algebraWrong: 0,
    blitzCorrect: 0, blitzWrong: 0,
    survivalCorrect: 0, survivalWrong: 0,
};

let badges = {
    "math_genius": { icon: "🧮", name: "Matematik Dahisi", desc: "Toplam 50 doğru cevap!", earned: false, condition: 50, type: 'stats' },
    "total_100": { icon: "💯", name: "Yüzlük Seri", desc: "Toplam 100 doğru cevap!", earned: false, condition: 100, type: 'stats' },
    "max_score_500": { icon: "🌟", name: "Yüksek Skor", desc: "Tek oyunda 500 puana ulaş!", earned: false, condition: 500, type: 'score' },
    "blitz_runner": { icon: "⚡", name: "Blitz Canavarı", desc: "Blitz Modu'nda 20 doğru cevap!", earned: false, condition: 20, type: 'stats' },
    "survivor_30": { icon: "⏳", name: "Hayatta Kalan", desc: "Survival modunda 30 doğru cevap!", earned: false, condition: 30, type: 'stats' },
    "add_master": { icon: "➕", name: "Toplama Ustası", desc: "30 toplama işlemini tamamla!", earned: false, condition: 30, type: 'stats' },
    "sub_master": { icon: "➖", name: "Çıkarma Ustası", desc: "30 çıkarma işlemini tamamla!", earned: false, condition: 30, type: 'stats' },
    "mul_master": { icon: "✖️", name: "Çarpma Ustası", desc: "25 çarpma işlemini tamamladın!", earned: false, condition: 25, type: 'stats' },
    "div_master": { icon: "➗", name: "Bölme Ustası", desc: "20 bölme işlemini tamamla!", earned: false, condition: 20, type: 'stats' },
    "algebra_pro": { icon: "📐", name: "Cebir Profesörü", desc: "15 cebirli ifade sorusunu doğru çöz!", earned: false, condition: 15, type: 'stats' },
    "exp_power": { icon: "³", name: "Üslerin Gücü", desc: "15 üslü sayı sorusunu doğru çöz!", earned: false, condition: 15, type: 'stats' },
    "streak5": { icon: "⚡", name: "Seri Başarı", desc: "Art arda 5 doğru cevap!", earned: false, condition: 5, type: 'streak' },
    "streak_10": { icon: "🔥", name: "Alev Topu", desc: "Art arda 10 doğru cevap ver!", earned: false, condition: 10, type: 'streak' },
    "rich": { icon: "💰", name: "Zengin Oyuncu", desc: "500 🪙 biriktir!", earned: false, condition: 500, type: 'wallet' },
    "very_rich": { icon: "💎", name: "Büyük Zengin", desc: "1500 🪙 biriktir!", earned: false, condition: 1500, type: 'wallet' },
    "pauper": { icon: "🪙", name: "Coin Harcayıcı", desc: "Mağazadan 5 eşya satın al!", earned: false, condition: 5, type: 'purchase' },
    "level_5": { icon: "🎖️", name: "Seviye 5", desc: "5. Seviye ulaş!", earned: false, condition: 5, type: 'level' },
    "level_10": { icon: "🏆", name: "Seviye 10", desc: "10. Seviyeye ulaş!", earned: false, condition: 10, type: 'level' },
    "level_15": { icon: "👑", name: "Seviye 15", desc: "15. Seviyeye ulaş!", earned: false, condition: 15, type: 'level' },
    "collector": { icon: "🎨", name: "Tema Koleksiyoncusu", desc: "Tüm temaları satın al!", earned: false, condition: 9, type: 'themes' },
};

// --- Global Yardımcı Fonksiyonlar ---

function showPage(pageId) {
    document.querySelectorAll('.wrap > div').forEach(div => {
        div.classList.add('hidden');
    });
    document.getElementById(pageId).classList.remove('hidden');
    
    if (pageId === 'home') {
        mainFooter.style.display = 'none';
    } else {
        mainFooter.style.display = 'block';
    }
    
    if (pageId === 'home' || pageId === 'how' || pageId === 'about' || pageId === 'stats') {
        if (gameState.running) {
            endGame('Oyun durduruldu.');
        }
    }
    shopEl.classList.add('hidden');
    if (pageId === 'stats') {
        renderStats();
    }
}

function openShop() {
    shopEl.classList.toggle('hidden');
    if (!shopEl.classList.contains('hidden')) {
        updateThemeShopUI();
    }
}

function startQuickGame(mode) {
    document.getElementById("mode").value = mode;
    document.getElementById("level").value = (mode === 'speed' || mode === 'survival') ? '2' : '1'; 
    document.getElementById("questionCount").value = (mode === 'speed' || mode === 'survival') ? '-1' : '10';
    startGame();
}

// --- Local Storage ve Profil Fonksiyonları ---

function saveProfile() {
    const dataToSave = { 
        wallet, lives, hints, badges, gameStats, isSoundEnabled, itemsPurchased,
        xp, level, streakShields, ownedThemes, doubleWalletTurns, skipTokens, customUsername
    };
    
    // Yerel Kayıt
    localStorage.setItem("mathProfileV3.0", JSON.stringify(dataToSave));
    
    // Firebase Kaydı
    if (currentUser && database) {
        database.ref('users/' + currentUser.uid).set(dataToSave).catch(err => console.error(err));
        
        // Yenilenmiş Liderlik Tablosu Verisi
        let displayName = customUsername || currentUser.displayName || currentUser.email.split('@')[0];
        database.ref('leaderboard/' + currentUser.uid).set({
            username: displayName,
            score: gameStats.maxScore || 0,
            level: level,
            totalCorrect: gameStats.totalCorrect || 0,
            addCorrect: gameStats.addCorrect || 0,
            subCorrect: gameStats.subCorrect || 0,
            mulCorrect: gameStats.mulCorrect || 0,
            divCorrect: gameStats.divCorrect || 0,
            blitzCorrect: gameStats.blitzCorrect || 0,
            survivalCorrect: gameStats.survivalCorrect || 0
        }).catch(err => console.error(err));
    }
}

function applyProfileData(p) {
    wallet = p.wallet || 0;
    lives = p.lives !== undefined ? p.lives : 3;
    hints = p.hints || 0;
    skipTokens = p.skipTokens || 0;
    isSoundEnabled = p.isSoundEnabled !== undefined ? p.isSoundEnabled : true; 
    itemsPurchased = p.itemsPurchased || 0;
    
    xp = p.xp || 0;
    level = p.level || 1;
    streakShields = p.streakShields || 0;
    doubleWalletTurns = p.doubleWalletTurns || 0;
    customUsername = p.customUsername || "";
    
    if(document.getElementById("customUsernameInput")) {
        document.getElementById("customUsernameInput").value = customUsername;
    }

    // Tüm temalar ücretsiz
    ownedThemes = ['light', 'dark', 'matrix', 'retro', 'gold', 'arctic', 'cyberpunk', 'sakura', 'summer'];

    if (p.gameStats) {
       Object.assign(gameStats, p.gameStats);
       if (p.gameStats.speedCorrect !== undefined && gameStats.blitzCorrect === 0) {
           gameStats.blitzCorrect = p.gameStats.speedCorrect;
           gameStats.blitzWrong = p.gameStats.speedWrong;
       }
    }
    
    if (p.badges) {
        for (let key in p.badges) {
            if (badges[key] && p.badges[key]) {
                badges[key].earned = p.badges[key].earned;
            }
        }
    }
    
    updateMeta();
    renderBadges();
    updateXPBar();
    updateThemeSelectorUI();
}

function loadProfileFromLocal() {
    let d = localStorage.getItem("mathProfileV3.0") || 
            localStorage.getItem("mathProfileV3.5") || 
            localStorage.getItem("mathProfileV3.4") || 
            localStorage.getItem("mathProfileV3.3") || 
            localStorage.getItem("mathProfileV3");
            
    if (d) {
        let p = JSON.parse(d);
        applyProfileData(p);
    } else {
        updateMeta();
        renderBadges();
        updateXPBar();
        updateThemeSelectorUI();
    }
}

function loadProfile() {
    loadProfileFromLocal();
}

function saveCustomUsername() {
    const input = document.getElementById("customUsernameInput");
    if(input) {
        customUsername = input.value.trim();
        saveProfile();
        const msg = document.getElementById("usernameMsg");
        if(msg) {
            msg.style.display = "block";
            setTimeout(() => { msg.style.display = "none"; }, 3000);
        }
        updateLeaderboard();
    }
}

function resetProfile() {
    if (confirm("Emin misin? TÜM ilerlemen (Bakiye, Seviye, İstatistikler, Rozetler) sıfırlanacak! (Satın alınan temalar hariç)")) {
        
        localStorage.removeItem("mathProfileV3.0");
        localStorage.removeItem("mathProfileV3.5");
        localStorage.removeItem("mathProfileV3.4");
        localStorage.removeItem("mathProfileV3.3");
        localStorage.removeItem("mathProfileV3");
        wallet = 0;
        lives = 3;
        hints = 0;
        skipTokens = 0;
        itemsPurchased = 0;
        xp = 0;
        level = 1;
        streakShields = 0;
        doubleWalletTurns = 0;
        gameState = { running: false, mode: "mixed", level: 1, total: -1, asked: 0, correct: 0, wrong: 0, score: 0 };
        
        gameStats = {
            gamesPlayed: 0, maxScore: 0, totalCorrect: 0, totalWrong: 0,
            addCorrect: 0, addWrong: 0, subCorrect: 0, subWrong: 0, mulCorrect: 0, mulWrong: 0, 
            divCorrect: 0, divWrong: 0, parenCorrect: 0, parenWrong: 0, missingCorrect: 0, missingWrong: 0,
            expCorrect: 0, expWrong: 0, algebraCorrect: 0, algebraWrong: 0,
            blitzCorrect: 0, blitzWrong: 0, survivalCorrect: 0, survivalWrong: 0,
        };
        for (let k in badges) {
            badges[k].earned = false;
        }
        
        clearInterval(timer);
        clearInterval(globalTimer);
        equationEl.textContent = 'Profil sıfırlandı. Yeni bir başlangıç!';
        
        endGame(null); 
        updateMeta();
        renderBadges();
        updateXPBar();
        updateThemeSelectorUI();
    }
}

function resetStats() {
    if (confirm("Emin misin? Tüm istatistiklerin (Toplam Doğru, Yanlış, Oranlar) ve ilgili rozetlerin sıfırlanacak! (Bakiye, Seviye ve Temalar korunacak)")) {
        
        gameStats = {
            gamesPlayed: 0, maxScore: 0, totalCorrect: 0, totalWrong: 0,
            addCorrect: 0, addWrong: 0, subCorrect: 0, subWrong: 0, mulCorrect: 0, mulWrong: 0, 
            divCorrect: 0, divWrong: 0, parenCorrect: 0, parenWrong: 0, missingCorrect: 0, missingWrong: 0,
            expCorrect: 0, expWrong: 0, algebraCorrect: 0, algebraWrong: 0,
            blitzCorrect: 0, blitzWrong: 0, survivalCorrect: 0, survivalWrong: 0,
        };
        
        for (let k in badges) {
            let b = badges[k];
            if (b.type === 'stats' || b.type === 'streak' || b.type === 'score') {
                 badges[k].earned = false;
            }
        }
        
        notify("İstatistikler ve ilgili rozetler sıfırlandı.", true);
        renderBadges();
        renderStats();
        saveProfile();
    }
}

// --- UI Güncelleme Fonksiyonları ---

function getXPForNextLevel(lvl) {
    return Math.floor(100 * Math.pow(1.2, lvl - 1));
}

function addXP(amount) {
    if (!gameState.running) return;
    
    if (doubleXPTurns > 0) {
        amount *= 2;
        doubleXPTurns--;
        notify(`⚡ 2x XP! Kalan: ${doubleXPTurns} soru.`, true);
    }
    
    xp += amount;
    let xpNeeded = getXPForNextLevel(level);

    let levelUp = false;
    while (xp >= xpNeeded) {
        levelUp = true;
        xp -= xpNeeded;
        level++;
        
        let coinReward = 50 + (level * 10);
        let hintReward = 1;
        wallet += coinReward;
        hints += hintReward;
        
        showLevelUpModal(level, coinReward, hintReward);
        
        if(isSoundEnabled) levelUpSound.play().catch(()=>{});

        xpNeeded = getXPForNextLevel(level);
    }
    
    updateXPBar();
    checkBadges();
}

function updateXPBar() {
    const xpNeeded = getXPForNextLevel(level);
    const percentage = Math.min(100, (xp / xpNeeded) * 100);
    
    xpBar.style.width = `${percentage}%`;
    xpText.textContent = `XP: ${xp} / ${xpNeeded}`;
    levelDisplayEl.textContent = `${level} 🎖️`;
}

function updateOperationStats(operationType, isCorrect) {
    if (!currentProblem) return; 
    
    const type = operationType === 'mixed' ? currentProblem.type : operationType;
    const suffix = isCorrect ? 'Correct' : 'Wrong';
    const key = type + suffix;

    if (gameStats.hasOwnProperty(key)) {
        gameStats[key]++;
    }
    
    if (isBlitzMode) {
        gameStats['blitz' + suffix]++;
    }
    
    if (isSurvivalMode) {
        gameStats['survival' + suffix]++;
    }
}

function checkBadges() { 
    if (gameStats.totalCorrect >= badges.math_genius.condition) earnBadge("math_genius"); 
    if (gameStats.totalCorrect >= badges.total_100.condition) earnBadge("total_100");
    if (gameStats.mulCorrect >= badges.mul_master.condition) earnBadge("mul_master");
    if (gameStats.addCorrect >= badges.add_master.condition) earnBadge("add_master");
    if (gameStats.subCorrect >= badges.sub_master.condition) earnBadge("sub_master");
    if (gameStats.divCorrect >= badges.div_master.condition) earnBadge("div_master");
    if (gameStats.blitzCorrect >= badges.blitz_runner.condition) earnBadge("blitz_runner");
    if (gameStats.survivalCorrect >= badges.survivor_30.condition) earnBadge("survivor_30");
    if (gameStats.algebraCorrect >= badges.algebra_pro.condition) earnBadge("algebra_pro");
    if (gameStats.expCorrect >= badges.exp_power.condition) earnBadge("exp_power");
    if (streak >= badges.streak5.condition) earnBadge("streak5"); 
    if (streak >= badges.streak_10.condition) earnBadge("streak_10");
    if (wallet >= badges.rich.condition) earnBadge("rich"); 
    if (wallet >= badges.very_rich.condition) earnBadge("very_rich");
    if (itemsPurchased >= badges.pauper.condition) earnBadge("pauper");
    if (level >= badges.level_5.condition) earnBadge("level_5");
    if (level >= badges.level_10.condition) earnBadge("level_10");
    if (level >= badges.level_15.condition) earnBadge("level_15");
    if (ownedThemes.length >= badges.collector.condition) earnBadge("collector");
}

function earnBadge(k) { 
    let b = badges[k]; 
    if (b && !b.earned) { 
        b.earned = true; 
        renderBadges();
        notify("🏅 " + b.icon + " " + b.name + " rozetini kazandın!"); 
        celebrate(); 
    } 
}

function createRatioBar(title, correct, wrong) {
    const total = correct + wrong;
    if (total === 0) return ""; 

    const ratio = (correct / total) * 100;
    const ratioText = `${correct} D / ${wrong} Y (${ratio.toFixed(0)}% Başarı)`;
    
    const html = `
        <div class="ratio-item">
            <div class="ratio-header">
                <span>${title}</span>
                <span>${ratioText}</span>
            </div>
            <progress value="${correct}" max="${total}"></progress>
            <div class="ratio-text" style="color: #fff; text-shadow: 0 1px 2px #000;">${ratio.toFixed(0)}%</div>
        </div>
    `;
    return html;
}

function renderStats() {
    document.getElementById("stat-games").textContent = gameStats.gamesPlayed;
    document.getElementById("stat-max-score").textContent = gameStats.maxScore;
    document.getElementById("stat-total-correct").textContent = gameStats.totalCorrect;
    document.getElementById("stat-total-wrong").textContent = gameStats.totalWrong;

    const container = document.getElementById("operationStatsContainer");
    container.innerHTML = "";
    
    const operationMap = {
        "Toplama (+)" : { c: gameStats.addCorrect, w: gameStats.addWrong },
        "Çıkarma (-)" : { c: gameStats.subCorrect, w: gameStats.subWrong },
        "Çarpma (×)" : { c: gameStats.mulCorrect, w: gameStats.mulWrong },
        "Bölme (÷)" : { c: gameStats.divCorrect, w: gameStats.divWrong },
        "Parantezli" : { c: gameStats.parenCorrect, w: gameStats.parenWrong },
        "Eksik Sayı (X)" : { c: gameStats.missingCorrect, w: gameStats.missingWrong },
        "Üslü Sayılar" : { c: gameStats.expCorrect, w: gameStats.expWrong },
        "Cebirli İfadeler" : { c: gameStats.algebraCorrect, w: gameStats.algebraWrong },
        "Blitz Modu" : { c: gameStats.blitzCorrect, w: gameStats.blitzWrong },
        "Hayatta Kalma" : { c: gameStats.survivalCorrect, w: gameStats.survivalWrong },
    };
    for (const [title, data] of Object.entries(operationMap)) {
        container.innerHTML += createRatioBar(title, data.c, data.w);
    }

    const totalContainer = document.getElementById("totalRatioContainer");
    totalContainer.innerHTML = createRatioBar(
        "Genel Başarı Oranı",
        gameStats.totalCorrect,
        gameStats.totalWrong
    );
}

function updateMeta() {
    scoreEl.textContent = gameState.score;
    correctEl.textContent = gameState.correct;
    wrongEl.textContent = gameState.wrong;
    streakEl.textContent = streak; 
    shieldsEl.textContent = streakShields; 
    skipsEl.textContent = skipTokens;

    document.getElementById("wallet").textContent = wallet;
    document.getElementById("wallet2").textContent = wallet;
    document.getElementById("lives").textContent = lives;
    document.getElementById("hints").textContent = hints;
    
    questionTimerPill.style.display = gameState.running && !freezeTime && !isBlitzMode && !isSurvivalMode ? 'flex' : 'none';
    gameTimerPill.style.display = gameState.running && (isBlitzMode || isSurvivalMode) ? 'flex' : 'none';
    
    inputNumeric.classList.toggle('hidden', !gameState.running);
    
    answerInput.disabled = !gameState.running;
    submitBtn.disabled = !gameState.running;
    skipBtn.disabled = !gameState.running;
    hintBtn.disabled = !gameState.running || hints <= 0;
    
    startBtn.textContent = gameState.running ? "Oyunu Durdur" : "Oyuna Başlat";
    gamePageBtn.textContent = gameState.running ? "Oyunu Durdur" : "Ayarlar/Başlat";
    soundToggleBtn.textContent = isSoundEnabled ? "🔊 Ses Açık" : "🔇 Ses Kapalı";
    soundToggleBtn.classList.toggle('secondary', isSoundEnabled);

    if (gameState.running) {
        modeDisplayPill.classList.remove('hidden');
        let modeName = document.getElementById("mode").options[document.getElementById("mode").selectedIndex].text;
        modeDisplayText.textContent = modeName;
    } else {
        modeDisplayPill.classList.add('hidden');
    }

    saveProfile();
}

function renderBadges() {
    let cont = document.getElementById("badges");
    cont.innerHTML = "";
    for (let k in badges) {
        let b = badges[k];
        let div = document.createElement("div");
        div.className = "badge " + (b.earned ? "earned" : "locked");
        div.innerHTML = `<div style="font-size:18px">${b.icon}</div><div>${b.name}</div><div style="font-size:12px;color:var(--text-light)">${b.desc}</div>`;
        cont.appendChild(div);
    }
}

function updateThemeSelectorUI() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    themeSelector.innerHTML = '';
    
    for (const themeKey in allThemesMap) {
        if (ownedThemes.includes(themeKey)) {
            const option = document.createElement('option');
            option.value = themeKey;
            option.textContent = allThemesMap[themeKey];
            themeSelector.appendChild(option);
        }
    }
    
    themeSelector.value = currentTheme;
    updateThemeShopUI();
}

function updateThemeShopUI() {
    const purchasableThemes = [
        { id: 'buy-theme-matrix', key: 'matrix', cost: 150 },
        { id: 'buy-theme-retro', key: 'retro', cost: 200 },
        { id: 'buy-theme-gold', key: 'gold', cost: 200 },
        { id: 'buy-theme-arctic', key: 'arctic', cost: 200 },
        { id: 'buy-theme-cyberpunk', key: 'cyberpunk', cost: 250 },
        { id: 'buy-theme-sakura', key: 'sakura', cost: 300 },
        { id: 'buy-theme-summer', key: 'summer', cost: 300 }
    ];
    
    purchasableThemes.forEach(theme => {
        const btn = document.getElementById(theme.id);
        if (btn) {
            if (ownedThemes.includes(theme.key)) {
                btn.disabled = true;
                btn.textContent = "Satın Alındı";
            } else {
                btn.disabled = false;
                btn.textContent = `${theme.cost} 🪙`;
            }
        }
    });
}

function setTheme(themeName) {
    if (!ownedThemes.includes(themeName)) {
        themeName = 'light'; 
    }
    
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem("mathThemeV3.0", themeName);
    themeSelector.value = themeName;
    
    setTimeout(() => {
        const symbolColor = getComputedStyle(document.documentElement).getPropertyValue('--accent');
        const symbolOpacity = (themeName === 'light' || themeName === 'arctic') ? '0.25' : '0.5';
        document.querySelectorAll('.math-symbol').forEach(s => {
            s.style.color = symbolColor;
            s.style.opacity = symbolOpacity;
        });
        
        initMathSymbols();
    }, 50);
}

function toggleSound() {
    isSoundEnabled = !isSoundEnabled;
    updateMeta();
    notify(isSoundEnabled ? "Ses efektleri açıldı." : "Ses efektleri kapatıldı.", true);
}

// --- Ses ve Efektler ---

function celebrate() {
    if (isSoundEnabled) {
        correctSound.currentTime = 0;
        correctSound.play().catch(() => { });
    }
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
}

function speakWrong() {
    if (isSoundEnabled) {
        wrongSound.currentTime = 0;
        wrongSound.play().catch(() => { });
    }
}

function notify(message, isGood = true) {
    let n = document.createElement("div");
    n.className = "notify";
    n.style.backgroundColor = isGood ? 'var(--good)' : 'var(--bad)';
    n.textContent = message;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3500);
}

function showLevelUpModal(newLvl, coin, hint) {
    levelUpNewLevel.textContent = `Seviye ${newLvl}`;
    levelUpNewLevel2.textContent = newLvl;
    levelUpCoinReward.textContent = coin;
    levelUpHintReward.textContent = hint;
    
    levelUpModal.classList.remove('hidden');
}

function hideLevelUpModal() {
    levelUpModal.classList.add('hidden');
}

// --- Oyun Mekanikleri ---

function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

function pickRange(l) {
    if (l == 1) return { min: -10, max: 10, absMax: 20 };
    if (l == 2) return { min: -30, max: 30, absMax: 50 };
    return { min: -100, max: 100, absMax: 100 };
}
function sup(n) { 
  const supMap = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  return String(n).split('').map(c => supMap[c] || c).join('');
}
function formatAlgebra(n) {
    return n == 1 ? "x" : n == -1 ? "-x" : n == 0 ? "" : n + "x";
}

function getEffectiveLevel() {
    if (gameState.level === "adaptive") return currentAdaptiveLevel;
    return Number(gameState.level);
}

function makeProblem() {
    const m = gameState.mode;
    const lvl = getEffectiveLevel();
    
    let t;
    if (m === "speed" || m === "mixed" || m === "survival") {
        const mixPool = ["add", "sub", "mul", "div", "paren", "missing", "exp", "algebra"];
        t = mixPool[randInt(0, mixPool.length - 1)];
    } else {
        t = m;
    }

    const range = pickRange(lvl);
    let a, b, ans, op, text;
    
    if (t === "paren") {
        let x = randInt(-10, 10), y = randInt(-10, 10), z = randInt(-5, 5);
        if (randInt(0, 1) === 0) {
            let parOp = randInt(0, 1) === 0 ? "+" : "-";
            ans = parOp === "+" ? (x + y) * z : (x - y) * z;
            text = `${z} × (${x < 0 ? "(" + x + ")" : x} ${parOp} ${y < 0 ? "(" + y + ")" : y})`;
        } else {
            let parOp1 = randInt(0, 1) === 0 ? "+" : "-";
            let parOp2 = randInt(0, 1) === 0 ? "+" : "-";
            let inner = parOp2 === "+" ? y + z : y - z;
            ans = parOp1 === "+" ? x + inner : x - inner;
            text = `${x < 0 ? "(" + x + ")" : x} ${parOp1} (${y < 0 ? "(" + y + ")" : y} ${parOp2} ${z < 0 ? "(" + z + ")" : z})`;
        }
    } else if (t === "algebra") {
        let c1 = randInt(-10, 10);
        let c2 = randInt(-10, 10);
        while (c1 === 0 && c2 === 0) { c1 = randInt(-10, 10); c2 = randInt(-10, 10); }
        if (randInt(0, 1) === 0) {
            ans = c1 + c2; 
            text = `${formatAlgebra(c1)} + ${c2 < 0 ? "(" + formatAlgebra(c2) + ")" : formatAlgebra(c2)}`;
        } else {
            ans = c1 - c2; 
            text = `${formatAlgebra(c1)} - ${c2 < 0 ? "(" + formatAlgebra(c2) + ")" : formatAlgebra(c2)}`;
        }
        text = `${text} = ?`;
        currentProblem = { text: text, ans: ans, type: t, resultText: formatAlgebra(ans) }; 
        return currentProblem;
    } else if (t === "exp") {
        let baseRange = (lvl == 1) ? 4 : (lvl == 2) ? 6 : 8;
        let maxExp = (lvl == 1) ? 3 : (lvl == 2) ? 4 : 5;
        let exponent = randInt(2, maxExp); 
        if (lvl === 3 && randInt(0, 5) === 0) exponent = 0;
        let base = randInt(-1 * baseRange, baseRange); 
        if ((base === 0 && exponent === 0) || Math.abs(base) === 1) return makeProblem();
        ans = Math.pow(base, exponent); 
        if (ans > 2000 || ans < -2000) return makeProblem();
        text = `${base < 0 || base === 0 ? "(" + base + ")" : base}${sup(exponent)}`;
    } else if (t === "missing") {
        a = randInt(range.min, range.max);
        let opType = ["add", "sub", "mul"][randInt(0, 2)];
        op = opType === "add" ? "+" : opType === "sub" ? "-" : "×";
        let result;
        if (opType === "add") result = a + randInt(range.min, range.max);
        else if (opType === "sub") result = a - randInt(range.min, range.max);
        else {
            b = randInt(-5, 5);
            if (b === 0) b = 1;
            result = a * b;
        }
        if (randInt(0, 1) === 0) {
            text = `${a < 0 ? "(" + a + ")" : a} ${op} X = ${result}`;
            ans = opType === "add" ? result - a : opType === "sub" ? a - result : result / a;
        } else {
            text = `X ${op} ${a < 0 ? "(" + a + ")" : a} = ${result}`;
            ans = opType === "add" ? result - a : opType === "sub" ? result + a : result / a;
        }
        if (ans % 1 !== 0) return makeProblem();
        
    } else { // Basit İşlemler
        a = randInt(range.min, range.max);
        b = randInt(range.min, range.max);
        switch (t) { 
            case "add": op = "+"; ans = a + b; break;
            case "sub": op = "-"; ans = a - b; break; 
            case "mul": 
                a = randInt(-10, 10); b = randInt(-10, 10);
                op = "×"; ans = a * b; break;
            case "div": 
                let divisor = randInt(1, lvl === 3 ? 10 : 5);
                if (randInt(0, 1) === 0) divisor *= -1; 
                ans = randInt(-10, 10); 
                a = divisor * ans; 
                b = divisor;
                op = "÷"; 
                if (b === 0) return makeProblem(); 
                break;
        }
        text = `${a < 0 ? "(" + a + ")" : a} ${op} ${b < 0 ? "(" + b + ")" : b}`;
    }
    
    if (t === "mul") mulCount++;
    
    return { text: text + (t !== "missing" && t !== "exp" && t !== "algebra" ? " = ?" : ""), ans: ans, type: t };
}

function loseLife() {
    lives--;
    if (lives <= 0) {
        endGame("Tüm canlar bitti! Skor: " + gameState.score);
    }
    updateMeta();
}

function recordAdaptive(isCorrect) {
    if (gameState.level !== "adaptive") return;
    adaptiveHistory.push(isCorrect);
    if (adaptiveHistory.length > 10) {
        adaptiveHistory.shift();
    }
    
    if (adaptiveHistory.length >= 5) {
        let correctCount = adaptiveHistory.filter(x => x).length;
        let ratio = correctCount / adaptiveHistory.length;
        
        if (ratio >= 0.8 && currentAdaptiveLevel < 3) {
            currentAdaptiveLevel++;
            notify(`🤖 AI: Başarılısın! Zorluk seviyesi ${currentAdaptiveLevel}'e yükseltildi.`, true);
            adaptiveHistory = []; 
        } else if (ratio <= 0.4 && currentAdaptiveLevel > 1) {
            currentAdaptiveLevel--;
            notify(`🤖 AI: Zorlandığını fark ettim. Zorluk seviyesi ${currentAdaptiveLevel}'e düşürüldü.`, false);
            adaptiveHistory = [];
        }
    }
}

function handleWrongAnswer(correctAnswer) {
    gameState.wrong++;
    recordAdaptive(false);
    
    currentSessionWrongs.push({
        question: currentProblem.text,
        userAnswer: answerInput.value,
        correctAnswer: correctAnswer,
        type: currentProblem.type,
        resultText: currentProblem.resultText
    });
    
    gameState.score = Math.max(0, gameState.score - 5);
    
    if (streakShields > 0) {
        streakShields--;
        notify("🛡️ Seri Kalkanı kullanıldı! Seri korunuyor.", true);
    } else {
        streak = 0;
    }
    
    gameStats.totalWrong++;
    updateOperationStats(currentProblem.type, false);
    
    let resultMessage;
    if (currentProblem.type === 'algebra') {
        resultMessage = `❌ Yanlış! Doğru cevap: ${currentProblem.resultText} (Yani katsayısı ${correctAnswer})`;
    } else { 
        resultMessage = `❌ Yanlış! Doğru cevap: ${correctAnswer}`; 
    }
    resultEl.textContent = resultMessage;
    
    speakWrong(); 
    if (!isBlitzMode && !isSurvivalMode) loseLife();
    
    equationEl.classList.add('wrong-flash', 'wrong-shake');
    setTimeout(() => equationEl.classList.remove('wrong-flash', 'wrong-shake'), 400);

    answerInput.value = ""; 
    answerInput.focus(); 
    currentProblem = null; 
    const timeout = 1500; 
    setTimeout(nextQuestion, timeout); 
    
    if (isSurvivalMode) {
        globalTimerLeft -= survivalWrongPenalty;
        notify(`-${survivalWrongPenalty} Saniye!`, false);
        updateGameTimerUI();
        if (globalTimerLeft <= 0) {
            globalTimerLeft = 0;
            endGame(`⏳ Süre Bitti! Skor: ${gameState.score}`);
        }
    }
}

function handleCorrectAnswer() {
    gameState.correct++;
    recordAdaptive(true);
    let pts = 10;
    if (doubleScoreTurns > 0) { 
        pts *= 2; 
        doubleScoreTurns--; 
        notify(`🔥 2x Puan! Kalan: ${doubleScoreTurns} soru.`, true);
    }
    streak++;
    if (streak % 5 === 0) { 
        pts += 5 * streak; 
        notify(`🔥 ${streak} Serisi! Bonus +${5*streak} puan!`, true); 
    }
    gameState.score += pts;
    
    const effectiveLevel = getEffectiveLevel();
    let bakiyeKazan = 10;
    if (effectiveLevel === 2) {
        bakiyeKazan = 15;
    } else if (effectiveLevel === 3) {
        bakiyeKazan = 20;
    }
    if (isBlitzMode || isSurvivalMode) {
        bakiyeKazan = 15;
    }
    
    if (doubleWalletTurns > 0) {
        bakiyeKazan *= 2;
        doubleWalletTurns--;
        notify(`💰 2x Bakiye! Kalan: ${doubleWalletTurns} soru.`, true);
    }
    
    wallet += bakiyeKazan;

    let xpGained = 5 + (effectiveLevel * 3) + (currentProblem.type === 'algebra' ? 5 : 0);
    addXP(xpGained);

    gameStats.totalCorrect++;
    updateOperationStats(currentProblem.type, true);
    
    resultEl.textContent = "✅ Doğru!";
    celebrate();
    equationEl.classList.add('correct-flash');
    setTimeout(() => equationEl.classList.remove('correct-flash'), 400);
    
    currentProblem = null;
    const timeout = (isBlitzMode || isSurvivalMode) ? 200 : 700;
    setTimeout(nextQuestion, timeout);
    
    if (isSurvivalMode) {
        globalTimerLeft += survivalCorrectBonus;
        notify(`+${survivalCorrectBonus} Saniye! ⏱️`, true);
        updateGameTimerUI();
    }
}

function checkAnswer() {
    if (!gameState.running || currentProblem === null) return;
    
    const correctAnswer = currentProblem.ans;
    let userAnswer = Number(answerInput.value);
    if (answerInput.value.trim() === "") return; 

    clearInterval(timer);
    
    if (userAnswer === correctAnswer) { 
        handleCorrectAnswer(); 
    } else { 
        handleWrongAnswer(correctAnswer); 
    }
    
    updateMeta();
}

function nextQuestion() {
    if (!gameState.running) return;
    
    if ((isBlitzMode || isSurvivalMode) && globalTimerLeft <= 0) {
        return;
    }
    
    if (gameState.total !== -1 && gameState.asked >= gameState.total) { 
        endGame(`Tur bitti! ${gameState.correct} doğru ile Skor: ${gameState.score}`);
        return; 
    } 

    gameState.asked++; 
    currentProblem = makeProblem(); 
    equationEl.innerHTML = currentProblem.text; 
    answerInput.value = ""; 
    resultEl.textContent = ""; 
    
    answerInput.focus();
    
    startTimer();
    updateMeta();
}

function skipQuestion() {
    if (!gameState.running || currentProblem === null) return;
    clearInterval(timer);
    
    if (skipTokens > 0) {
        skipTokens--;
        notify("🎟️ Pas hakkı kullanıldı! Soru atlanıyor.", true);
        
        currentProblem = null; 
        setTimeout(nextQuestion, 700);
        updateMeta();
        return;
    }

    notify("🎟️ Kullanılabilir pas hakkınız yok!", false);
}

function useHint() { 
    if (hints > 0 && currentProblem) { 
        hints--;
        const ans = currentProblem.ans; 
        let hintText = ""; 
        const firstChar = String(ans).charAt(0);
        if (currentProblem.type === 'algebra') { 
            hintText = `Cebirli ifade sadeleşmiş haliyle katsayısı ${firstChar} ile başlıyor.`;
        } else {
            hintText = `Cevap: ${firstChar} ile başlıyor.`;
        }
        notify("💡 İpucu: " + hintText, true);
        updateMeta(); 
    } else if (currentProblem) {
        notify("Yeterli ipucu hakkınız yok. Mağazadan satın alın!", false);
    }
}

function showWrongHistory() {
    const listEl = document.getElementById("wrongHistoryList");
    listEl.innerHTML = "";
    
    currentSessionWrongs.forEach((item) => {
        let div = document.createElement('div');
        div.className = "history-item";
        
        let qDiv = document.createElement('div');
        qDiv.className = "history-question";
        qDiv.textContent = `Soru: ${item.question.replace(' = ?', '')} = ?`;
        
        let ansDiv = document.createElement('div');
        ansDiv.className = "history-answers";
        ansDiv.innerHTML = `<span style="color: var(--bad);">Senin Cevabın: ${item.userAnswer || "Boş/Pas"}</span> | <span style="color: var(--good);">Doğru Cevap: ${item.correctAnswer}</span>`;
        
        let expDiv = document.createElement('div');
        expDiv.className = "history-explanation hidden";
        
        let explanation = "";
        switch(item.type) {
            case "add": case "sub": case "mul": case "div":
                explanation = "Temel işlem kuralı: İşaretlere dikkat et. Aynı işaretlilerin çarpımı/bölümü pozitif, zıt işaretliler negatif olur. Toplama ve çıkarmada büyüklükleri ve işaretleri doğru hesaplamalısın.";
                break;
            case "paren":
                explanation = "İşlem Önceliği Kuralı: Önce parantez içindeki işlemler yapılır, ardından çarpma/bölme, en son toplama/çıkarma işlemleri gerçekleştirilir.";
                break;
            case "algebra":
                explanation = `Cebirsel ifadelerde benzer terimlerin (x'li terimler) katsayıları toplanır veya çıkarılır. Burada doğru katsayı ${item.correctAnswer} olmalıydı.`;
                break;
            case "exp":
                explanation = "Üslü sayılarda, tabandaki sayı kendisi ile üs kadar çarpılır. Negatif bir sayının çift kuvveti pozitif, tek kuvveti negatiftir.";
                break;
            case "missing":
                explanation = "Bilinmeyeni (X) bulmak için, eşitsizliğin diğer tarafına işlemi tersine çevirerek atmalısın (örneğin toplama ise çıkarma olarak geçer).";
                break;
            default:
                explanation = "Daha dikkatli olmalısın. İşaretlere ve işlemlere tekrar göz at.";
        }
        expDiv.textContent = "💡 Açıklama: " + explanation;
        
        div.appendChild(qDiv);
        div.appendChild(ansDiv);
        div.appendChild(expDiv);
        
        div.onclick = () => {
            expDiv.classList.toggle('hidden');
        };
        
        listEl.appendChild(div);
    });
    
    document.getElementById("wrongHistoryModal").classList.remove('hidden');
}

function endGame(message) { 
    clearInterval(timer); 
    clearInterval(globalTimer);
    globalTimer = null;
    hideLevelUpModal();
    
    if (message) { 
        equationEl.textContent = message;
        if (message.includes('Bitti') || message.includes('Tur bitti')) {
            gameStats.maxScore = Math.max(gameStats.maxScore, gameState.score);
            gameStats.gamesPlayed++;
            
            if (gameState.score >= badges.max_score_500.condition) {
                 earnBadge("max_score_500");
            }
            
            if (message.includes('Game Over') || message.includes('Süre Bitti')) {
                notify("Oyun Bitti! Profilini kontrol et.", false);
            } else {
                celebrate();
                notify("Tebrikler! İstatistiklerini kontrol et.", true);
            }
            
            if (currentSessionWrongs.length > 0) {
                let btn = document.createElement('button');
                btn.textContent = "🧐 Yaptığım Hataları Gör";
                btn.className = "secondary";
                btn.style.marginTop = "15px";
                btn.style.width = "100%";
                btn.style.fontSize = "18px";
                btn.onclick = showWrongHistory;
                equationEl.appendChild(document.createElement('br'));
                equationEl.appendChild(btn);
            }

        } else {
            notify(message, false);
        }
    } else {
        equationEl.textContent = 'Oyun Durduruldu.';
    }
    
    gameState.running = false; 
    resultEl.textContent = ""; 
    timeEl.textContent = "—"; 
    currentProblem = null;
    isBlitzMode = false;
    isSurvivalMode = false;
    updateMeta(); 
}

function buyItem(item, cost) {
    
    // Tema satın alma
    if (item.startsWith('theme_')) {
        const themeName = item.split('_')[1];
        if (ownedThemes.includes(themeName)) {
            notify("Bu temaya zaten sahipsin!", false);
            return;
        }
        if (wallet < cost) {
            notify("Yetersiz Bakiye!", false);
            return;
        }
        
        wallet -= cost;
        ownedThemes.push(themeName);
        notify(`🎨 ${allThemesMap[themeName]} teması satın alındı!`, true);
        if(isSoundEnabled) buyThemeSound.play().catch(()=>{});
        
        updateThemeSelectorUI();
        setTheme(themeName);
        checkBadges();
        updateMeta();
        return;
    }
    
    // Diğer eşyalar
    if (wallet < cost) {
        notify("Yetersiz Bakiye! Daha çok soru çözmelisin.", false);
        return;
    }
    wallet -= cost; 
    itemsPurchased++;
    let message = ""; 
    switch(item) { 
        case 'life': lives += 1; message = "❤️ Ekstra Can satın alındı!"; break; 
        case 'hint': hints += 1; message = "💡 İpucu Hakkı satın alındı!"; break; 
        case 'shield': streakShields += 1; message = "🛡️ Seri Kalkanı satın alındı!"; break;
        case 'konfeti': confetti({ particleCount: 200, spread: 180, origin: { y: 0.5 } });
        message = "🎉 Süper Konfeti! Kutlama zamanı!"; break; 
        case 'freeze': 
        freezeTime = true;
        message = "⏱️ Zaman Dondurucu aktif edildi! (1 Soru)"; break;
        case 'double': 
        doubleScoreTurns = 5;
        message = "🔥 2x Puan Gücü aktif edildi! (5 Soru)"; break;
        case 'double_xp':
        doubleXPTurns = 5;
        message = "⚡ 2x XP Gücü aktif edildi! (5 Soru)"; break;
        case 'double_wallet':
        doubleWalletTurns = 5;
        message = "💰 2x Bakiye aktif edildi! (5 Soru)"; break;
        default: 
          wallet += cost;
          itemsPurchased--;
          return; 
    } 
    
    if(isSoundEnabled) buyThemeSound.play().catch(()=>{});
    
    checkBadges();
    notify(message, true); 
    updateMeta(); 
}

// --- Zamanlayıcılar --- 

function updateGameTimerUI() {
    gameTime.textContent = globalTimerLeft + "s";
    
    let maxTime = 60;
    if (isSurvivalMode) {
        maxTime = survivalStartTime + (10 * (survivalCorrectBonus / 2));
        if (globalTimerLeft > maxTime) {
            maxTime = globalTimerLeft;
        }
    }
    
    const percentage = (globalTimerLeft / maxTime) * 100;
    gameTimeBar.style.width = Math.min(100, percentage) + '%';
    
    if (percentage < 30) { 
        gameTimeBar.style.backgroundColor = 'var(--bad)'; 
    } else if (percentage < 60) { 
        gameTimeBar.style.backgroundColor = 'var(--header)'; 
    } else { 
        gameTimeBar.style.backgroundColor = 'var(--accent-dark)'; 
    }
}

function startTimer() { 
    clearInterval(timer); 

    if (isBlitzMode || isSurvivalMode) {
        timeEl.textContent = "∞";
        timeBarEl.style.width = '100%';
        return;
    }
    
    if (freezeTime) { 
        timeEl.textContent = "∞"; 
        timeBarEl.style.width = '100%'; 
        timeBarEl.style.backgroundColor = 'var(--accent)';
        freezeTime = false; 
        updateMeta(); 
        return;
    } 
    
    const effectiveLevel = getEffectiveLevel();
    if (effectiveLevel === 1) timeLeft = 15; 
    else if (effectiveLevel === 2) timeLeft = 25;
    else if (effectiveLevel === 3) timeLeft = 45; 
    
    initialTime = timeLeft; 
    timeEl.textContent = timeLeft + " sn"; 
    timeBarEl.style.width = '100%';
    timeBarEl.style.backgroundColor = 'var(--good)'; 
    
    timer = setInterval(() => { 
        timeLeft--; 
        timeEl.textContent = timeLeft + " sn"; 
        const percentage = (timeLeft / initialTime) * 100; 
        timeBarEl.style.width = percentage + '%'; 
        
        if (percentage < 30) { 
            timeBarEl.style.backgroundColor = 'var(--bad)'; 
        } else if (percentage < 60) { 
            timeBarEl.style.backgroundColor = 'var(--header)'; 
        } else { 
            timeBarEl.style.backgroundColor = 'var(--good)'; 
        } 
        
        if (timeLeft <= 0) { 
            clearInterval(timer); 
            handleWrongAnswer(currentProblem.ans);
            notify("Süre doldu!", false); 
        } 
    }, 1000); 
}

function startGame() { 
    if(gameState.running) { 
        endGame('Oyun durduruldu.'); 
        return; 
    } 
    clearInterval(timer);
    clearInterval(globalTimer);
    
    const selectedMode = document.getElementById("mode").value; 
    gameState.running = true; 
    gameState.mode = selectedMode; 
    gameState.level = document.getElementById("level").value; 
    isBlitzMode = (selectedMode === "speed"); 
    isSurvivalMode = (selectedMode === "survival");
    
    currentSessionWrongs = [];
    if (gameState.level === "adaptive") {
        currentAdaptiveLevel = 1; 
        adaptiveHistory = []; 
    }

    if (isBlitzMode) { 
        gameState.total = -1;
        document.getElementById("questionCount").value = "-1";
        notify("⚡ Blitz Modu başladı! 60 Saniyen var!", true); 
        gameTimeLabel.textContent = "Kalan Oyun Süresi:";
        
        globalTimerLeft = 60;
        updateGameTimerUI();
        globalTimer = setInterval(() => {
            globalTimerLeft--;
            updateGameTimerUI();
            if (globalTimerLeft <= 0) {
                endGame(`⚡ Blitz Modu Bitti! Skor: ${gameState.score}`);
            }
        }, 1000);

    } 
    else if (isSurvivalMode) {
        gameState.total = -1;
        document.getElementById("questionCount").value = "-1";
        notify("⏳ Hayatta Kalma Modu başladı! Süreye dikkat et!", true); 
        gameTimeLabel.textContent = "Kalan Süre: ⏳";
        
        globalTimerLeft = survivalStartTime;
        updateGameTimerUI();
        globalTimer = setInterval(() => {
            globalTimerLeft--;
            updateGameTimerUI();
            if (globalTimerLeft <= 0) {
                endGame(`⏳ Süre Bitti! Skor: ${gameState.score}`);
            }
        }, 1000);

    } else {
        gameState.total = Number(document.getElementById("questionCount").value);
        gameTimeLabel.textContent = "Kalan Oyun Süresi:";
    }

    gameState.asked = 0; 
    gameState.correct = 0; 
    gameState.wrong = 0;
    gameState.score = 0; 
    lives = 3; 
    streak = 0; 
    mulCount = 0;
    freezeTime = false; 
    doubleScoreTurns = 0; 
    doubleXPTurns = 0;
    doubleWalletTurns = 0;
    skipTokens = 3; // Her oyun başında 3 pas hakkı
    
    nextQuestion();
    showPage('game'); 
}

// --- Arka Plan Animasyonu ---

function createMathSymbol() {
    const symbol = document.createElement('div');
    symbol.classList.add('math-symbol');
    
    const startX = randInt(0, window.innerWidth);
    symbol.style.left = `${startX}px`;
          
    const themeName = document.documentElement.getAttribute('data-theme') || 'light';
    
    let duration = randInt(20, 40);
    let delay = randInt(0, 20);
    let fontSize = randInt(2, 6);
    
    if (themeName === 'arctic') {
        symbol.textContent = snowflakes[randInt(0, snowflakes.length - 1)];
        symbol.style.animationName = 'fall-digital';
        duration = randInt(15, 30);
    } 
    else if (themeName === 'cyberpunk') {
        symbol.textContent = digitalRain[randInt(0, digitalRain.length - 1)];
        symbol.style.animationName = 'fall-digital';
        symbol.style.color = randInt(0, 1) === 0 ? 'var(--accent)' : 'var(--good)'; 
        duration = randInt(5, 15);
        fontSize = randInt(1, 4);
        delay = randInt(0, 5);
    } 
    else if (themeName === 'sakura') {
        symbol.textContent = petals[randInt(0, petals.length - 1)];
        symbol.style.animationName = 'fall-flutter';
        symbol.style.color = randInt(0, 1) === 0 ? 'var(--accent)' : '#fdebf3';
        duration = randInt(10, 20);
        delay = randInt(0, 15);
        fontSize = randInt(1, 3);
    }
    else if (themeName === 'summer') {
        symbol.textContent = summerIcons[randInt(0, summerIcons.length - 1)];
        symbol.style.animationName = 'fall-flutter';
        duration = randInt(12, 22);
        delay = randInt(0, 15);
        fontSize = randInt(2, 4);
    }
    else {
        symbol.textContent = mathSymbols[randInt(0, mathSymbols.length - 1)];
        symbol.style.animationName = 'fall';
    }
    
    symbol.style.animationDuration = `${duration}s`;
    symbol.style.animationDelay = `${delay}s`;
    symbol.style.fontSize = `${fontSize}em`;
    
    const symbolColor = getComputedStyle(document.documentElement).getPropertyValue('--accent');
    let symbolOpacity = (themeName === 'light' || themeName === 'arctic') ? '0.25' : '0.5';
    if (themeName === 'summer') symbolOpacity = '0.4';
    
    if (themeName !== 'cyberpunk' && themeName !== 'sakura' && themeName !== 'summer') {
      symbol.style.color = symbolColor;
      symbol.style.opacity = symbolOpacity;
    } else if (themeName === 'summer') {
      symbol.style.opacity = symbolOpacity;
    }

    mathSymbolsBg.appendChild(symbol);

    symbol.addEventListener('animationend', () => {
        symbol.remove();
        if(document.querySelectorAll('.math-symbol').length < 30) { 
            createMathSymbol();
        }
    });
}

function initMathSymbols(count = 30) {
    mathSymbolsBg.innerHTML = '';
    for (let i = 0; i < count; i++) {
        createMathSymbol();
    }
}


// --- Olay Dinleyicileri ve Başlangıç İşlemleri ---

submitBtn.addEventListener('click', checkAnswer);

answerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault(); 
        if(currentProblem) {
            checkAnswer();
        }
    }
});

skipBtn.addEventListener('click', skipQuestion);
hintBtn.addEventListener('click', useHint);
startBtn.addEventListener('click', startGame);
soundToggleBtn.addEventListener('click', toggleSound); 
levelUpCloseBtn.addEventListener('click', hideLevelUpModal);

document.getElementById('wrongHistoryCloseBtn').addEventListener('click', () => {
    document.getElementById('wrongHistoryModal').classList.add('hidden');
});

themeSelector.addEventListener('change', (e) => {
    setTheme(e.target.value);
});

gamePageBtn.addEventListener('click', () => { 
    if (gameState.running) {
        endGame('Oyun durduruldu.');
    }
    showPage('game'); 
});


// Başlangıç
loadProfile();

const savedTheme = localStorage.getItem('mathThemeV3.0') || 'light';
setTheme(savedTheme);

showPage('home');
