// MIDI初期化
async function initMIDI() {
    try {
        midiAccess = await navigator.requestMIDIAccess();
        
        // MIDI入力デバイスを取得
        const inputs = midiAccess.inputs.values();
        let hasInputs = false;
        
        for (let input of inputs) {
            hasInputs = true;
            input.onmidimessage = onMIDIMessage;
        }
        
        if (hasInputs) {
            statusEl.textContent = '✓ MIDIキーボード接続済み';
            statusEl.className = 'status connected';
            playBtn.disabled = false;
        } else {
            statusEl.textContent = '⚠ MIDIデバイスが見つかりません';
            statusEl.className = 'status disconnected';
        }
        
        // デバイスの接続/切断を監視
        midiAccess.onstatechange = (e) => {
            if (e.port.type === 'input') {
                if (e.port.state === 'connected') {
                    e.port.onmidimessage = onMIDIMessage;
                    statusEl.textContent = '✓ MIDIキーボード接続済み';
                    statusEl.className = 'status connected';
                    playBtn.disabled = false;
                } else {
                    statusEl.textContent = 'MIDIキーボードを接続してください';
                    statusEl.className = 'status disconnected';
                    playBtn.disabled = true;
                }
            }
        };
        
    } catch (error) {
        statusEl.textContent = '✗ MIDI接続エラー: ' + error.message;
        statusEl.className = 'status disconnected';
    }
}