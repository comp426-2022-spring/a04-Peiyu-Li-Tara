function coinFlip() {
let status = Math.round(Math.random())
if (status == 1) return "heads"
return "tails"
}

function coinFlips(flips) {
const result = []
for (let i = 0; i < flips; i ++){
	result[i] = coinFlip()
}
return result
}

function countFlips(array) {
let numHeads = 0;
let numTails = 0;
for (let i = 0; i < array.length; i ++){
	if (array[i] == "heads") numHeads ++;
	if (array[i] == "tails") numTails ++;
}
return {heads: numHeads, tails: numTails}
}

function flipACoin(call) {
let flip = coinFlip()
let result
if (flip == call) result = "win"
else result = 'lose' 
return {call: call, flip: flip, result: result}
}

function flipManyCoins(num){
let flips, summary
if (num != null)
	flips = coinFlips(num)
else
	flips = coinFlips(1) 
summary = countFlips(flips)
return {flips: flips, summary: summary}
}


const express = require('express');
const app = express()
const db = require("./database.js")
const args = require('minimist')(process.argv.slice(2))
var port = args['port'] || process.env.PORT || 5000
const help = (`
server.js [options]
--port, -p	Set the port number for the server to listen on. Must be an integer
            between 1 and 65535.
--debug, -d If set to true, creates endlpoints /app/log/access/ which returns
            a JSON access log from the database and /app/error which throws 
            an error with the message "Error test successful." Defaults to 
            false.
--log		If set to false, no log files are written. Defaults to true.
            Logs are always written to database.
--help, -h	Return this message and exit.
`)

// If --help, echo help text and exit
if (args.help || args.h) {
    console.log(help)
    process.exit(0)
}

const server = app.listen(port, () => {
    console.log('App listening on port %port%'.replace('%port%',port))
});

app.get('/app', (req, res, next) => {
    res.statusCode = 200;
    res.statusMessage = 'OK';
    res.writeHead( res.statusCode, { 'Content-Type' : 'text/plain' });
    res.end(res.statusCode+ ' ' +res.statusMessage)
}); 

app.get('/app/flip', (req, res, next) => {
	var flip = coinFlip()
	res.status(200).json({ 'flip': flip })
});

app.get('/app/flips/:number', (req, res, next) => {
	const flips = flipManyCoins(req.params.number)
	res.status(200).json({'raw': flips.flips, "summary": flips.summary})
});

app.get('/app/flip/call/heads', (req, res, next) => {
	const flip = flipACoin("heads")
	res.status(200).json({'call': 'heads', 'flip': flip.flip, 'result': flip.result})
});

app.get('/app/flip/call/tails', (req, res, next) => {
	const flip = flipACoin("tails")
	res.status(200).json({'call': 'tails', 'flip': flip.flip, 'result': flip.result})
});

if (args.debug || args.d) {
    app.get('/app/log/access/', (req, res, next) => {
        const stmt = db.prepare("SELECT * FROM accesslog").all();
	    res.status(200).json(stmt);
    })

    app.get('/app/error/', (req, res, next) => {
        throw new Error('Error test works.')
    })
}

app.use(function(req, res, nexts){
    const statusCode = 404
    const statusMessage = 'NOT FOUND'
    res.status(statusCode).end(statusCode+ ' ' +statusMessage)
});

// Tell STDOUT that the server is stopped
process.on('SIGINT', () => {
    server.close(() => {
		console.log('\nApp stopped.');
	});
});