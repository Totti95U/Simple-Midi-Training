// MIDI初期化
async function initMIDI() {
    try {
        midiAccess = await navigator.requestMIDIAccess();

        // ヘルパー: 現在接続中の入力デバイス名を配列で返す
        const getInputNames = () => {
            return Array.from(midiAccess.inputs.values()).map(input => {
                return input.name || input.manufacturer || input.id || 'Unknown device';
            });
        };

        // 初期接続済みデバイスを設定
        const inputs = midiAccess.inputs.values();
        const inputNames = [];

        for (let input of inputs) {
            input.onmidimessage = onMIDIMessage;
            const name = input.name || input.manufacturer || input.id || 'Unknown device';
            inputNames.push(name);
            console.log('MIDI input found:', name);
        }

        if (inputNames.length) {
            statusEl.textContent = `✓ MIDIキーボード接続済み — ${inputNames.join(', ')}`;
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
                    // 新しく接続されたポートにハンドラを設定
                    e.port.onmidimessage = onMIDIMessage;
                    // 現在の入力デバイス名一覧で表示を更新
                    const names = getInputNames();
                    statusEl.textContent = `✓ MIDIキーボード接続済み — ${names.join(', ')}`;
                    statusEl.className = 'status connected';
                    playBtn.disabled = false;
                    console.log('MIDI input connected:', e.port.name || e.port.id);
                } else {
                    // 切断された場合は残りの入力デバイスを再確認
                    const names = getInputNames();
                    if (names.length) {
                        statusEl.textContent = `✓ MIDIキーボード接続済み — ${names.join(', ')}`;
                        statusEl.className = 'status connected';
                        playBtn.disabled = false;
                    } else {
                        statusEl.textContent = 'MIDIキーボードを接続してください';
                        statusEl.className = 'status disconnected';
                        playBtn.disabled = true;
                    }
                    console.log('MIDI input disconnected:', e.port.name || e.port.id);
                }
            }
        };

    } catch (error) {
        statusEl.textContent = '✗ MIDI接続エラー: ' + error.message;
        statusEl.className = 'status disconnected';
    }
}