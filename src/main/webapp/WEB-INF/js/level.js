/*
 * I threw together a basic outline for this class so that I could get the game.jsp set up correctly.
 * Nothing here is set in stone, so if you see a better way to do anything, by all means go for it!
 * -Jack
 */

/**
 * Constructor for Level.
 * Level represents the world that the game is played in.
 * If no data is given, a default starter level is generated.
 * @param debug whether to display the level in debug mode (default false)
 * @param data optional - the JSON representing the contents of the level
 * @param timestep the expected time between physics simulations
 * @constructor
 */
var Level = function(data, timestep, debug) {
	this.data = (typeof data == "undefined") ? this.getDefaultLevelData() : data;
	this.timestep = (typeof timestep == "undefined") ? 1 / 60: timestep;
	this.debug = (typeof debug == "undefined") ? false : debug;
};

Level.prototype = {

	constructor: Level,

	/**
	 * Generates a simple starter level as a base for editing.
	 * @return object a level data object
	 */
	getDefaultLevelData: function() {
		// TODO: this could either be a simple hard-coded platform or something
		// TODO: or it could actually load a level from the DB designated as the official default base
		return {
			playerPosition: new THREE.Vector3(0, 10, 0),
			playerRotation: new THREE.Euler(-Math.PI / 4, 0, 0, "YXZ")
		};
	},

	/**
	 * Initializes the scene and builds the level into it.
	 * May be called again to reset the level.
	 * @return Physijs.Scene the constructed scene
	 */
	constructScene: function() {
		// set update time interval
		this.scene = new Physijs.Scene({ fixedTimeStep: timestep });
		this.scene.setGravity(new THREE.Vector3(0, -30, 0));

		// player
		this.player = new Player(this.scene, this.timestep, this.debug);
		this.player.set(this.data.playerPosition, this.data.playerRotation);

		// TODO: lighting is kind of arbitrary at the moment. Ideally it would be given a saveable setting
		// lighting
		this.scene.add(new THREE.AmbientLight(0x404040));
		// TODO: toy with the possibility of yellowish light to simulate sunlight
		// TODO: Godrays?!?!??!
		var light = new THREE.DirectionalLight(0xFFFFFF);
		light.position.set(20, 40, -15);
		light.target.position.copy(this.scene.position);
		light.castShadow = true;
		// TODO: these settings need some massive tweaking and will depend on level size
		light.shadow.camera.left = -60;
		light.shadow.camera.top = -60;
		light.shadow.camera.right = 60;
		light.shadow.camera.bottom = 60;
		light.shadow.camera.near = 20;
		light.shadow.camera.far = 200;
		// this especially may need adjusting to make the checkerboard pattern on some shadows go away
		light.shadow.bias = -.003;
		// this is basically the shadow "resolution" -- it's very important
		light.shadow.mapSize.height = light.shadow.mapSize.width = 2048;
		light.intensity = 1;
		this.scene.add(light);
		if(this.debug) this.scene.add(new THREE.CameraHelper(light.shadow.camera));

		// TODO: these are placeholder testing objects that should be removed when the real world is implemented
		var ground_material = Physijs.createMaterial(
			new THREE.MeshLambertMaterial({ color: 0x888888 }),
			.8, // friction
			.4  // restitution
		);
		var ground = new Physijs.BoxMesh(
			new THREE.CubeGeometry(1000, 0.5, 1000),
			ground_material,
			0 // mass
		);
		ground.receiveShadow = true;
		ground.castShadow = false;
		this.scene.add(ground);

		var item_material = Physijs.createMaterial(
			new THREE.MeshLambertMaterial({ color: 0x8888ff }),
			.8, .4
		);
		var box = new Physijs.BoxMesh(
			new THREE.CubeGeometry(1, 1, 1),
			item_material, 3
		);
		box.position.set(-20, 12, 20);
		box.castShadow = box.receiveShadow = true;
		this.scene.add(box);

		// to test slopes
		var cone = new Physijs.ConeMesh(
			new THREE.ConeGeometry(10, 4, 40),
			item_material,
			0
		);
		cone.position.set(20, 2, 20);
		cone.castShadow = cone.receiveShadow = true;
		this.scene.add(cone);
		var cone2 = new Physijs.ConeMesh(
			new THREE.ConeGeometry(10, 10, 40),
			item_material,
			0
		);
		cone2.position.set(20, 5, -20);
		cone2.castShadow = cone2.receiveShadow = true;
		this.scene.add(cone2);
		var cone3 = new Physijs.ConeMesh(
			new THREE.ConeGeometry(10, 30, 40),
			item_material,
			0
		);
		cone3.position.set(-20, 15, -20);
		cone3.castShadow = cone3.receiveShadow = true;
		this.scene.add(cone3);

		return this.scene;
	}

};