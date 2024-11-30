/**
 * Initializes the start and pause functionality for the player
 * @param {Function} fn - Callback function to execute when start is triggered
 */
function pressToStart(fn) {
    const startButton = document.getElementById('start-button');
    const pauseButton = document.getElementById('pause-button');
    const randomButton = document.getElementById('random-button');
    
    if (!startButton || !pauseButton || !randomButton) {
        console.error('Required buttons not found');
        return;
    }

    let started = false;
    let programState = null;

    async function handleStartAction() {
        if (!started) {
            started = true;
            startButton.style.display = 'none';
            pauseButton.style.display = 'block';
            randomButton.style.display = 'block';
            programState = await fn();
            
            // Subscribe to newNotes changes to control the waiting class
            if (programState && programState.gen && programState.gen.newNotes) {
                programState.gen.newNotes.subscribe(v => {
                    if (v) randomButton.classList.add('waiting'); 
                    else randomButton.classList.remove('waiting');
                });
            }
        }
    }

    function handlePauseAction() {
        // console.log('Pause clicked, program state:', programState);
        if (programState && programState.audioContext) {
            // console.log('Audio context state:', programState.audioContext.state);
            if (programState.audioContext.state === 'running') {
                programState.audioContext.suspend();
                programState.clock.stop();
                pauseButton.textContent = '▶ Resume';
            } else if (programState.audioContext.state === 'suspended') {
                programState.audioContext.resume();
                programState.clock.start();
                pauseButton.textContent = '⏸ Pause';
            }
        }
    }

    function handleRandomAction() {
        if (programState && programState.gen && programState.gen.newNotes) {
            programState.gen.newNotes.value = true;
        }
    }

    startButton.addEventListener('click', handleStartAction);
    pauseButton.addEventListener('click', handlePauseAction);
    randomButton.addEventListener('click', handleRandomAction);
}

/**
 * Repeatedly executes a function at specified intervals
 * @param {number} seconds - Interval between executions in seconds
 * @param {Function} fn - Function to execute, receives time elapsed and step count
 */
function repeat(seconds, fn) {
    let time = new Date().getTime();
    let n = 0;
    
    function step() {
        const t = new Date().getTime() - time;
        fn(t, n);
        n++;
    }

    step();
    window.setInterval(step, seconds * 1000);
}

/**
 * Creates a musical clock that triggers callbacks at specified BPM and subdivision
 * @param {number} bpm - Tempo in beats per minute
 * @param {number} [subdivision=4] - Number of steps per beat
 * @param {number} [shuffle=0] - Amount of swing/shuffle to apply (0-1)
 * @returns {Object} Clock controller with bind and setBpm methods
 */
function Clock(bpm, subdivision = 4, shuffle = 0) {
    let currentBpm = bpm;
    let n = 0;
    let fn = () => {};
    const time = new Date().getTime();
    let timeoutId = null;
    let isRunning = true;

    /**
     * Binds a new callback function to the clock
     * @param {Function} newFn - New callback function
     */
    function bind(newFn) {
        fn = newFn;
    }

    function scheduleNext(interval) {
        if (timeoutId !== null) {
            window.clearTimeout(timeoutId);
        }
        if (isRunning) {
            timeoutId = window.setTimeout(step, interval);
        }
    }

    /**
     * Executes a single clock step and schedules the next one
     * Applies shuffle by alternating between longer and shorter steps
     */
    function step() {
        if (!isRunning) return;
        
        const t = new Date().getTime() - time;
        fn(t, n);
        
        // Apply shuffle by modifying timing of even/odd steps
        const shuffleFactor = n % 2 === 0 ? 1 + shuffle : 1 - shuffle;
        n++;

        // Calculate next step interval with shuffle
        const interval = shuffleFactor * (60000 / currentBpm) / subdivision;
        scheduleNext(interval);
    }

    return {
        bind,
        setBpm: (bpm) => {
            currentBpm = bpm;
            // Reschedule with new BPM if running
            if (isRunning) {
                scheduleNext((60000 / bpm) / subdivision);
            }
        },
        stop: () => {
            isRunning = false;
            if (timeoutId !== null) {
                window.clearTimeout(timeoutId);
                timeoutId = null;
            }
        },
        start: () => {
            if (!isRunning) {
                isRunning = true;
                scheduleNext((60000 / currentBpm) / subdivision);
            }
        }
    };
}

export {
    pressToStart,
    repeat,
    Clock
};
