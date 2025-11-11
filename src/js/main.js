// 音階の定義
const noteNamesJP = ['ド', 'ド#', 'レ', 'レ#', 'ミ', 'ファ', 'ファ#', 'ソ', 'ソ#', 'ラ', 'ラ#', 'シ'];
const noteNamesEN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// 黒鍵の判定（半音階のインデックス）
const blackKeys = [1, 3, 6, 8, 10]; // C#, D#, F#, G#, A#

// 使用可能な音符のMIDIノート番号（C4-C5: 60-72）
const allNotes = [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72];

// グローバル変数
let midiAccess = null;
let audioContext = null;
let currentMelody = [];
let currentIndex = 0;
let correctCount = 0;
let wrongCount = 0;
let streakCount = 0;
let isPlayingExample = false;
let selectedKeys = [...allNotes]; // デフォルトは全ての鍵盤を使用

// DOM要素
const statusEl = document.getElementById('status');
const melodyDisplayEl = document.getElementById('melodyDisplay');
const playBtn = document.getElementById('playBtn');
const newMelodyBtn = document.getElementById('newMelodyBtn');
const resetBtn = document.getElementById('resetBtn');
const feedbackEl = document.getElementById('feedback');
const completeMessageEl = document.getElementById('completeMessage');
const correctCountEl = document.getElementById('correctCount');
const wrongCountEl = document.getElementById('wrongCount');
const streakCountEl = document.getElementById('streakCount');
const noteCountInput = document.getElementById('noteCount');
const intervalLimitInput = document.getElementById('intervalLimit');
const noteNotationSelect = document.getElementById('noteNotation');
const instrumentSelect = document.getElementById('instrument');
const keyCheckboxesContainer = document.getElementById('keyCheckboxes');
const selectAllKeysBtn = document.getElementById('selectAllKeys');
const selectWhiteKeysBtn = document.getElementById('selectWhiteKeys');
const deselectAllKeysBtn = document.getElementById('deselectAllKeys');

// Web Audio API初期化
function initAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
}

// 鍵盤選択UIを初期化
function initKeySelection() {
    keyCheckboxesContainer.innerHTML = '';
    
    allNotes.forEach(midiNote => {
        const noteIndex = midiNote % 12;
        const isBlackKey = blackKeys.includes(noteIndex);
        
        const item = document.createElement('div');
        item.className = 'key-checkbox-item' + (isBlackKey ? ' black-key' : '');
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `key-${midiNote}`;
        checkbox.value = midiNote;
        checkbox.checked = true;
        
        const label = document.createElement('label');
        label.htmlFor = `key-${midiNote}`;
        label.textContent = midiToNoteName(midiNote);
        
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
    selectedKeys = [];
    allNotes.forEach(midiNote => {
        const checkbox = document.getElementById(`key-${midiNote}`);
        if (checkbox && checkbox.checked) {
            selectedKeys.push(midiNote);
        }
    });
    
    // 選択された鍵盤が変わった場合、新しいメロディを生成（進行中でなければ）
    if (currentIndex === 0 && selectedKeys.length > 0) {
        newMelody();
    }
}

// すべての鍵盤を選択
function selectAllKeys() {
    allNotes.forEach(midiNote => {
        const checkbox = document.getElementById(`key-${midiNote}`);
        if (checkbox) checkbox.checked = true;
    });
    updateSelectedKeys();
}

// 白鍵のみを選択
function selectWhiteKeys() {
    allNotes.forEach(midiNote => {
        const checkbox = document.getElementById(`key-${midiNote}`);
        const noteIndex = midiNote % 12;
        if (checkbox) {
            checkbox.checked = !blackKeys.includes(noteIndex);
        }
    });
    updateSelectedKeys();
}

// すべての鍵盤を解除
function deselectAllKeys() {
    allNotes.forEach(midiNote => {
        const checkbox = document.getElementById(`key-${midiNote}`);
        if (checkbox) checkbox.checked = false;
    });
    updateSelectedKeys();
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
    if (selectedKeys.length === 0) {
        alert('少なくとも1つの鍵盤を選択してください');
        return [];
    }
    
    const length = parseInt(noteCountInput.value);
    const intervalLimit = parseInt(intervalLimitInput.value);
    const melody = [];
    
    // 最初の音はランダム
    let lastNote = selectedKeys[Math.floor(Math.random() * selectedKeys.length)];
    melody.push(lastNote);
    
    // 残りの音を生成
    for (let i = 1; i < length; i++) {
        const possibleNotes = selectedKeys.filter(note => 
            Math.abs(note - lastNote) <= intervalLimit
        );
        
        if (possibleNotes.length === 0) {
            // 制限内に音がない場合は全体から選択
            lastNote = selectedKeys[Math.floor(Math.random() * selectedKeys.length)];
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

noteNotationSelect.addEventListener('change', updateMelodyDisplay);

// 鍵盤選択ボタンのイベントリスナー
selectAllKeysBtn.addEventListener('click', selectAllKeys);
selectWhiteKeysBtn.addEventListener('click', selectWhiteKeys);
deselectAllKeysBtn.addEventListener('click', deselectAllKeys);

// イベントリスナー
playBtn.addEventListener('click', playMelody);
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