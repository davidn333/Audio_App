let context, source, analyser;
context = new window.AudioContext();
source = context.createBufferSource();
analyser = context.createAnalyser();

let playingTrackIndex

class Track {
    constructor(trackname, data, city, countryCode, artist) {
        this.trackname = trackname
        this.data = data
        this.city = city || "paris"
        this.countryCode = countryCode || "fr"
        this.artist = artist || "David"
    }
}

function onPad(state, bar) {
    return state.grid.map(row => row[bar]).flat().filter(freq => freq) //filter array to just return frequencies, (exclude nulls)
}

function onPadIncNulls(state, bar) {
    return state.grid.map(row => row[bar]).flat() //filter array to just return frequencies, (exclude nulls)
}

let myTracks

try {
    myTracks = JSON.parse(localStorage.getItem("tracks"))
} catch(err) {
    myTracks = []
} finally {
    if (!myTracks) myTracks = []
}

const state = {
    grid: [
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null]
    ],
    bar: 7,
    recording: false,
    recordedTrack: [],
    allTracks: myTracks,
    playingBackTrack: false,
    loadedTrack: [],
    city: "",
    countryCode: ""
}
const view = state => {  //the view function has to return a string of html that gets rendered to the DOM
    return `
        <section>
            ${state.grid.map((row, row_i) => {
                return row.map((pad, pad_i) => {
                    if ((pad_i == state.bar) && worker) {
                        return `<samp class="${pad ? "pulse" : "off"}" onclick="app.run('toggle', ${row_i}, ${pad_i})"></samp>`
                    }
                    else{
                        return `<samp class="${pad ? "on" : "off"}" onclick="app.run('toggle', ${row_i}, ${pad_i})"></samp>`
                    }
                }).join("")
            }).join("")}
        </section>

        <aside>
            <h3>Track List</h3>
            <hr>
            <ol>
                ${
                    state.allTracks.map((track, i) => `<li id="track ${i}"><img src="https://www.countryflags.io/${track.countryCode}/flat/24.png"><a onclick="app.run('playbackTrack', ${i})">${track.trackname}</a><button onclick="app.run('deleteTrack', ${i})">Delete</button><button onclick="app.run('send', ${i})">Send</button</button></li>`).join("")
                }
            </ol>
        </aside>
    `
}
const update = {
    toggle: (state, row, pad) => {

        const FREQUENCIES = [
            [1047.0, 1175, 1319, 1397, 1480, 1568, 1760, 1976],
            [523.3, 587.3, 659.3, 698.5, 740, 784, 880, 987.8],
            [261.6, 293.7, 329.6, 349.2, 370, 392, 440, 493.9],
            [130.8, 146.8, 164.8, 174.6, 185, 196, 220, 246.9]
        ]

        state.grid[row][pad] 
            ? state.grid[row][pad] = null 
            : state.grid[row][pad] = FREQUENCIES[row][pad]

        
        return state
    },

    tick: (state) => {

        const bar = state.bar === state.grid[0].length - 1 
            ? 0 
            : state.bar + 1

        var freqs = onPad(state, bar);

        if (state.playingBackTrack) {

            if ((state.bar == 7) && (state.loadedTrack.length > 0)) {

                console.log(state.loadedTrack)

                state.grid = state.loadedTrack[0];

                freqs.forEach(freq => {
                const o = context.createOscillator();

                o.frequency.value = freq;
                visualiser(o);
                o.stop(context.currentTime + 1);
                })  

                state.loadedTrack.shift();

            }
            else if ((state.bar == 7) && (state.loadedTrack.length == 0)) {
                console.log("no longer playing back track")
                state.playingBackTrack = false
                stopWorker();
            }
            else{
                console.log("the block of 8 in turn")
                console.log(state.loadedTrack[0])
                freqs.forEach(freq => {
                    const o = context.createOscillator();
                    o.frequency.value = freq;
                    visualiser(o);
                    o.stop(context.currentTime + 1);
                })
            }

        }
        else{
            // console.log(freqs);
            freqs.forEach(freq => {
                const o = context.createOscillator();
                o.frequency.value = freq;
                visualiser(o);
                o.stop(context.currentTime + 1);
            })
        }
        
        return {...state, bar} // '...' is the spread operator, return copy of the state with the changes of bar overriding the original object
    },

    reset: (state) => {

        const bar = 7
        const grid = [
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null]
        ]
        return {...state, grid, bar, playingBackTrack:!state.playingBackTrack}
    },

    selectAll: (state) => {
        const grid = [
            [1047.0, 1175, 1319, 1397, 1480, 1568, 1760, 1976],
            [523.3, 587.3, 659.3, 698.5, 740, 784, 880, 987.8],
            [261.6, 293.7, 329.6, 349.2, 370, 392, 440, 493.9],
            [130.8, 146.8, 164.8, 174.6, 185, 196, 220, 246.9]
        ]
        return {...state, grid}
    },

    pause: () => {
        if (worker == undefined) {
            worker = new Worker("worker.js");
            worker.onmessage = function (msg) {
                app.run('tick');
            }
        }
        else{
            worker.terminate();
            worker = undefined;
        }
    },

    record: (state) => {

        if (worker && !state.recording) {

            // Stop worker
            worker.terminate();
            worker = undefined;
            console.log("Recorded track:")
            console.log(state.recordedTrack);

            // Name track
            var trackname = window.prompt("Save this track?", "Track Name")
            
            if (trackname) {
                var pattern = /^[A-Za-z\s]+/;
                console.log("Matches regex?");
                console.log(pattern.test(trackname));
                pattern.test(trackname) ? trackname : encodeURIComponent(trackname);



                var track = new Track(trackname, state.recordedTrack, state.city, state.countryCode);
                console.log("Track created:")
                console.log(track);

                myTracks.push(track)
                localStorage.setItem("tracks", JSON.stringify(myTracks))
                state.allTracks.push(track)

                return {...state, recordedTrack:[]}
            }
            else {
                return {...state, recordedTrack:[]}
            }


        }
        else if (worker) {

            const bar = state.bar === state.grid[0].length - 1 
            ? 0 
            : state.bar + 1

            freqs = onPad(state, bar);
            freqsIncNulls = onPadIncNulls(state,bar);
            state.recordedTrack.push(freqsIncNulls);
            console.log(freqsIncNulls);
            
            freqs.forEach(freq => {
                const o = context.createOscillator();
                o.frequency.value = freq;
                o.connect(context.destination);
                o.start();
                o.stop(context.currentTime + 1);
            })
            
            return {...state, bar} // '...' is the spread operator, return copy of the state with the changes of bar overriding the original object
        }
    },

    toggleColor: (state) => {

        document.getElementById("record").classList.contains("recordOn")
        ? document.getElementById("record").classList.remove("recordOn")
        : document.getElementById("record").classList.add("recordOn");
        return {...state, recording:!state.recording}
    },

    deleteTrack: (state, index) => {
        state.allTracks.splice(index, 1)
        myTracks.splice(index, 1)
        localStorage.setItem("tracks", JSON.stringify(myTracks))
        // localStorage.setItem("tracks", JSON.stringify(state.allTracks))
        return {...state}
    },

    playbackTrack: (state, index) => {

        var playbackTrack = []
        var bar = 0
        var trackData = state.allTracks[index].data;
        playingTrackIndex = index;

        while (bar < trackData.length) {
            playbackTrack.push(trackData.slice(bar, bar += 8))
            console.log(playbackTrack)
        }

        while(playbackTrack[playbackTrack.length - 1].length < 8){
            playbackTrack[playbackTrack.length - 1]
            .push([null, null, null, null])
        }

        state.playingBackTrack = true;
        state.loadedTrack = playbackTrack.map(arrayFour => {

            return [
                [arrayFour[0][0] || null,arrayFour[1][0] || null,arrayFour[2][0] || null,arrayFour[3][0] || null,arrayFour[4][0] || null,arrayFour[5][0] || null,arrayFour[6][0] || null,arrayFour[7][0] || null],
                [arrayFour[0][1] || null,arrayFour[1][1] || null,arrayFour[2][1] || null,arrayFour[3][1] || null,arrayFour[4][1] || null,arrayFour[5][1] || null,arrayFour[6][1] || null,arrayFour[7][1] || null],
                [arrayFour[0][2] || null,arrayFour[1][2] || null,arrayFour[2][2] || null,arrayFour[3][2] || null,arrayFour[4][2] || null,arrayFour[5][2] || null,arrayFour[6][2] || null,arrayFour[7][2] || null],
                [arrayFour[0][3] || null,arrayFour[1][3] || null,arrayFour[2][3] || null,arrayFour[3][3] || null,arrayFour[4][3] || null,arrayFour[5][3] || null,arrayFour[6][3] || null,arrayFour[7][3] || null]
            ]
        });

        state.grid = state.loadedTrack[0];

        // set bar back to 7 so that track plays from beginning
        state.bar = 7;
        startWorker();

        return {...state}

    },
    updateTracks: (state, incomingTracks) => {

        const tracksToAdd = incomingTracks.filter(track => !state.allTracks.find(t => t.trackname === track.trackname));
        console.log("If there are any new tracks theyre below:")
        console.log(tracksToAdd)
        state.allTracks = state.allTracks.concat(tracksToAdd)
        console.log("allTracks:")
        console.log(state.allTracks)
        return state

    },
    send: (state, i) => {
        var trackToSend = []
        trackToSend.push(state.allTracks[i])
        
        console.log("This is the track to send:")
        console.log(trackToSend)

        // JSON.stringify DOES NOT MODIFIY THE OBJECT/PARAMETER!!!
        //
        // If you want to stringify the 'trackToSend' array. You must aign it to a variable. E.g:
        //
        // const stringifiedArray = JSON.stringify(trackToSend)
        //
        // Or can do the stringify when sending the object, like below

        ws.send(JSON.stringify(trackToSend))
    },
    geoData: (state, city, countryCode) => ({...state, city, countryCode}) // Set state.city and state.countryCode
}

app.start('main', state, view, update)