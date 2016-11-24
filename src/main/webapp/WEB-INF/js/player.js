/**
 * Constructor for Player.
 * Adds the camera and player physics objects to the scene.
 * @param scene the Physijs.scene the player will belong to
 * @param timestep the expected time between physics simulations
 * @param debug whether to display the player in debug mode (default false)
 * @constructor
 */
var Player = function(scene, timestep, debug) {

	// general player settings
	this.speed = 5;
	this.acceleration = 10;
	this.airAcceleration = 1;
	this.jumpVelocity = 12;
	this.mouseSensitivity = 0.004;
	this.height = 1.8;
	this.width = 0.5;
	this.mass = 5; // TODO: determine mass units
	this.friction = 2.2;

	this.scene = scene;
	this.timestep = timestep;
	this.debug = (typeof debug == "undefined") ? false : debug;
	this.camera = new THREE.PerspectiveCamera(
		70, // FOV
		window.innerWidth / window.innerHeight, // aspect ratio
		0.3, // near
		1000 // far
	);
	// causes Y rotation to be applied before X and Z
	// camera controls would be highly unweildy without this
	this.camera.rotation.order = "YXZ";
	scene.add(this.camera);

	// build the player's physical body
	// the main section is low-friction to avoid clinging to walls
	var bodyMaterial = Physijs.createMaterial(
		debug ?
			new THREE.MeshBasicMaterial({ color: 0x66ff66, wireframe: true }) :
			new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
		0.1, // low friction
		0    // no restitution
	);
	this.body = new Physijs.CylinderMesh(
		new THREE.CylinderGeometry(0.5 * this.width, 0.5 * this.width, 0.75 * this.height, 12),
		bodyMaterial,
		0.5 * this.mass
	);
	scene.add(this.body);
	// lock all rotation, producing a rigid player
	// must be called after adding to scene, not before
	this.body.setAngularFactor(new THREE.Vector3(0, 0, 0));

	// build the player's "foot", a smaller piece with high friction that prevents sliding on the ground
	var footMaterial = Physijs.createMaterial(
		debug ?
			new THREE.MeshBasicMaterial({ color: 0xffff66, wireframe: true }) :
			new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }),
		this.friction, // high friction
		0 // no restitution
	);
	this.foot = new Physijs.ConeMesh(
		new THREE.ConeGeometry(0.45 * this.width, 0.2 * this.height, 12),
		footMaterial,
		0.5 * this.mass
	);
	this.foot.rotateX(Math.PI);
	this.foot.position.set(this.body.position.x, this.body.position.y - 0.525 * this.height, this.body.position.z);
	this.foot.addEventListener(
		"collision",
		function(other_object, relative_velocity, relative_rotation, contact_normal) {
			// TODO: maybe put an impact sound or something for hitting the ground
		}
	);
	scene.add(this.foot);
	// if you are reading this and want to have some fun, comment out the next line and set debug to true in game.jsp
	this.foot.setAngularFactor(new THREE.Vector3(0, 0, 0));

	// bind the body parts together
	var constraint = new Physijs.DOFConstraint(this.foot, this.body, this.foot.position);
	scene.addConstraint(constraint);

	// initialize a special short-range raycaster that determines whether the player is on the ground
	this.onGround = false;
	this.groundcaster = new THREE.Raycaster();
	this.groundcaster.far = 0.2 * this.height;
	if(debug) {
		this.groundcasterLine = new THREE.Line(new THREE.Geometry(), new THREE.MeshBasicMaterial({ color: 0x6666ff }));
		scene.add(this.groundcasterLine);
		this.groundcasterPoint = new THREE.Mesh(new THREE.SphereGeometry(0.05), new THREE.MeshBasicMaterial({ color: 0xffff66 }));
		scene.add(this.groundcasterPoint);
	}

	// just for convenience
	this.HALF_PI = Math.PI / 2;
	this.TWO_PI = 2 * Math.PI;

	// used to compensate for friction later
	this.lastVelocity = new THREE.Vector3(0, 0, 0);
};

Player.prototype = {

	constructor: Player,

	/**
	 * Moves the player around the world.
	 * @param keystatus ascii-indexed keyboard states
	 */
	update: function(keystatus) {
		// use our short range raycaster to see if the player is on the ground
		this.onGround = false;
		this.groundcaster.set(this.foot.position, new THREE.Vector3(0, -1, 0));
		var intersects = this.groundcaster.intersectObjects(this.scene.children);
		for(var i = 0; i < intersects.length; i++) {
			if(!(intersects[i].object == this.foot || intersects[i].object == this.body
				|| (debug && (intersects[i].object == this.groundcasterLine || intersects[i].object == this.groundcasterPoint)))) {
				this.onGround = true;
				break;
			}
		}

		// move the player based on keyboard input
		var W = keystatus[87];
		var A = keystatus[65];
		var S = keystatus[83];
		var D = keystatus[68];
		var speed, acceleration;

		acceleration = (this.onGround ? this.acceleration : this.airAcceleration) * this.timestep;
		speed = this.speed;

		// HACK to increase speed for testing
		// TODO: get rid of this when done testing
		if(keystatus[16]) // Shift
			speed *= 10;
		//
		// // constants to compensate for friction
		// // these were determined experimentally
		// if(this.onGround) {
		// 	speed += 0.8 * this.friction;
		// 	acceleration += 0.6 * this.friction;
		// }

		// accelaration is multiplied by sqrt(2) to account for the fact that the body is only half the player's mass,
		// but not if moving diagonally (to prevent increased player speed on the diagonal)
		if ((W == S) != (A == D)) acceleration *= 1.414214;
		if((W != S) && (A != D)) speed /= 1.414214;


		// get the current velocity, rotated to local space
		var v = this.body.getLinearVelocity().applyAxisAngle(new THREE.Vector3(0, 1, 0), -this.camera.rotation.y);

		// used to compensate for friction direction(s) the player is moving
		var compZ = this.lastVelocity.z - v.z;
		//if(A != D) compZ /= 1.414214;
		var compX = this.lastVelocity.x - v.x;
		//if(W != S) compX /= 1.414214;

		// apply acceleration
		if(W && !S) {
			if(v.z > -speed) {
				v.z -= acceleration;
				if(v.z < -speed) v.z = -speed;
				else v.z += compZ;
			}
		}
		if(S && !W) {
			if(v.z < speed) {
				v.z += acceleration;
				if(v.z > speed) v.z = speed;
				else v.z += compZ;
			}
		}
		if(A && !D) {
			if(v.x > -speed) {
				v.x -= acceleration;
				if(v.x < -speed) v.x = -speed;
				else v.x += compX;
			}
		}
		if(D && !A) {
			if(v.x < speed) {
				v.x += acceleration;
				if(v.x > speed) v.x = speed;
				else v.x += compX;
			}
		}

		this.lastVelocity.copy(v);

		if(W != S) v.z += compZ;
		if(A != D) v.x += compX;

		// rotate back to world space
		v.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.camera.rotation.y);

		// jump
		if (keystatus[32]) { // Space
			keystatus[32] = false;
			if (this.onGround) v.y = 1.414214 * this.jumpVelocity;
		}

		this.body.setLinearVelocity(v);

		// update the ground raycaster visualization
		if(debug) {
			var geo = new THREE.Geometry();
			geo.vertices.push(new THREE.Vector3(0, -this.groundcaster.near, 0).add(this.foot.position));
			geo.vertices.push(new THREE.Vector3(0, -this.groundcaster.far, 0).add(this.foot.position));
			this.groundcasterLine.geometry = geo;
			this.groundcasterPoint.position.copy(new THREE.Vector3(0, -this.groundcaster.far, 0).add(this.foot.position));
		}
	},

	/**
	 * Rotates the player's perspective.
	 * @param x the mouse x movement
	 * @param y the mouse y movement
	 */
	rotate: function(x, y) {
		this.camera.rotation.y -= x * this.mouseSensitivity;
		this.camera.rotation.x -= y * this.mouseSensitivity;
		if(this.camera.rotation.y > this.TWO_PI) this.camera.rotation.y -= this.TWO_PI;
		if(this.camera.rotation.y < 0) this.camera.rotation.y += this.TWO_PI;
		this.camera.rotation.x = Math.max(-this.HALF_PI, Math.min(this.HALF_PI, this.camera.rotation.x));
	},

	/**
	 * Prepares the camera for rendering.
	 * Must be called each time this camera is being used to render a scene.
	 */
	prepCamera: function() {
		// move the camera to follow the body
		this.camera.position.set(
			this.body.position.x,
			this.body.position.y + 0.25 * this.height,
			this.body.position.z
		);
		// if in debug mode, shift to 3rd person
		// TODO: maybe add scroll wheel to change camera distance from body
		if(this.debug) this.camera.position.add(this.camera.getWorldDirection().multiplyScalar(-5));
	},

	/**
	 * Sets the player's position and rotation.
	 * @param pos the desired THREE.Vector3 position
	 * @param rot the desired THREE.Vector3 position
	 */
	set: function(pos, rot) {
		var footoffs = this.foot.position.sub(this.body.position);
		this.body.position.copy(pos);
		this.foot.position.copy(footoffs.add(pos));
		this.body.__dirtyPosition = true;
		this.foot.__dirtyPosition = true;
		if(!(typeof rot == "undefined"))
			this.camera.rotation.copy(rot);
	}

};