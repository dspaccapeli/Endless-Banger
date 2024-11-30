import { Clock, pressToStart } from "./boilerplate.js";
import { Audio } from './audio.js';
import { NineOhGen, ThreeOhGen } from "./pattern.js";
import { UI, EmptyGridVisualizer } from "./ui.js";
import {
    genericParameter,
    parameter,trigger,
} from "./interface.js";

/**
 * Creates a parameter that "wanders" around within its bounds, simulating organic motion.
 * This function implements a simple physics-like system where the parameter value
 * moves with momentum and responds to boundaries.
 * 
 * @param { NumericParameter } param - The numeric parameter to control
 * @param { number } scaleFactor - Controls the magnitude of random movements (default: 1/400)
 * @returns An object with a step function to update the parameter value
 */
function WanderingParameter(param, scaleFactor = 1/400) {
    // Extract the minimum and maximum bounds of the parameter
    const [min,max] = param.bounds;

    // Initialize the momentum (difference between steps)
    let diff = 0.0;
    // Calculate the scale of random movements based on the parameter range
    let scale = scaleFactor * (max - min);
    // Counter to prevent immediate wandering after manual parameter changes
    let touchCountdown = 0;

    // Keep track of the last value to detect external changes
    let previousValue = (min + max) / 2 ;

    /**
     * Updates the parameter value for one step of the wandering motion
     */
    const step = () => {
        if (previousValue != param.value) {
            // Reset motion when parameter is changed externally
            diff = 0;
            previousValue = param.value;
            touchCountdown = 200
        } else  {
            if (touchCountdown > 0) {
                touchCountdown--;
            }

            if (touchCountdown < 100) {
                // Apply momentum decay - stronger decay when countdown is active
                diff *=  touchCountdown > 0 ? 0.8 : 0.98;
                // Add random movement
                diff += (Math.random() - 0.5) * scale;
                param.value += diff;

                previousValue = param.value

                // Bounce back when getting too close to the bounds
                if (param.value > min + 0.8 * (max - min)) {
                    diff -= Math.random() * scale;
                } else if (param.value < min + 0.2 * (max - min)) {
                    diff += Math.random() * scale;
                }
            }
        }
    }

    return {
        step
    }
}

/**
 * Creates a TB-303 style acid bass synthesizer unit with pattern sequencing capabilities
 * @param {Object} audio - Audio context and utilities
 * @param {string} waveform - Type of oscillator waveform (e.g., sine, square, sawtooth)
 * @param {AudioNode} output - The destination audio node for output
 * @param {Object} gen - Pattern generator for creating note sequences
 * @param {number} [patternLength=16] - Length of the pattern sequence
 * @returns {Object} ThreeOhMachine object with step sequencer and parameter controls
 */
function ThreeOhUnit(audio, waveform, output, gen, patternLength = 16) {
    // Initialize the synthesizer with specified waveform and output
    const synth = audio.ThreeOh(waveform, output);
    
    // Create a parameter for storing the current pattern
    const pattern = genericParameter("Pattern", []);
    
    // Trigger for generating new patterns
    const newPattern = trigger("New Pattern Trigger", true);

    // Subscribe to the note generator's newNotes signal
    gen.newNotes.subscribe(newNotes => {
        if (newNotes === true) newPattern.value = true;
    });

    /**
     * Process a single step in the pattern sequence
     * @param {number} index - Current step index in the pattern
     */
    function step(index) {
        // Generate new pattern if we're at the start and newPattern is triggered
        // or if the current pattern is empty
        if ((index === 0 && newPattern.value === true) || pattern.value.length === 0) {
            pattern.value = gen.createPattern();
            newPattern.value = false;
        }

        // Get the current slot from the pattern and handle note triggering
        const slot = pattern.value[index % patternLength];
        if (slot.note !== "-") {
            // Play note if it's not a rest ("-")
            synth.noteOn(slot.note, slot.accent, slot.glide);
        } else {
            // Stop note for rests
            synth.noteOff();
        }
    }

    // Define synth parameters with their ranges and default values
    const parameters = {
        cutoff: parameter("Cutoff", [30, 700], 400),        // Filter cutoff frequency
        resonance: parameter("Resonance", [1, 30], 15),     // Filter resonance
        envMod: parameter("Env Mod", [0, 8000], 4000),      // Envelope modulation amount
        decay: parameter("Decay", [0.1, 0.9], 0.5)          // Note decay time
    };

    // Connect parameter changes to synth controls
    parameters.cutoff.subscribe(v => synth.params.cutoff.value = v);
    parameters.resonance.subscribe(v => synth.params.resonance.value = v);
    parameters.envMod.subscribe(v => synth.params.envMod.value = v);
    parameters.decay.subscribe(v => synth.params.decay.value = v);

    // Return the machine interface
    return {
        step,           // Step sequencer function
        pattern,        // Current pattern
        parameters,     // Synth parameters
        newPattern     // New pattern trigger
    };
}

/**
 * Creates a TR-909 style drum machine with pattern sequencing and individual drum muting
 * @param {Object} audio - Audio context and utilities for sample playback
 * @returns {Promise<Object>} Promise resolving to NineOhMachine object with sequencer controls
 */
async function NineOhUnit(audio) {
    // Initialize drum sampler with TR-909 drum samples
    const drums = await audio.SamplerDrumMachine([
        "909BD.mp3",  // Bass Drum
        "909OH.mp3",  // Open Hi-hat
        "909CH.mp3",  // Closed Hi-hat
        "909SD.mp3"   // Snare Drum
    ]);

    // Create parameters for pattern storage and drum muting
    const pattern = genericParameter("Drum Pattern", []);
    
    // Create mute controls for each drum sound
    const mutes = [
        genericParameter("Mute BD", false),  // Bass Drum mute
        genericParameter("Mute OH", false),  // Open Hi-hat mute
        genericParameter("Mute CH", false),  // Closed Hi-hat mute
        genericParameter("Mute SD", false)   // Snare Drum mute
    ];

    // Trigger for generating new patterns
    const newPattern = trigger("New Pattern Trigger", true);
    
    // Initialize the pattern generator
    const gen = NineOhGen();

    /**
     * Process a single step in the drum sequence
     * @param {number} index - Current step index in the pattern
     */
    function step(index) {
        // Generate new pattern if at start and triggered, or if pattern is empty
        if ((index === 0 && newPattern.value === true) || pattern.value.length === 0) {
            pattern.value = gen.createPatterns(true);
            newPattern.value = false;
        }

        // Process each drum track in the pattern
        for (let i in pattern.value) {
            // Get current step for this drum, using modulo for pattern length
            const entry = pattern.value[i][index % pattern.value[i].length];
            // If there's a trigger and drum isn't muted, play the sample
            if (entry && !mutes[i].value) {
                drums.triggers[i].play(entry);
            }
        }
    }

    // Return the drum machine interface
    return {
        step,           // Step sequencer function
        pattern,        // Current pattern
        mutes,         // Mute controls for each drum
        newPattern     // New pattern trigger
    };
}

/**
 * Creates a delay audio effect unit with controllable parameters
 * @param {Object} audio - The audio context object
 * @returns {Object} An object containing delay parameters and input node
 */
function DelayUnit(audio) {
    // Create a dry/wet mix parameter with range [0, 0.5] and default 0.5
    const dryWet = parameter("Dry/Wet", [0, 0.5], 0.5);
    
    // Create a feedback parameter with range [0, 0.9] and default 0.3
    const feedback = parameter("Feedback", [0, 0.9], 0.3);
    
    // Create a delay time parameter with range [0, 2] seconds and default 0.3
    const delayTime = parameter("Time", [0, 2], 0.3);
    
    // Initialize delay insert with current parameter values
    const delay = audio.DelayInsert(delayTime.value, dryWet.value, feedback.value);
    
    // Subscribe to parameter changes and update delay accordingly
    dryWet.subscribe(w => delay.wet.value = w);
    feedback.subscribe(f => delay.feedback.value = f);
    delayTime.subscribe(t => delay.delayTime.value = t);

    // Return interface object with parameters and input node
    return {
        dryWet,
        feedback,
        delayTime,
        inputNode: delay.in
    };
}

/**
 * Creates an autopilot system that automatically modifies various parameters of the synthesizer
 * This includes pattern changes, parameter modulation, and drum part muting
 * @param {Object} state - The program state containing all synth parameters and controls
 * @returns {Object} Control switches for the autopilot features
 */
function AutoPilot(state) {
    // Parameters to track measure progression
    const nextMeasure = parameter("upcomingMeasure", [0, Infinity], 0);
    const currentMeasure = parameter("measure", [0, Infinity], 0);
    
    // Control switches for different autopilot features
    const patternEnabled = genericParameter("Alter Patterns", true);
    const dialsEnabled = genericParameter("Twiddle With Knobs", true);
    const mutesEnabled = genericParameter("Mute Drum Parts", true);
    
    // Update measure counters based on step progression
    state.clock.currentStep.subscribe(step => {
        if (step === 4) {
            nextMeasure.value = nextMeasure.value + 1;
        } else if (step === 15) { // slight hack to get mutes functioning as expected
            currentMeasure.value = currentMeasure.value + 1;
        }
    });

    // Handle pattern changes on measure boundaries
    nextMeasure.subscribe(measure => {
        if (patternEnabled.value) {
            // Every 64 measures, possibly generate new notes
            if (measure % 64 === 0) {
                if (Math.random() < 0.2) {
                    state.gen.newNotes.value = true;
                }
            }
            // Every 16 measures, possibly change patterns
            if (measure % 16 === 0) {
                // 50% chance to change each note pattern
                state.notes.forEach((n, i) => {
                    if (Math.random() < 0.5) {
                        n.newPattern.value = true;
                    }
                });
                // 30% chance to change drum pattern
                if (Math.random() < 0.3) {
                    state.drums.newPattern.value = true;
                }
            }
        }
    });

    // Handle drum muting on measure boundaries
    currentMeasure.subscribe(measure => {
        if (mutesEnabled.value) {
            // Every 8 measures, randomize drum mutes
            if (measure % 8 == 0) {
                const drumMutes = [
                    Math.random() < 0.2,  // 20% chance to mute first part
                    Math.random() < 0.5,  // 50% chance to mute other parts
                    Math.random() < 0.5,
                    Math.random() < 0.5
                ];
                // Apply mutes to drum parts
                state.drums.mutes[0].value = drumMutes[0];
                state.drums.mutes[1].value = drumMutes[1];
                state.drums.mutes[2].value = drumMutes[2];
                state.drums.mutes[3].value = drumMutes[3];
            }
        }
    });

    // Collect all parameters that should be modulated
    const noteParams = state.notes.flatMap(x => Object.values(x.parameters));
    const delayParams = [state.delay.feedback, state.delay.dryWet];

    // Create parameter wanderers for automatic modulation
    const wanderers = [...noteParams, ...delayParams].map(param => WanderingParameter(param));
    
    // Update wandering parameters every 100ms if enabled
    window.setInterval(() => {
        if (dialsEnabled.value) {
            wanderers.forEach(w => w.step());
        }
    }, 100);

    // Return control switches for UI
    return {
        switches: [
            patternEnabled,
            dialsEnabled,
            mutesEnabled
        ]
    };
}

/**
 * Creates a clock unit that manages tempo and step progression for the sequencer
 * @returns {Object} Clock unit with BPM and current step parameters
 */
function ClockUnit() {
    // Create BPM parameter with range 70-200, default 142
    const bpm = parameter("BPM", [70, 200], 142);
    
    // Create step counter parameter with range 0-15, default 0
    const currentStep = parameter("Current Step", [0, 15], 0);
    
    // Initialize clock with default BPM, 4 beats per bar, and no offset
    const clockImpl = Clock(bpm.value, 4, 0.0);
    
    // Update clock when BPM changes
    bpm.subscribe(clockImpl.setBpm);
    
    // Update current step on each clock tick
    // time: current audio time, step: current step number
    clockImpl.bind((time, step) => {
        currentStep.value = step % 16;  // Keep step within 0-15 range
    });

    // Start the clock initially
    clockImpl.start();

    // Return interface with tempo and step controls
    return {
        bpm,
        currentStep,
        stop: () => {
            // console.log('Stopping clock');
            clockImpl.stop();
        },
        start: () => {
            // console.log('Starting clock');
            clockImpl.start();
        }
    };
}

/**
 * Initializes and starts the acid synthesizer application
 * Sets up audio context, instruments, effects, and UI
 * @returns {Promise<Object>} The program state including audio context and controls
 */
async function start() {
    // Initialize core audio system
    const audio = Audio();
    
    // Set up timing and delay effects
    const clock = ClockUnit();
    const delay = DelayUnit(audio);
    
    // Sync delay time with tempo (3/4 of a beat duration)
    clock.bpm.subscribe(b => delay.delayTime.value = (3/4) * (60/b));

    // Initialize pattern generator
    const gen = ThreeOhGen();
    
    // Create program state object containing all synth components
    const programState = {
        // Initialize two synth voices with different waveforms
        notes: [
            ThreeOhUnit(audio, "sawtooth", delay.inputNode, gen),
            ThreeOhUnit(audio, "square", delay.inputNode, gen)
        ],
        // Initialize drum machine
        drums: await NineOhUnit(audio),
        gen,
        delay,
        clock,
        // Master volume control
        masterVolume: parameter("Volume", [0, 1], 0.5),
        // Store audio context for pause/resume functionality
        audioContext: audio.context
    };

    // Connect master volume control
    programState.masterVolume.subscribe(newVolume => {
        audio.master.in.gain.value = newVolume;
    });

    // Step all instruments (synths and drums) on each clock tick
    clock.currentStep.subscribe(step => 
        [...programState.notes, programState.drums].forEach(d => d.step(step))
    );

    // Initialize autopilot and UI
    const autoPilot = AutoPilot(programState);
    const ui = UI(audio.master.analyser);
    
    // Add UI to document
    document.body.append(ui);

    // console.log('Starting with program state:', programState);
    return programState;
}

// On DOM load start the EmptyGridVisualizer
window.addEventListener('DOMContentLoaded', () => {
    const ui = EmptyGridVisualizer();
    document.body.append(ui);
});

// Remove the title and description since we're using our own UI
pressToStart(start);
