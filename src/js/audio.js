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
    
    const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
    const instrument = instrumentSelect.value;
    createInstrumentSound(frequency, duration, instrument);
}