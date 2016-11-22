/**
 * Constructor for Player.
 * Adds the camera and player physics objects to the scene.
 * @param scene the Physijs.scene the player will belong to
 * @param debug whether to display the player in debug mode (default false)
 * @constructor
 */
var Player = function(scene, debug) {

	// general player settings
	this.speed = 5;
	this.jumpVelocity = 12;
	this.mouseSensitivity = 0.004;
	this.height = 1.8;
	this.width = 0.5;
	this.mass = 5; // TODO: determine mass units

	this.debug = (typeof debug == "undefined") ? false : debug;
	this.scene = scene;
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
		1, // high friction
		0 // no restitution
	);
	this.foot = new Physijs.ConeMesh(
		new THREE.ConeGeometry(0.45 * this.width, 0.2 * this.height, 12).rotateX(Math.PI),
		footMaterial,
		0.5 * this.mass
	);
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
	this.groundcaster.far = 0.5 * this.height; // TODO: this will need tuned

	// so that we only have to divide pi by 2 once
	this.HALF_PI = Math.PI / 2;
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
			if(intersects[i].object != this.foot && intersects[i].object != this.body) {
				this.onGround = true;
				break;
			}
		}

		// TODO: determine what in-air control behavior should be (and implement it)
		// move the player based on keyboard input
		// x and y velocities in player-local space
		var lx = 0, lz = 0;
		// the player-local z and x axes respectively
		var zdir = new THREE.Vector2(-Math.cos(this.camera.rotation.y), Math.sin(this.camera.rotation.y));
		var xdir = new THREE.Vector2(zdir.y, -zdir.x);
		// speeds are multiplied by sqrt(2) to account for the fact that the body is only half the player's mass
		if(keystatus[87]) // W
			lx -= 1.414 * this.speed;
		if(keystatus[83]) // S
			lx += 1.414 * this.speed;
		if(keystatus[65]) // A
			lz += 1.414 * this.speed;
		if(keystatus[68]) // D
			lz -= 1.414 * this.speed;

		// the goal here is to apply velocity in the direction of the key press,
		// without altering orthogonal velocity, so to have some realistic sense of momentum
		// TODO: clean this up
		var v3d = this.body.getLinearVelocity();
		var v2d = new THREE.Vector2(v3d.x, v3d.z);
		if(lz == 0) zdir.multiplyScalar(zdir.dot(v2d));
		else zdir.multiplyScalar(lz);
		if(lx == 0) xdir.multiplyScalar(xdir.dot(v2d));
		else xdir.multiplyScalar(lx);
		var newv = xdir.add(zdir);

		// jump
		if(keystatus[32]) { // Space
			keystatus[32] = false;
			if(this.onGround) v3d.y = 1.414 * this.jumpVelocity;
		}

		this.body.setLinearVelocity(new THREE.Vector3(newv.x, v3d.y, newv.y));
	},

	/**
	 * Rotates the player's perspective.
	 * @param x the mouse x movement
	 * @param y the mouse y movement
	 */
	rotate: function(x, y) {
		this.camera.rotation.y -= x * this.mouseSensitivity;
		this.camera.rotation.x -= y * this.mouseSensitivity;
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
		this.camera.rotation.copy(rot);
		this.body.__dirtyPosition = true;
		this.foot.__dirtyPosition = true;
	}

};