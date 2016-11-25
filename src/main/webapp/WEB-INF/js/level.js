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
	this.portals = [];
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

		// sky
		var sky = new THREE.Sky();
		this.scene.add(sky.mesh);

		var inclination = 0.4; // -1 to 1
		var azimuth = 0.25;
		sky.uniforms.turbidity.value = 10;
		sky.uniforms.rayleigh.value = 2;
		sky.uniforms.luminance.value = 1;
		sky.uniforms.mieCoefficient.value = 0.005;
		sky.uniforms.mieDirectionalG.value = 0.8;
		var theta = Math.PI * (inclination - 0.5);
		var phi = 2 * Math.PI * (azimuth - 0.5);
		sky.uniforms.sunPosition.value.set(Math.cos(phi), Math.sin(phi) * Math.sin(theta), Math.sin(phi) * Math.cos(theta));

		// TODO: lighting is kind of arbitrary at the moment. Ideally it would be given a saveable setting
		// lighting
		this.scene.add(new THREE.AmbientLight(0x404040));
		// TODO: toy with the possibility of yellowish light to simulate sunlight
		// TODO: Godrays?!?!??!
		var light = new THREE.DirectionalLight(0xffffff);
		light.position.copy(sky.uniforms.sunPosition.value).multiplyScalar(50);
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
		light.shadow.mapSize.height = light.shadow.mapSize.width = 4096;
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
		box.position.set(0, 6, 0);
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

		this.portals[0] = new Portal(this.scene, this.player, new THREE.Vector3(2, 1.5, 0), new THREE.Vector3(0, -Math.PI / 2, 0), 0x0000ff, this.debug);
		this.portals[1] = new Portal(this.scene, this.player, new THREE.Vector3(0, 1.5, 2), new THREE.Vector3(0, Math.PI, 0), 0xffff00, this.debug);
		this.portals[0].link(this.portals[1]);
		this.portals[1].link(this.portals[0]);

		return this.scene;
	},

	/**
	 * Render the level's portals.
	 * @param renderer the renderer
	 */
	renderPortals: function(renderer) {
		// TODO: this will need to be recursive somehow so portals show up in portals
		// hard limit is 255 portals due to stencil buffer values capping at 255, though I don't see this being an issue
		// use WebGL since three.js doesn't handle stencil buffers
		var gl = renderer.context;

		// enable stencil testing
		gl.enable(gl.STENCIL_TEST);

		// replace the stencil value at a given pixel only if it passes a depth test and a stencil test
		gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
		for(var i = 0; i < this.portals.length; i++) {
			// TODO: skip this for unlinked portals
			// when the stencil value is replaced, set it to i + 1
			gl.stencilFunc(gl.ALWAYS, i + 1, 0xff);
			// use the inner section to
			renderer.render(this.portals[i].sceneInner, this.player.camera);
		}

		// do not change the stencil buffer
		gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
		// render only to pixels where the stencil buffer value is 0 (the default)
		gl.stencilFunc(gl.EQUAL, 0, 0xff);
		for(i = 0; i < this.portals.length; i++) {
			// draw the colored part of the portal
			renderer.render(this.portals[i].sceneOuter, this.player.camera);
		}

		// reset depth so that all items viewed through a portal get drawn
		gl.clear(gl.DEPTH_BUFFER_BIT);
		for(i = 0; i < this.portals.length; i++) {
			// TODO: once we add recursion, this may require some big optimization, like maybe skipping for portals that can't possibly be visible to the player based on location
			// TODO: skip this for unlinked portals
			// render only to pixels where the stencil buffer is i + 1
			gl.stencilFunc(gl.EQUAL, i + 1, 0xff);
			// render the scene to the active portal
			renderer.render(this.scene, this.portals[i].getCamera());
		}

		// disable stencil testing
		gl.disable(gl.STENCIL_TEST);

	}

};