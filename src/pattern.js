import { midiNoteToText } from "./audio.js";
import { choose, rndInt } from "./math.js";
import {
    genericParameter,
    trigger
} from "./interface.js";

// Possible note offset patterns for acid basslines
const offsetChoices = [
    [0, 0, 12, 24, 27],
    [0, 0, 0, 12, 10, 19, 26, 27],
    [0, 1, 7, 10, 12, 13],
    [0],
    [0, 0, 0, 12],
    [0, 0, 12, 14, 15, 19],
    [0, 0, 0, 0, 12, 13, 16, 19, 22, 24, 25],
    [0, 0, 0, 7, 12, 15, 17, 20, 24],
];

/**
 * Creates a TB-303 style pattern generator
 * Generates melodic acid bassline patterns with note sets and variations
 * @returns {Object} Pattern generator with note set and pattern creation methods
 */
function ThreeOhGen() {
    // Initialize parameters
    const noteSet = genericParameter("note set", ['C1']);
    const newNotes = trigger("new note set", true);
    const density = 1.0;

    /**
     * Changes the current note set to a new random set
     * Based on a root note and selected offset pattern
     */
    function changeNotes() {
        const root = rndInt(15) + 16;
        const offsets = choose(offsetChoices);
        noteSet.value = offsets.map(o => midiNoteToText(o + root));
    }

    /**
     * Creates a new 16-step pattern with notes, accents, and glides
     * @returns {Array} Array of 16 slots with note, accent, and glide properties
     */
    function createPattern() {
        if (newNotes.value === true) {
            changeNotes();
            newNotes.value = false;
        }
        const pattern = [];

        // Generate 16-step pattern with varying note probabilities
        for (let i = 0; i < 16; i++) {
            // Calculate note probability based on step position
            const chance = density * (
                i % 4 === 0 ? 0.6 :  // Strong beat
                i % 3 === 0 ? 0.5 :  // Triplet feel
                i % 2 === 0 ? 0.3 :  // Off-beat
                0.1                   // Weak beat
            );
            
            if (Math.random() < chance) {
                pattern.push({
                    note: choose(noteSet.value),
                    accent: Math.random() < 0.3,  // 30% chance of accent
                    glide: Math.random() < 0.1    // 10% chance of glide
                });
            } else {
                pattern.push({
                    note: "-",
                    accent: false,
                    glide: false
                });
            }
        }

        return pattern;
    }

    return {
        createPattern,
        newNotes,
        noteSet
    };
}

/**
 * Creates a TR-909 style drum pattern generator
 * Generates rhythmic patterns for kick, hi-hats, and snare
 * @returns {Object} Drum pattern generator
 */
function NineOhGen() {
    /**
     * Creates a set of drum patterns
     * @param {boolean} [full=false] - Whether to generate a full pattern set
     * @returns {Array} Array of patterns for kick, open hat, closed hat, and snare
     */
    function createPatterns(full = false) {
        // Initialize 16-step patterns for each drum
        const kickPattern = new Array(16);
        const ohPattern = new Array(16);
        const chPattern = new Array(16);
        const sdPattern = new Array(16);

        // Select random pattern styles
        const kickMode = choose(["electro", "fourfloor"]);
        const hatMode = choose(["offbeats", "closed", full ? "offbeats" : "none"]);
        const snareMode = choose(["backbeat", "skip", full ? "backbeat" : "none"]);

        // Generate kick pattern
        if (kickMode === "fourfloor") {
            // Four-on-the-floor pattern with occasional variations
            for (let i = 0; i < 16; i++) {
                if (i % 4 === 0) {
                    kickPattern[i] = 0.9;  // Strong quarter notes
                } else if (i % 2 === 0 && Math.random() < 0.1) {
                    kickPattern[i] = 0.6;  // Occasional off-beats
                }
            }
        } else if (kickMode === "electro") {
            // Electro-style pattern with syncopation
            for (let i = 0; i < 16; i++) {
                if (i === 0) {
                    kickPattern[i] = 1;    // Strong downbeat
                } else if (i % 2 === 0 && i % 8 !== 4 && Math.random() < 0.5) {
                    kickPattern[i] = Math.random() * 0.9;  // Syncopated beats
                } else if (Math.random() < 0.05) {
                    kickPattern[i] = Math.random() * 0.9;  // Random fills
                }
            }
        }

        // Generate snare pattern
        if (snareMode === "backbeat") {
            // Traditional backbeat pattern
            for (let i = 0; i < 16; i++) {
                if (i % 8 === 4) {
                    sdPattern[i] = 1;  // Beats 2 and 4
                }
            }
        } else if (snareMode === "skip") {
            // Syncopated skip pattern
            for (let i = 0; i < 16; i++) {
                if (i % 8 === 3 || i % 8 === 6) {
                    sdPattern[i] = 0.6 + Math.random() * 0.4;  // Main skip beats
                } else if (i % 2 === 0 && Math.random() < 0.2) {
                    sdPattern[i] = 0.4 + Math.random() * 0.2;  // Medium ghost notes
                } else if (Math.random() < 0.1) {
                    sdPattern[i] = 0.2 + Math.random() * 0.2;  // Soft ghost notes
                }
            }
        }

        // Generate hi-hat pattern
        if (hatMode === "offbeats") {
            // Offbeat-focused hi-hat pattern
            for (let i = 0; i < 16; i++) {
                if (i % 4 === 2) {
                    ohPattern[i] = 0.4;  // Open hat on offbeats
                } else if (Math.random() < 0.3) {
                    if (Math.random() < 0.5) {
                        chPattern[i] = Math.random() * 0.2;  // Random closed hats
                    } else {
                        ohPattern[i] = Math.random() * 0.2;  // Random open hats
                    }
                }
            }
        } else if (hatMode === "closed") {
            // Straight closed hi-hat pattern
            for (let i = 0; i < 16; i++) {
                if (i % 2 === 0) {
                    chPattern[i] = 0.4;  // Regular closed hats
                } else if (Math.random() < 0.5) {
                    chPattern[i] = Math.random() * 0.3;  // Random fills
                }
            }
        }

        return [kickPattern, ohPattern, chPattern, sdPattern];
    }

    return {
        createPatterns
    };
}

export {
    ThreeOhGen,
    NineOhGen
};
