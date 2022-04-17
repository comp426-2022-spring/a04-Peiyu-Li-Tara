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


const express = require('express')
const app = express()
const morgan = require('morgan')
const fs = require("fs")
const db = require("./database.js")
const args = require('minimist')(process.argv.slice(2))
var port = args['port'] || process.env.PORT || 5000
const help = (`
server.js [options]

--port	Set the port number for the server to listen on. Must be an integer
            between 1 and 65535.

--debug	If set to true, creates endlpoints /app/log/access/ which returns
            a JSON access log from the database and /app/error which throws 
            an error with the message "Error test successful." Defaults to 
            false.

--log		If set to false, no log files are written. Defaults to true.
            Logs are always written to database.

--help	Return this message and exit.
`)

// If --help, echo help text and exit
if (args.help || args.h) {
    console.log(help)
    process.exit(0)
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const server = app.listen(port, () => {
    console.log('App listening on port %port%'.replace('%port%',port))
});

// If --log=false then do not create a log file
if (args.log == 'false') {
    console.log("NOTICE: not creating file access.log")
} else {
// Use morgan for logging to files
// Create a write stream to append to an access.log file
    const accessLog = fs.createWriteStream('access.log', { flags: 'a' })
// Set up the access logging middleware
    app.use(morgan('combined', { stream: accessLog }))
}
// Always log to database
app.use((req, res, next) => {
    let logdata = {
        remoteaddr: req.ip,
        remoteuser: req.user,
        time: Date.now(),
        method: req.method,
        url: req.url,
        protocol: req.protocol,
        httpversion: req.httpVersion,
        status: res.statusCode,
        referrer: req.headers['referer'],
        useragent: req.headers['user-agent']
    };
    console.log(logdata)
    const stmt = db.prepare('INSERT INTO accesslog (remoteaddr, remoteuser, time, method, url, protocol, httpversion, status, referrer, useragent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    const info = stmt.run(logdata.remoteaddr, logdata.remoteuser, logdata.time, logdata.method, logdata.url, logdata.protocol, logdata.httpversion, logdata.status, logdata.referrer, logdata.useragent)
    //console.log(info)
    next();
})

app.get('/app', (req, res, next) => {
    res.statusCode = 200;
    res.statusMessage = 'OK';
    res.writeHead( res.statusCode, { 'Content-Type' : 'text/plain' });
    res.end(res.statusCode+ ' ' +res.statusMessage)
}); 

app.get('/app/flip', (req, res) => {
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

app.use(function(req, res){
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