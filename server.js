/*
 * race tree timer server
 */
/* MIT
 * Copyright (c) 2021 Michael Graves
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
const websocket = require('ws');
const http = require('http');
const os = require('os');

const port = 3000;
const wsport = 8080;
const inc = 10;			// update increment
hostname = "";			// address to listen on
stime = 0;				// start time
etime = 0;				// end time
run = false;			// running state
sendUpdateObj = null;	// update interval object
wsClients = [];			// websocket client array


function getIPaddress(i) {
	val = os.networkInterfaces()
	intf = val[i];
	to_ret="127.0.0.1";
	if (intf == undefined) {
		console.error(`couldn't not find address for ${i}`);
		return(to_ret);
	}
	intf.forEach(function(x) {
		if (x.family == "IPv4") {
			to_ret = x.address;
		}
	});
	return(to_ret);
}

function startRaceTimer() {
	if (run == false) {
		if (stime == 0) {
			d = new Date();
			stime = d.getTime();
			run = true;
			sendUpdateObj = setInterval(sendUpdate, inc);
		}
	}
}

function stopRaceTimer() {
	if (run == true) {
		d = new Date();
		etime = d.getTime()
		run = false;
		clearInterval(sendUpdateObj);
		sendUpdateObj = null;
	}
}

function resetRaceTimer() {
	stime = 0;
	etime = 0;
	run = false;
	if (sendUpdateObj != null) {
		clearInterval(sendUpdateObj);
		sendUpdateObj = null;
	}
	wsClients.forEach(c => c.send("0"));
}

function sendUpdate() {
	d = new Date();
	time = d.getTime() - stime;
//	console.log(`time: ${time}`);
	wsClients.forEach(c => c.send(time));
}

myargs = process.argv.slice(2);
//console.log('args: ',myargs);
while (myargs.length > 0) {
	switch (myargs[0]) {
		case '-i':
			hostname = getIPaddress(myargs[1]);
			myargs.shift();
			myargs.shift();
			break;
		default:
			myargs.shift();
			break;
	}
}

console.warn("hostname :", hostname);

/*
 * start the websocket listener
 */
const wsserver = new websocket.Server({ port: wsport });

wsserver.on('connection', function(sock) {
	console.log("client connected");
	// push this socket onto the client list
	wsClients.push(sock);
	// just tank any messages received
	sock.on('message', function(msg) {});
	// remove closed or disconnected sockets from client list
	sock.on('close', function() {
		wsClients = wsClients.filter(s => s !== sock);
	});
});

/*
 * start the http listener
 */
const server = http.createServer((req, res) => {
	const url = req.url;
	acao_host="*"
	if (hostname.length > 0) {
		acao_host=`http://${hostname}`
	}
	res.statusCode = 200;
	res.setHeader('Content-Type', 'text/plain');
	res.setHeader('Access-Control-Allow-Origin', acao_host);
	if (url === '/start') {
		console.log('start');
		startRaceTimer();
		res.end('OK');
	} else if (url === '/stop') {
		console.log('stop');
		stopRaceTimer();
		res.end('OK');
	} else if (url === '/reset') {
		console.log('reset');
		resetRaceTimer();
		res.end('OK');
	} else {
		console.log(`unknown request ${url}`);
		res.end('UNKNOWN request');
	}
});

server.listen(port, () => {
	console.warn(`Server running at http://${hostname}:${port}/`);
});

