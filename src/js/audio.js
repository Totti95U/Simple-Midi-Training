// ピアノサンプルのバッファを保存
let pianoSampleBuffer = null;

// ピアノサンプルを読み込む
async function loadPianoSample() {
    if (!audioContext) initAudio();
    try {
        const response = await fetch('./assets/se/piano_a4.wav');
        const arrayBuffer = await response.arrayBuffer();
        pianoSampleBuffer = await audioContext.decodeAudioData(arrayBuffer);
    } catch (e) {
        console.error('Error loading piano sample:', e);
    }
}

// ピアノサンプルを再生する関数
async function playPianoSample(midiNote, duration = 1.0) {
    if (!audioContext) initAudio();
    
    // AudioContextがサスペンド状態の場合は再開する
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }
    
    if (!pianoSampleBuffer) {
        // フォールバック: シンセ音を鳴らす
        const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
        createInstrumentSound(frequency, duration, 'piano');
        return;
    }

    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();
    source.buffer = pianoSampleBuffer;

    // MIDIノート番号から再生速度を変更してピッチを調整
    // piano_a4.wav はA4 (MIDIノート69) なので、それを基準にする
    const pitchRatio = Math.pow(2, (midiNote - 69) / 12);
    source.playbackRate.value = pitchRatio;

    source.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // 音量のエンベロープ（ピアノらしい減衰）
    const actualDuration = Math.max(duration, 1.0); // 最低1秒は鳴らす
    gainNode.gain.setValueAtTime(0.6, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + actualDuration);

    source.start(audioContext.currentTime);
    source.stop(audioContext.currentTime + actualDuration);
}

// 楽器ごとの音を生成
function createInstrumentSound(frequency, duration, instrument) {
    const osc = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    osc.frequency.value = frequency;
    
    switch(instrument) {
        case 'piano':
            // ピアノ風: 急速な減衰
            osc.type = 'triangle';
            gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
            break;
            
        case 'guitar':
            // ギター風: ゆっくりとした減衰
            osc.type = 'sawtooth';
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration * 1.5);
            duration = duration * 1.5;
            break;
            
        case 'sine':
        default:
            // シンセ風: サイン波
            osc.type = 'sine';
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
            break;
    }
    
    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + duration);
}

// 音を鳴らす
function playNote(midiNote, duration = 0.5) {
    if (!audioContext) initAudio();
    
    const instrument = instrumentSelect.value;
    
    // ピアノが選択されている場合はサンプルを使用
    if (instrument === 'piano') {
        playPianoSample(midiNote, duration);
    } else {
        // その他の楽器はシンセサイズ音を使用
        const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
        createInstrumentSound(frequency, duration, instrument);
    }
}