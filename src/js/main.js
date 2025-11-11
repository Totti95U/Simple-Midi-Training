// 音階の定義
const noteNamesJP = ['ド', 'ド#', 'レ', 'レ#', 'ミ', 'ファ', 'ファ#', 'ソ', 'ソ#', 'ラ', 'ラ#', 'シ'];
const noteNamesEN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// 黒鍵の判定（半音階のインデックス）
const blackKeys = [1, 3, 6, 8, 10]; // C#, D#, F#, G#, A#

// 12音階の音名（オクターブなし）
const allNoteTypes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]; // C, C#, D, D#, E, F, F#, G, G#, A, A#, B

// スケール定義（ルート音からの半音の間隔）
const scales = {
    'major': [0, 2, 4, 5, 7, 9, 11], // メジャースケール (W-W-H-W-W-W-H)
    'minor': [0, 2, 3, 5, 7, 8, 10], // ナチュラルマイナースケール (W-H-W-W-H-W-W)
    'pentatonic-major': [0, 2, 4, 7, 9], // メジャーペンタトニック
    'pentatonic-minor': [0, 3, 5, 7, 10], // マイナーペンタトニック
    'blues': [0, 3, 5, 6, 7, 10], // ブルーススケール
    'chromatic': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] // クロマチックスケール（全音）
};

// グローバル変数
let midiAccess = null;
let audioContext = null;
let currentMelody = [];
let currentIndex = 0;
let correctCount = 0;
let wrongCount = 0;
let streakCount = 0;
let isPlayingExample = false;
let isLeftHandMode = false;
let selectedNoteTypes = [...allNoteTypes]; // デフォルトは全ての音を使用（オクターブ無視）
let melodyRevealed = false; // メロディが表示されているかどうか

// DOM要素
const statusEl = document.getElementById('status');
const melodyDisplayEl = document.getElementById('melodyDisplay');
const playBtn = document.getElementById('playBtn');
const showMelodyBtn = document.getElementById('showMelodyBtn');
const newMelodyBtn = document.getElementById('newMelodyBtn');
const resetBtn = document.getElementById('resetBtn');
const displayModeSelect = document.getElementById('displayMode');
const feedbackEl = document.getElementById('feedback');
const completeMessageEl = document.getElementById('completeMessage');
const correctCountEl = document.getElementById('correctCount');
const wrongCountEl = document.getElementById('wrongCount');
const streakCountEl = document.getElementById('streakCount');
const noteCountInput = document.getElementById('noteCount');
const intervalLimitInput = document.getElementById('intervalLimit');
const noteNotationSelect = document.getElementById('noteNotation');
const instrumentSelect = document.getElementById('instrument');
const leftHandModeCheckbox = document.getElementById('leftHandMode');
const keyCheckboxesContainer = document.getElementById('keyCheckboxes');
const deselectAllKeysBtn = document.getElementById('deselectAllKeys');
const rootNoteSelect = document.getElementById('rootNote');
const scaleTypeSelect = document.getElementById('scaleType');
const applyScaleBtn = document.getElementById('applyScale');

// Web Audio API初期化
function initAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
}

// 音名のみを取得（オクターブなし）
function getNoteNameOnly(noteType) {
    const notation = noteNotationSelect.value;
    const noteNames = notation === 'japanese' ? noteNamesJP : noteNamesEN;
    return noteNames[noteType];
}

// 鍵盤選択UIを初期化（オクターブなし）
function initKeySelection() {
    keyCheckboxesContainer.innerHTML = '';
    
    allNoteTypes.forEach(noteType => {
        const isBlackKey = blackKeys.includes(noteType);
        
        const item = document.createElement('div');
        item.className = 'key-checkbox-item' + (isBlackKey ? ' black-key' : '');
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `key-${noteType}`;
        checkbox.value = noteType;
        checkbox.checked = true;
        
        const label = document.createElement('label');
        label.htmlFor = `key-${noteType}`;
        label.textContent = getNoteNameOnly(noteType);
        
        checkbox.addEventListener('change', updateSelectedKeys);
        
        item.appendChild(checkbox);
        item.appendChild(label);
        item.addEventListener('click', (e) => {
            if (e.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
                updateSelectedKeys();
            }
        });
        
        keyCheckboxesContainer.appendChild(item);
    });
}

// 選択された鍵盤を更新
function updateSelectedKeys() {
    selectedNoteTypes = [];
    allNoteTypes.forEach(noteType => {
        const checkbox = document.getElementById(`key-${noteType}`);
        if (checkbox && checkbox.checked) {
            selectedNoteTypes.push(noteType);
        }
    });
    
    // 選択された鍵盤が変わった場合、新しいメロディを生成（進行中でなければ）
    if (currentIndex === 0 && selectedNoteTypes.length > 0) {
        newMelody();
    }
}

// すべての鍵盤を解除
function deselectAllKeys() {
    allNoteTypes.forEach(noteType => {
        const checkbox = document.getElementById(`key-${noteType}`);
        if (checkbox) checkbox.checked = false;
    });
    updateSelectedKeys();
}

// スケールを適用
function applyScale() {
    const rootNote = parseInt(rootNoteSelect.value);
    const scaleType = scaleTypeSelect.value;
    const scaleIntervals = scales[scaleType];
    
    if (!scaleIntervals) {
        console.error('Invalid scale type:', scaleType);
        return;
    }
    
    // 選択されたスケールの音を計算
    const scaleNotes = scaleIntervals.map(interval => (rootNote + interval) % 12);
    
    // すべてのチェックボックスを更新
    allNoteTypes.forEach(noteType => {
        const checkbox = document.getElementById(`key-${noteType}`);
        if (checkbox) {
            checkbox.checked = scaleNotes.includes(noteType);
        }
    });
    
    updateSelectedKeys();
}

// 選択された音名から実際に使用するMIDIノート番号の範囲を取得
function getAvailableNotes() {
    const minNote = isLeftHandMode ? 36 : 60; // C2 or C4
    const maxNote = isLeftHandMode ? 59 : 83; // B3 or B5
    const availableNotes = [];
    
    for (let note = minNote; note <= maxNote; note++) {
        const noteType = note % 12;
        if (selectedNoteTypes.includes(noteType)) {
            availableNotes.push(note);
        }
    }
    
    return availableNotes;
}

// MIDIノート番号を音名に変換
function midiToNoteName(midiNote) {
    const octave = Math.floor(midiNote / 12) - 1;
    const noteIndex = midiNote % 12;
    const notation = noteNotationSelect.value;
    const noteNames = notation === 'japanese' ? noteNamesJP : noteNamesEN;
    return noteNames[noteIndex] + octave;
}

// ランダムなメロディを生成（音程制限付き）
function generateMelody() {
    if (selectedNoteTypes.length === 0) {
        alert('少なくとも1つの鍵盤を選択してください');
        return [];
    }
    
    const availableNotes = getAvailableNotes();
    if (availableNotes.length === 0) {
        alert('使用可能な音がありません');
        return [];
    }
    
    const length = parseInt(noteCountInput.value);
    const intervalLimit = parseInt(intervalLimitInput.value);
    const melody = [];
    
    // 最初の音はランダム
    let lastNote = availableNotes[Math.floor(Math.random() * availableNotes.length)];
    melody.push(lastNote);
    
    // 残りの音を生成
    for (let i = 1; i < length; i++) {
        const possibleNotes = availableNotes.filter(note => 
            Math.abs(note - lastNote) <= intervalLimit
        );
        
        if (possibleNotes.length === 0) {
            // 制限内に音がない場合は全体から選択
            lastNote = availableNotes[Math.floor(Math.random() * availableNotes.length)];
        } else {
            lastNote = possibleNotes[Math.floor(Math.random() * possibleNotes.length)];
        }
        
        melody.push(lastNote);
    }
    
    return melody;
}

// MIDI入力ハンドラ
function onMIDIMessage(message) {
    const [status, note, velocity] = message.data;
    
    // お手本再生中は入力を無視
    if (isPlayingExample) return;
    
    // Note Onメッセージ（144-159）
    if (status >= 144 && status <= 159 && velocity > 0) {
        // 音を鳴らす
        playNote(note, 0.3);
        
        // 判定
        if (currentIndex < currentMelody.length) {
            const expectedNote = currentMelody[currentIndex];
            
            if (note === expectedNote) {
                // 正解
                correctCount++;
                streakCount++;
                currentIndex++;
                showFeedback(true, note);
                updateMelodyDisplay();
                updateStats();
                
                // すべて正解した場合
                if (currentIndex === currentMelody.length) {
                    showCompleteMessage();
                }
            } else {
                // 不正解
                wrongCount++;
                streakCount = 0;
                showFeedback(false, note);
                updateStats();
            }
        }
    }
}

// 設定変更時の処理
noteCountInput.addEventListener('change', () => {
    if (currentIndex === 0) {
        newMelody();
    }
});

intervalLimitInput.addEventListener('change', () => {
    if (currentIndex === 0) {
        newMelody();
    }
});

noteNotationSelect.addEventListener('change', () => {
    updateMelodyDisplay();
    initKeySelection(); // 音名表記が変わったら鍵盤選択UIも更新
});

// 左手モードの切り替え
leftHandModeCheckbox.addEventListener('change', () => {
    isLeftHandMode = leftHandModeCheckbox.checked;
    if (currentIndex === 0) {
        newMelody();
    }
});

// 表示モード変更時の処理
displayModeSelect.addEventListener('change', () => {
    melodyRevealed = false; // 表示モード変更時はリセット
    updateMelodyDisplay();
});

// 鍵盤選択ボタンのイベントリスナー
deselectAllKeysBtn.addEventListener('click', deselectAllKeys);
applyScaleBtn.addEventListener('click', applyScale);

// イベントリスナー
playBtn.addEventListener('click', playMelody);
showMelodyBtn.addEventListener('click', showMelody);
newMelodyBtn.addEventListener('click', newMelody);
resetBtn.addEventListener('click', reset);

// 初期化
async function initialize() {
    initAudio();
    initMIDI();
    initKeySelection(); // 鍵盤選択UIを初期化
    await loadPianoSample(); // ピアノサンプルを読み込む（完了を待つ）
    newMelody();
}

initialize();