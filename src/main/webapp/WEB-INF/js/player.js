/**
 * Constructor for Player.
 * Adds the camera and player physics objects to the scene.
 * @param scene the Physijs.scene the player will belong to
 * @param timestep the expected time between physics simulations
 * @param settings the gameplay settings
 * @constructor
 */
var Player = function(scene, timestep, settings) {

	// general player settings
	this.speed = 5;
	this.acceleration = 10;
	this.airAcceleration = 1;
	this.jumpVelocity = 12;
	this.mouseSensitivity = 0.004;
	this.height = 1.6;
	this.width = 0.5;
	this.mass = 5; // TODO: determine mass units
	this.friction = 2.2;
	this.mode = 0; // 0 = player, 1 = edit
	this.diam = 5;

	this.scene = scene;
	this.timestep = timestep;
	this.settings = settings;
	// TODO: we may have to scale the world before rendering or something so near and far aren't such a huge gap
	// TODO: perhaps make the sky part of a separate scene, render it first with high far, then adjust it down?
	// TODO: or just scale down the scene with the sky in it?
	this.camera = new THREE.PerspectiveCamera(
		70, // FOV
		window.innerWidth / window.innerHeight, // aspect ratio
		0.01, // near (very small so that portals seem realistic) TODO: will this small value cause issues down the road?
		1000 // far (the skybox is at 450,000, currently scaled by 0.005)
	);
	// causes Y rotation to be applied before X and Z
	// camera controls would be highly unweildy without this
	this.camera.rotation.order = "YXZ";
	scene.add(this.camera);

	// build the player's physical body
	// the main section is low-friction to avoid clinging to walls
	var bodyMaterial = Physijs.createMaterial(
		new THREE.MeshBasicMaterial({ color: 0x66ff66, wireframe: true }),
		0.1, // low friction
		0    // no restitution
	);
	this.body = new Physijs.CylinderMesh(
		new THREE.CylinderGeometry(0.5 * this.width, 0.5 * this.width, 0.75 * this.height, 12),
		bodyMaterial,
		0.5 * this.mass
	);
	this.body.visible = false;
	scene.add(this.body);
	// lock all rotation, producing a rigid player
	// must be called after adding to scene, not before
	this.body.setAngularFactor(new THREE.Vector3(0, 0, 0));

	// build the player's "foot", a smaller piece with high friction that prevents sliding on the ground
	var footMaterial = Physijs.createMaterial(
		new THREE.MeshBasicMaterial({ color: 0xffff66, wireframe: true }),
		this.friction, // high friction
		0 // no restitution
	);
	this.foot = new Physijs.ConeMesh(
		new THREE.ConeGeometry(0.45 * this.width, 0.2 * this.height, 12),
		footMaterial,
		0.5 * this.mass
	);
	this.foot.visible = false;
	this.foot.rotateX(Math.PI);

	this.foot.position.set(this.body.position.x, this.body.position.y - 0.525 * this.height, this.body.position.z);
	this.foot.addEventListener(
		"collision",
		function(other_object, relative_velocity, relative_rotation, contact_normal) {
			// TODO: maybe put an impact sound or something for hitting the ground
		}
	);
	scene.add(this.foot);
	this.foot._physijs.collision_flags = 4;
	// if you are reading this and want to have some fun, comment out the next line and set debug to true in game.jsp
	this.foot.setAngularFactor(new THREE.Vector3(0, 0, 0));

	// bind the body parts together
	var constraint = new Physijs.DOFConstraint(this.foot, this.body, this.foot.position);
	scene.addConstraint(constraint);


	var selectionbox = new THREE.BoxGeometry(1.05,1.05,1.05);
	var selectionedge = new THREE.EdgesGeometry(selectionbox);
	var selectionmaterial = new THREE.LineBasicMaterial( { color: 0x32cd32, linewidth: 2 } );
	this.selection = new THREE.LineSegments( selectionedge, selectionmaterial );
	this.selection.position.set(10, 10, 10);
	scene.add(this.selection);


	// initialize a special short-range raycaster that determines whether the player is on the ground
	this.onGround = false;
	this.groundcaster = new THREE.Raycaster();
	this.groundcaster.far = 0.2 * this.height;
	if(settings.debug) {
		this.groundcasterLine = new THREE.Line(new THREE.Geometry(), new THREE.MeshBasicMaterial({ color: 0x6666ff }));
		scene.add(this.groundcasterLine);
		this.groundcasterLine.visible = false;
		this.groundcasterPoint = new THREE.Mesh(new THREE.SphereGeometry(0.05), new THREE.MeshBasicMaterial({ color: 0xffff66 }));
		scene.add(this.groundcasterPoint);
		this.groundcasterPoint.visible = false;
	}

	// just for convenience
	this.HALF_PI = Math.PI / 2;
	this.TWO_PI = 2 * Math.PI;

	// used to compensate for friction later
	this.lastVelocity = new THREE.Vector3(0, 0, 0);

	// can be toggled
	this.thirdPerson = false;
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
				|| (this.settings.debug && (intersects[i].object == this.groundcasterLine || intersects[i].object == this.groundcasterPoint)))) {
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

		// compensate for portals messing up z-rotation
		// TODO: this could use some improvement
		var adjust = 0.04;
		if(this.camera.rotation.z > 0) {
			this.camera.rotation.z -= adjust;
			if(this.camera.rotation.z < 0) this.camera.rotation.z = 0
		} else if(this.camera.rotation.z < 0) {
			this.camera.rotation.z += adjust;
			if(this.camera.rotation.z > 0) this.camera.rotation.z = 0
		}

		// accelaration is multiplied by sqrt(2) to account for the fact that the body is only half the player's mass,
		// but not if moving diagonally (to prevent increased player speed on the diagonal)
		if ((W == S) != (A == D)) acceleration *= 1.414214;
		if((W != S) && (A != D)) speed /= 1.414214;


		if(this.mode == 1) { // Edit mode
			if (W && !S) {
				this.camera.translateZ(-speed*timestep);
			}
			if (S && !W) {
				this.camera.translateZ(speed*timestep);
			}
			if (A && !D) {
				this.camera.translateX(-speed*timestep);
			}
			if (D && !A) {
				this.camera.translateX(speed*timestep);
			}
		}
		else { // Player Mode
			// get the current velocity, rotated to local space
			var v = this.body.getLinearVelocity().applyAxisAngle(new THREE.Vector3(0, 1, 0), -this.camera.rotation.y);

			// used to compensate for friction direction(s) the player is moving
			var compZ = this.lastVelocity.z - v.z;
			//if(A != D) compZ /= 1.414214;
			var compX = this.lastVelocity.x - v.x;
			//if(W != S) compX /= 1.414214;

			// apply acceleration
			if (W && !S) {
				if (v.z > -speed) {
					v.z -= acceleration;
					if (v.z < -speed) v.z = -speed;
					else v.z += compZ;
				}
			}
			if (S && !W) {
				if (v.z < speed) {
					v.z += acceleration;
					if (v.z > speed) v.z = speed;
					else v.z += compZ;
				}
			}
			if (A && !D) {
				if (v.x > -speed) {
					v.x -= acceleration;
					if (v.x < -speed) v.x = -speed;
					else v.x += compX;
				}
			}
			if (D && !A) {
				if (v.x < speed) {
					v.x += acceleration;
					if (v.x > speed) v.x = speed;
					else v.x += compX;
				}
			}

			this.lastVelocity.copy(v);

			if (W != S) v.z += compZ;
			if (A != D) v.x += compX;

			// rotate back to world space
			v.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.camera.rotation.y);

			// jump
			if (keystatus[32]) { // Space
				keystatus[32] = false;
				if (this.onGround) v.y = 1.414214 * this.jumpVelocity;
			}

			this.body.setLinearVelocity(v);
		}


		// switchmode
		if (keystatus [77]) {
			keystatus[77] = false;
			this.switchModes();
		}


		// update the ground raycaster visualization
		if(this.settings.debug) {
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
		if(this.mode == 0) {
			// move the camera to follow the body
			this.camera.position.set(
				this.body.position.x,
				this.body.position.y + 0.25 * this.height,
				this.body.position.z
			);
			// if in debug mode, shift to 3rd person
			// TODO: maybe add scroll wheel to change camera distance from body
			if (this.thirdPerson) this.camera.position.add(this.camera.getWorldDirection().multiplyScalar(-5));
		}
	},

	/**
	 * Sets the player's position and rotation.
	 * @param pos the desired THREE.Vector3 position
	 * @param rot the desired THREE.Vector3 rotation
	 */
	set: function(pos, rot) {
		var footoffs = this.foot.position.sub(this.body.position);
		this.body.position.copy(pos);
		this.foot.position.copy(footoffs.add(pos));
		this.body.__dirtyPosition = true;
		this.foot.__dirtyPosition = true;
		if(!(typeof rot == "undefined"))
			this.camera.rotation.copy(rot);
	},

	setFromCamera: function() {
		if(!this.mode) {
			this.set(new THREE.Vector3(0, -0.25 * this.height, 0).add(this.camera.position));
		}
	},

	/**
	 * Toggles whether the player is in third person.
	 */
	toggleThirdPerson: function() {
		if(this.thirdPerson) {
			this.thirdPerson = false;
			this.body.visible = false;
			this.foot.visible = false;
			this.groundcasterLine.visible = false;
			this.groundcasterPoint.visible = false;
		} else {
			this.thirdPerson = true;
			this.body.visible = true;
			this.foot.visible = true;
			this.groundcasterLine.visible = true;
			this.groundcasterPoint.visible = true;
		}
	},

	switchModes: function() {
		if(this.mode) { // In edit mode
			this.mode = 0;
		}
		else { //In player mode
			this.mode = 1;
		}

	}

};
