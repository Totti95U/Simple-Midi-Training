// 音階の定義
const noteNamesJP = ['ド', 'ド#', 'レ', 'レ#', 'ミ', 'ファ', 'ファ#', 'ソ', 'ソ#', 'ラ', 'ラ#', 'シ'];
const noteNamesEN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// グローバル変数
let midiAccess = null;
let audioContext = null;
let currentMelody = [];
let currentIndex = 0;
let correctCount = 0;
let wrongCount = 0;
let streakCount = 0;
let isPlayingExample = false;

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

// Web Audio API初期化
function initAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
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
    const length = parseInt(noteCountInput.value);
    const intervalLimit = parseInt(intervalLimitInput.value);
    const melody = [];
    const scale = [60, 62, 64, 65, 67, 69, 71, 72]; // C major scale (C4-C5)
    
    // 最初の音はランダム
    let lastNote = scale[Math.floor(Math.random() * scale.length)];
    melody.push(lastNote);
    
    // 残りの音を生成
    for (let i = 1; i < length; i++) {
        const possibleNotes = scale.filter(note => 
            Math.abs(note - lastNote) <= intervalLimit
        );
        
        if (possibleNotes.length === 0) {
            // 制限内に音がない場合は全体から選択
            lastNote = scale[Math.floor(Math.random() * scale.length)];
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

// イベントリスナー
playBtn.addEventListener('click', playMelody);
newMelodyBtn.addEventListener('click', newMelody);
resetBtn.addEventListener('click', reset);

// 初期化
async function initialize() {
    initAudio();
    initMIDI();
    await loadPianoSample(); // ピアノサンプルを読み込む（完了を待つ）
    newMelody();
}

initialize();