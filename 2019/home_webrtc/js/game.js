Matter.use('matter-wrap');

const MAX_PARTICLES = 20;
const PLAYER_RADIUS = 30;
const NEAR_DISTANCE = 15;
const PARTICLE_RADIUS = 3;
const torque = .01;
const APPLIED_FORCE = .0002;

let GAME_STATE = 0; // 0 intro / game-over, 1 animate house, 2 play game
let GAME_STATE_START = 0; // used for timer
let GAME_STATE_PREVIOUS = 0;
let GAME_STATE_2_DURATION = 4000;
let GAME_STATE_2_DURATION_MOVE = 2000;
let GAME_STATE_3_DURATION = 60000;
let NEED_TOGETHER = 2;
let TIME_TOGETHER = 0;
let FRAME = 0;
let CENTER = {x: 0, y: 0};
let RADIUS = 1;
const keyCodes = [];

const Engine = Matter.Engine,
	Render = Matter.Render,
	Events = Matter.Events,
	World = Matter.World,
	Bodies = Matter.Bodies;

let cube, triangle;

const Server = new Network("");

class particle {
	constructor(body) {
		this.body = body;
		this.frame = 0;
	}
}

class particleSet {
	constructor(type, render) {
		this.type = type;
		this.index = 0;
		this.lastFrame = 0;
		this.bodies = [];
		for (let i = 0; i < MAX_PARTICLES; i++) {
			let body;
			if (type == 'cube') {
				body = Bodies.polygon(400, 200, 4, PARTICLE_RADIUS, {frictionAir: 0.0, density: 0.0002});
			} else {
				body = Bodies.polygon(400, 200, 3, PARTICLE_RADIUS / 1.2, {frictionAir: 0.0, density: 0.0002});
			}
			body.render.strokeStyle = "#999";
			body.render.fillStyle = "none";
			body.render.lineWidth = .5;
			this.bodies.push(new particle(body));
		}
		this.setWrap({x: render.bounds.min.x, y: render.bounds.min.y}, {
			x: render.bounds.max.x,
			y: render.bounds.max.y
		});
	}

	setWrap(min, max) {
		for (let i = 0; i < this.bodies.length; i++) {
			this.bodies[i].body.plugin.wrap = {min, max};
		}
	}

	emit(parent, frame, engine, rOffset = 0) {
		if (frame - this.lastFrame > 2) {
			this.lastFrame = frame;
			this.bodies[this.index].frame = frame;
			const body = this.bodies[this.index].body;
			Matter.Body.setPosition(body, {
				x: parent.position.x + PLAYER_RADIUS * Math.cos(parent.angle + rOffset + Math.PI),
				y: parent.position.y + PLAYER_RADIUS * Math.sin(parent.angle + rOffset + Math.PI)
			});
			Matter.Body.setAngularVelocity(body, (Math.random() - .5));
			Matter.Body.setVelocity(body, {
				x: /*parent.velocity.x*/ +.3 * Math.sqrt(PLAYER_RADIUS / PARTICLE_RADIUS) * Math.cos(parent.angle + rOffset + Math.PI),
				y: /*parent.velocity.y*/ +.3 * Math.sqrt(PLAYER_RADIUS / PARTICLE_RADIUS) * Math.sin(parent.angle + rOffset + Math.PI)
			});
			World.addBody(engine.world, body);
			this.index = (this.index + 1) % this.bodies.length;
		}
	}

	removeAll(engine) {
		for (let i = 0; i < this.bodies.length; i++) {
			World.remove(engine.world, this.bodies[i].body);
		}
	}
}

function setPlayersConnection(connections) {
	for (let i = 0; i < 2; i++) {
		const connected = connections[i] ? true : false;
		const el = document.querySelector('#player' + (i + 1) + ' h4');
		el.innerHTML = connected ? 'Connected' : 'Awaiting connection...';
	}

	if (connections.length >= 2 && GAME_STATE == 0) {
		document.getElementById('qrcode').style.visibility = 'hidden';
		this.startGame();
	} else if (GAME_STATE == 0) {
		document.getElementById('qrcode').style.visibility = 'visible';
	}
}

function startGame() {
	GAME_STATE = 1;
	const d = new Date();
	GAME_STATE_START = d.getTime();
	GAME_STATE_PREVIOUS = GAME_STATE_START;

	Matter.Body.setAngularVelocity(cube, (Math.random() - .5) * .1);
	Matter.Body.setAngularVelocity(triangle, (Math.random() - .5) * .1);

	document.getElementById('start').innerHTML = "Build a home together";
}

function createHouse(cube, triangle) {
	Matter.Body.setPosition(cube, CENTER);
	Matter.Body.setAngularVelocity(cube, 0);
	Matter.Body.setAngle(cube, 0);
	Matter.Body.setVelocity(cube, {x: 0, y: 0});

	Matter.Body.setPosition(triangle, {x: CENTER.x, y: CENTER.y - PLAYER_RADIUS - 1});
	Matter.Body.setAngularVelocity(triangle, 0);
	Matter.Body.setAngle(triangle, -Math.PI / 2 * 3);
	Matter.Body.setVelocity(triangle, {x: 0, y: 0});
}

function moveHouse(cube, triangle, t, dt) {
	t = t * t * (3 - 2 * t);
	let lerp = dt / (1 - t + dt);
	if (lerp <= 1 && t <= 1) {
		const cubeTarget = {x: window.innerWidth * .8, y: CENTER.y};
		const cubePos = {
			x: cube.position.x * (1 - lerp) + (lerp) * cubeTarget.x,
			y: cube.position.y * (1 - lerp) + (lerp) * cubeTarget.y
		};
		Matter.Body.setPosition(cube, cubePos);

		const triangleTarget = {x: window.innerWidth * .2, y: CENTER.y};
		const trianglePos = {
			x: triangle.position.x * (1 - lerp) + (lerp) * triangleTarget.x,
			y: triangle.position.y * (1 - lerp) + (lerp) * triangleTarget.y
		};
		Matter.Body.setPosition(triangle, trianglePos);

		Matter.Body.setVelocity(cube, {x: 0, y: 0});
		Matter.Body.setVelocity(triangle, {x: 0, y: 0});
	}
}

function init() {
	const engine = Engine.create();
	const render = Render.create({
		element: document.body,
		engine: engine,
		options: {
			width: window.innerWidth,
			height: window.innerHeight,
			wireframes: false,
		}
	});

	const triangleParticles = new particleSet('triangle', render);
	const cubeParticles = new particleSet('cube', render);

	triangle = Bodies.polygon(400, 200, 3, PLAYER_RADIUS / 1.2, {frictionAir: 0.0, density: 0.002});
	cube = Bodies.polygon(800, 200, 4, PLAYER_RADIUS, {frictionAir: 0.0});

	[triangle, cube].forEach(e => {
		e.render.strokeStyle = "#fff";
		e.render.lineWidth = 1;
		e.render.fillStyle = "none";
		e.plugin.wrap = {
			min: {x: render.bounds.min.x, y: render.bounds.min.y},
			max: {x: render.bounds.max.x, y: render.bounds.max.y}
		};
	});

	CENTER.x = window.innerWidth / 2;
	CENTER.y = window.innerHeight / 2;
	RADIUS = Math.min(CENTER.x, CENTER.y) * .5;
	createHouse(cube, triangle);

	World.add(engine.world, [triangle, cube]);
	engine.world.gravity.y = 0;

	Engine.run(engine);
	Render.run(render);

	window.addEventListener('keydown', (e) => {
		keyCodes[e.keyCode] = true;
	});

	window.addEventListener('resize', () => {
		render.canvas.width = window.innerWidth;
		render.canvas.height = window.innerHeight;
		render.bounds = {min: {x: 0, y: 0}, max: {x: window.innerWidth, y: window.innerHeight}};

		triangleParticles.setWrap({x: render.bounds.min.x, y: render.bounds.min.y}, {
			x: render.bounds.max.x,
			y: render.bounds.max.y
		});
		cubeParticles.setWrap({x: render.bounds.min.x, y: render.bounds.min.y}, {
			x: render.bounds.max.x,
			y: render.bounds.max.y
		});

		triangle.plugin.wrap = {
			min: {x: render.bounds.min.x, y: render.bounds.min.y},
			max: {x: render.bounds.max.x, y: render.bounds.max.y}
		};
		cube.plugin.wrap = {
			min: {x: render.bounds.min.x, y: render.bounds.min.y},
			max: {x: render.bounds.max.x, y: render.bounds.max.y}
		};

		if (GAME_STATE == 0) {
			createHouse(cube, triangle);
		}
	});

	Events.on(engine, "beforeUpdate", () => {
		const d = new Date();
		const t = d.getTime() - GAME_STATE_START;

		if (GAME_STATE == 1) {
			const dt = t - GAME_STATE_PREVIOUS;
			if (t < GAME_STATE_2_DURATION_MOVE) {
				moveHouse(cube, triangle, t / GAME_STATE_2_DURATION_MOVE, dt / GAME_STATE_2_DURATION_MOVE);
			} else if (t > GAME_STATE_2_DURATION) {
				GAME_STATE = 2;
				document.getElementById('start').style.visibility = 'hidden';
				document.getElementById('title').style.visibility = 'hidden';
				document.getElementById('player1').style.visibility = 'hidden';
				document.getElementById('player2').style.visibility = 'hidden';
				document.getElementById('timer').style.visibility = 'visible';
				document.getElementById('timer').innerHTML = (GAME_STATE_3_DURATION / 1000).toFixed(2);
				GAME_STATE_START = d.getTime();
				return;
			}
		}
		if (GAME_STATE == 2) {
			const timeLeft = t;
			if (timeLeft < GAME_STATE_3_DURATION) {
				// loop
				FRAME++;
				document.getElementById('timer').innerHTML = ((GAME_STATE_3_DURATION - timeLeft) / 1000).toFixed(2);

				const p1 = Server.getPlayerInput(0);
				const p2 = Server.getPlayerInput(1);

				updateBody(triangle, p1.l, p1.r, p1.f, 0, cubeParticles, engine);
				updateBody(cube, p2.l, p2.r, p2.f, 0, triangleParticles, engine);
			} else {
				GAME_STATE = 0;
				document.getElementById('title').innerHTML = "GAME OVER";
				document.getElementById('start').innerHTML = "Press space to start";
				document.getElementById('start').style.visibility = 'visible';
				document.getElementById('title').style.visibility = 'visible';
				document.getElementById('player1').style.visibility = 'visible';
				document.getElementById('player2').style.visibility = 'visible';
				document.getElementById('timer').style.visibility = 'hidden';
				setPlayersConnection(Server.connections);
			}
		}
		GAME_STATE_PREVIOUS = t;
	});

	Events.on(engine, "afterUpdate", () => {
		if (GAME_STATE == 2) {
			let vertices_near = 0;
			for (let i = 0; i < triangle.vertices.length; i++) {
				const vt = triangle.vertices[i];
				for (let j = 0; j < cube.vertices.length; j++) {
					const vc = cube.vertices[j];
					const d = {x: vt.x - vc.x, y: vt.y - vc.y};
					if (Math.sqrt(d.x * d.x + d.y * d.y) < NEAR_DISTANCE) {
						vertices_near++;
					}
				}
			}

			if (vertices_near >= 2) {
				const diff = {x: triangle.position.x - cube.position.x, y: triangle.position.y - cube.position.y};
				const l = Math.sqrt(diff.x * diff.x + diff.y * diff.y);
				diff.x *= .04 / (l * l);
				diff.y *= .04 / (l * l);

				Matter.Body.applyForce(triangle, triangle.position, {x: -diff.x, y: -diff.y});
				Matter.Body.applyForce(cube, cube.position, diff);

				const cc = {x: cube.position.x - CENTER.x, y: cube.position.y - CENTER.y};
				if (Math.sqrt(cc.x * cc.x + cc.y * cc.y) < RADIUS) {
					TIME_TOGETHER += 1 / 60;
					if (TIME_TOGETHER > NEED_TOGETHER) {
						GAME_STATE = 0;
						document.getElementById('title').innerHTML = "Congratulations! You have found your home.";
						document.getElementById('start').innerHTML = "Press space to start";
						document.getElementById('start').style.visibility = 'visible';
						document.getElementById('title').style.visibility = 'visible';
						document.getElementById('player1').style.visibility = 'visible';
						document.getElementById('player2').style.visibility = 'visible';
						document.getElementById('timer').style.visibility = 'hidden';
						setPlayersConnection(Server.connections);
					}
				} else {
					TIME_TOGETHER = 0;
				}
			} else {
				TIME_TOGETHER = 0;
			}


		}
	});

	Events.on(render, "afterRender", () => {
		CENTER.x = window.innerWidth / 2;
		CENTER.y = window.innerHeight / 2;
		RADIUS = Math.min(CENTER.x, CENTER.y) * .5;
		render.context.strokeStyle = "#00bc8c";
		render.context.lineWidth = .5;
		render.context.beginPath();
		render.context.arc(CENTER.x, CENTER.y, RADIUS, 0, 2 * Math.PI);
		if (TIME_TOGETHER > 0) {
			render.context.fillStyle = 'rgba(0, 188, 140, .1)';
			render.context.fill();
		} else {
			render.context.fillStyle = 'none';
		}
		render.context.stroke();
	});

	render.canvas.style.background = "transparent";
}

function updateBody(body, l, r, f, rOffset, particles, engine) {

	body.torque = (l ? -torque : 0) + (r ? torque : 0);
	if (f) {
		const s = .001;
		Matter.Body.applyForce(body, body.position, {
			x: APPLIED_FORCE * Math.cos(body.angle + rOffset),
			y: APPLIED_FORCE * Math.sin(body.angle + rOffset)
		});
		particles.emit(body, FRAME, engine, rOffset);
	}
}

window.addEventListener('load', () => {
	init();
});