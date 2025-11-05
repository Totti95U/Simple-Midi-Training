// メロディ表示を更新
function updateMelodyDisplay() {
    melodyDisplayEl.innerHTML = '';
    currentMelody.forEach((note, index) => {
        const noteEl = document.createElement('div');
        noteEl.className = 'note';
        noteEl.textContent = midiToNoteName(note);
        
        if (index < currentIndex) {
            noteEl.classList.add('correct');
        } else if (index === currentIndex) {
            noteEl.classList.add('current');
        } else {
            noteEl.classList.add('pending');
        }
        
        melodyDisplayEl.appendChild(noteEl);
    });
}

// 統計表示を更新
function updateStats() {
    correctCountEl.textContent = correctCount;
    wrongCountEl.textContent = wrongCount;
    streakCountEl.textContent = streakCount;
}

// フィードバック表示
function showFeedback(isCorrect, playedNote) {
    feedbackEl.textContent = isCorrect ? '✓ 正解！' : `✗ 不正解（${midiToNoteName(playedNote)}を弾きました）`;
    feedbackEl.className = 'feedback ' + (isCorrect ? 'correct' : 'wrong');
    
    setTimeout(() => {
        feedbackEl.textContent = '';
        feedbackEl.className = 'feedback';
    }, 1500);
}

// 完了メッセージ表示と次の問題へ
async function showCompleteMessage() {
    // 正解の音を鳴らす（上昇音階）
    const successNotes = [60, 64, 67, 72]; // C, E, G, C (明るい和音)
    for (let note of successNotes) {
        playNote(note, 0.2);
        await new Promise(resolve => setTimeout(resolve, 150));
    }
    
    completeMessageEl.textContent = '🎉 完璧です！次の問題に進みます...';
    
    // 1秒待ってから次の問題へ
    await new Promise(resolve => setTimeout(resolve, 1000));
    completeMessageEl.textContent = '';
    
    // 自動的に次の問題を生成
    newMelody();
}

// メロディ再生
async function playMelody() {
    if (isPlayingExample) return;
    
    isPlayingExample = true;
    playBtn.disabled = true;
    
    for (let i = 0; i < currentMelody.length; i++) {
        playNote(currentMelody[i]);
        await new Promise(resolve => setTimeout(resolve, 450));
    }
    
    isPlayingExample = false;
    playBtn.disabled = false;
}

// 新しいメロディを生成
async function newMelody() {
    currentMelody = generateMelody();
    currentIndex = 0;
    updateMelodyDisplay();
    completeMessageEl.textContent = '';
    feedbackEl.textContent = '';
    
    // お手本を自動再生（少し待ってから）
    await new Promise(resolve => setTimeout(resolve, 200));
    await playMelody();
}

// やり直し
function reset() {
    currentIndex = 0;
    updateMelodyDisplay();
    completeMessageEl.textContent = '';
    feedbackEl.textContent = '';
}