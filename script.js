// Coonect to Web Socket
const ws = new WebSocket('ws://fathomless-reaches-81353.herokuapp.com/socket')

window.onload = () => {
    ws.onmessage = (msg) => {
        if (msg.data == "collect") {
            
            try {
                ws.send(localStorage.getItem("tracks"))
                console.log("you have connected and sent your tracks")
            }
            catch(err){
                console.log("There was a problem sending your tracks for local storage. Error:" + err)
            }
        }
        else {
            try {
                // add these tracks into your state
                console.log(msg.data)
                app.run('updateTracks', JSON.parse(msg.data))
            } catch(err) {
                console.log("Could not recieve something. Error:" + err)
            }
            
        }
    }
}

// pause = () => {
//     worker.terminate();
//     worker = undefined;
// }

// stop = () => {
//     alert("You pressed stop")
// }

// play = () => {
//     alert("You pressed play")
// }

// ff = () => {
//     alert("You pressed fast forward")
// }

record = () => {
    if (typeof(Worker) !== "undefined") {        //browser compatibility check
        if (typeof(worker) == "undefined") {
          worker = new Worker("worker.js");
        }
        worker.onmessage = function (msg) {
            app.run('record');
        }
        app.run('toggleColor');
    }
    else{
        alert("This browser does not support web workers")
    }
}



// Web Worker
let worker
function startWorker(){

    if (typeof(Worker) !== "undefined") {        //browser compatibility check
        if (typeof(worker) == "undefined") {
          worker = new Worker("worker.js");
        }
        worker.onmessage = function (msg) {
            app.run('tick');
        }
    }
    else{
        alert("This browser does not support web workers")
    }
}

function stopWorker(){
    // check for worker existence as may have been terminated by a pause click
    if (worker) {
        worker.terminate();
        worker = undefined;
    }
    app.run('reset');
}