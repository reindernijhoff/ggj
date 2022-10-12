class Network {
	constructor(server = null) {
		this.peer = null;
		this.conn = null;
		this.connections = [];
		this.message = document.getElementById("status");
		this.isServer = server.trim() == "" ? true : false;
		this.initialize(server);
	}

	initialize(server) {
		const peer = new Peer(null, {debug: 3});

		peer.on('open', (id) => {
			// Workaround for peer.reconnect deleting previous id
			if (peer.id === null) {
				console.log('Received null id from peer open');
				peer.id = lastPeerId;
			} else {
				this.lastPeerId = peer.id;
			}
			this.log("ID: " + peer.id);
			this.log("Awaiting connection...");

			if (this.isServer) {
				this.showConnectionUrl();
			} else {
				this.join(server);
			}
		});
		peer.on('connection', (c) => {
			// Allow only a single connection
			if (!this.isServer && this.conn) {
				c.on('open', function () {
					c.send("Already connected to another client");
					setTimeout(function () {
						c.close();
					}, 500);
				});
				return;
			}
			if (this.isServer) {
				this.connections.push(c);
				// Handle incoming data (messages only since this is the signal sender)
				c.on('data', (data) => {
					this.log("Peer: " + data.start + ", " + data.end);
					if (!c.playerInput) {
						c.playerInput = [];
					}
					if (data.start) {
						c.playerInput[data.start] = true;
					}
					if (data.end) {
						c.playerInput[data.end] = false;
					}
				});
				c.on('close', () => {
					this.log("Connection closed");
					// remove from clients
					this.connections = this.connections.filter(v => v != c);
					setPlayersConnection(this.connections);
				});
				c.send({connected: true});
				setPlayersConnection(this.connections);
			}
			this.conn = c;
			this.log("Connected to: " + c.peer);
		});
		peer.on('disconnected', () => {
			this.alert("Connection destroyed. Please refresh");
			// Workaround for peer.reconnect deleting previous id
			peer.id = lastPeerId;
			peer._lastServerId = lastPeerId;
			peer.reconnect();
		});
		peer.on('close', () => {
			this.conn = null;
			this.alert("Connection destroyed. Please refresh");
		});
		peer.on('error', (err) => {
			this.alert(err);
		});
		this.peer = peer;
	}

	getPlayerInput(i) {
		const ret = {l: 0, r: 0, f: 0};
		if (this.connections[i] && this.connections[i].playerInput) {
			const inp = this.connections[i].playerInput;

			ret.l = inp['l'] ? 1 : 0;
			ret.r = inp['r'] ? 1 : 0;
			ret.f = inp['f'] ? 1 : 0;
		}
		return ret;
	}

	log(str) {
		console.log(str);
	}

	alert(str) {
		alert(str);
	}

	send(data) {
		this.log("Send: " + data);
		if (this.isServer) {
			for (let i = 0; i < this.connections.length; i++) {
				this.connections[i].send(data);
			}
		} else {
			this.conn.send(data);
		}
	}

	showConnectionUrl() {
		let loc = window.location.toString().replace('index.html', 'client.html');
		if (loc.indexOf('client.html') <= 0) {
			loc += 'client.html';
		}
		const url = loc + '#' + this.peer.id;
		const el = document.getElementById("qrcode");
		new QRCode(el, {
			text: url,
			width: 256,
			height: 256,
			correctLevel: QRCode.CorrectLevel.L
		});
		document.getElementById("clientlink").innerHTML = '<a href="' + url + '" target="_blank">' + url + '</a>';
	}

	join(id) {
		this.isServer = false;

		// Close old connection
		if (this.conn) {
			this.conn.close();
		}
		// Create connection to destination peer specified in the input field
		this.conn = this.peer.connect(id, {
			reliable: true
		});
		this.conn.on('open', () => {
			this.log("Connected to: " + this.conn.peer);
		});
		// Handle incoming data (messages only since this is the signal sender)
		this.conn.on('data', (data) => {
			this.log("Peer: " + data);
		});
		this.conn.on('close', () => {
			this.alert("Peer: " + data);
		});
	};
}