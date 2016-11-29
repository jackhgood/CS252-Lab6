
const ORIENTMASK = 15;
const BLOCKMASK = 15 << 4;
const SURFACEMASK = 15 << 8;

var BLOCK_ENUM =
{
	AIR: 0 << 4,
	CUBE: 1 << 4,
	HALF_SLOPE: 2 << 4,
	CORNER_SLOPE: 3 << 4,
	INVERSE_CORNER: 4 << 4,

	NO_SURFACE: 0 << 8,
	PORTAL_SURFACE: 1 << 8,
	BLACK_SURFACE: 2 << 8,
}

//This is the node structure for the octree.
//Our world is 2048x2048x2048 "blocks" in size.
//This is a nice number since we can just divide
//the world in halves until we reach a size of 1.


var Node = function(centerx, centery, centerz, radius, parent) {
	this.centerX = (typeof centerx == "undefined") ? 0 : centerx;
	this.centerY = (typeof centery == "undefined") ? 0 : centery;
	this.centerZ = (typeof centerz == "undefined") ? 0 : centerz;
	this.radius = (typeof radius == "undefined") ? 1024 : radius;
	this.parent = (typeof parent == "undefined") ? null : parent;
	this.octants = [];
	this.minSize = 1;
	this.block = BLOCK_ENUM.AIR | BLOCK_ENUM.NO_SURFACE | 0;
};

Node.prototype =
{
	constructor: Node,

	insertBlock: function(x, y, z, size, surfaceType, blockType, orientation)
	{

	},

	insertBlocks: function(x1, y1, z1, x2, y2, z2, surfaceType, blockType, orientation)
	{

	},

	getBlock: function(x, y, z)
	{
		return
		{
			var surfaceType: (this.block & SURFACEMASK) >> 8,
			var blockType: (this.block & BLOCKMASK) >> 4,
			var orientation: (this.block & ORIENTMASK)
		};
	}

	getOctant: function(x, y, z)
	{

		if(x >= this.centerX)
		{
			if(y >= this.centerY)
			{
				if(z >= this.centerZ)
				{
					return 0;
				}
				else
				{
					return 1;
				}
			}
			else
			{
				if(z >= this.centerZ)
				{
					return 2;
				}
				else
				{
					return 3;
				}
			}
		}
		else
		{
			if(y >= this.centerY)
			{
				if(z >= this.centerZ)
				{
					return 4;
				}
				else
				{
					return 5;
				}
			}
			else
			{
				if(z >= this.centerZ)
				{
					return 6;
				}
				else
				{
					return 7;
				}
			}
		}
	}
};

/**
 * Constructor for Level.
 * Level represents the world that the game is played in.
 * If no data is given, a default starter level is generated.
 * @param data the JSON representing the contents of the level; if undefined, a default base level is created
 * @param timestep the expected time between physics simulations
 * @param debug whether to display the level in debug mode (default false)
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
			playerRotation: new THREE.Euler(0, 0, 0, "YXZ")
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
		// scale it down so our camera's far doesn't have to be so extreme
		sky.mesh.geometry.scale(0.00001,0.00001,0.00001);
		this.skyScene = new THREE.Scene();
		this.skyScene.add(sky.mesh);
		this.skyCamera = this.player.camera.clone();

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
		// TODO: toy with the possibility of yellowish light to simulate sunlight, depending on time of day
		// TODO: Godrays?!?!??! no, probably not :(
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
			new THREE.CubeGeometry(1000, 1, 1000),
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
		box.position.set(-3, 6, 0);
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

		this.portals[0] = new Portal(this.scene, this.player, new THREE.Vector3(2, 0.5, 0), new THREE.Euler(-Math.PI / 2, 0, 0, "YXZ"), 0x0000ff, this.debug);
		this.portals[1] = new Portal(this.scene, this.player, new THREE.Vector3(2, 4.5, 0), new THREE.Euler(Math.PI / 2, -Math.PI / 2, 0, "YXZ"), 0xffff00, this.debug);
		//this.portals[0] = new Portal(this.scene, this.player, new THREE.Vector3(2, 1.5, 0), new THREE.Euler(0, -Math.PI / 4, 0, "YXZ"), 0x0000ff, this.debug);
		//this.portals[1] = new Portal(this.scene, this.player, new THREE.Vector3(0, 1.5, 2), new THREE.Euler(0, 3*Math.PI / 4, 0, "YXZ"), 0xffff00, this.debug);
		this.portals[0].link(this.portals[1]);
		this.portals[1].link(this.portals[0]);

		return this.scene;
	},

	/**
	 * Render the level.
	 * With the current implementation, the scene is rendered 2n + 1 times with two linked portals,
	 * or (p(p - 1)^n - 1)/(p - 2) + 1 times, where p is the number of linked portals, for p > 2.
	 * Additionally, it will break if np >= 256 due to stencil buffer values containing only one byte.
	 * Use with caution for more than two portals.
	 * @param renderer the renderer
	 * @param camera the camera
	 * @param portal the index of the portal the world is being viewed through; use -1 for the player
	 * @param n the number of times to recursively draw portals
	 */
	render: function(renderer, camera, portal, n) {

		// this is very complex code that took many hours to figure out, so I've tried to comment especially thoroughly
		// TODO: in addition to its immersive value, adding a visible player model could block the view of highly repeating recursion,
		// TODO: allowing us to reduce the recursion to maybe 4 or 5 without loss of the infinite path effect

		// use native WebGL since three.js doesn't handle the stencil buffer
		var gl = renderer.context;
		// an offset added to the stencil buffer to indicate which "layer" of recursion this portal belongs to
		var recursionOffs = n * this.portals.length;
		// the id of the linked portal; it will be ignored during rendering
		var linked = -1;
		if(portal < 0) { // we will render to the screen
			// set to draw where the stencil buffer is zero; this should be the whole screen
			gl.stencilFunc(gl.EQUAL, 0, 0xff);
		} else { // we will render to a portal in the scene
			// set to draw only to the space marked for this portal in the stencil buffer
			gl.stencilFunc(gl.EQUAL, portal + 1 + recursionOffs, 0xff);
			// figure out which portal is linked to this one so we can skip it later
			for(var j = 0; j < this.portals.length; j++) {
				if(this.portals[j] == this.portals[portal].other) {
					linked = j;
					break;
				}
			}
		}

		// render the world
		gl.disable(gl.DEPTH_TEST);
		this.skyCamera.rotation.copy(this.player.camera.rotation);
		renderer.render(this.skyScene, this.skyCamera);
		gl.enable(gl.DEPTH_TEST);
		renderer.render(this.scene, camera);

		// end of recursion
		if(n == 0) return;

		// below is an interesting method I devised for setting the stencil value only when a given stencil value already exists in that pixel
		// comparator is the value to be compared against (0 for the first recursion; the body of the current portal for later recursions)
		// target is the desired replacement value
		// the existing value (which must be equal to comparator) is inverted with mask (comarator ^ target), thereby setting it equal to target
		var comparator = portal < 0 ? 0 : portal + 1 + recursionOffs;
		// invert only if the pixel passes a stencil test and depth test
		gl.stencilOp(gl.KEEP, gl.KEEP, gl.INVERT);
		gl.stencilFunc(gl.EQUAL, comparator, 0xff);
		for(var i = 0; i < this.portals.length; i++) {
			if(i == linked || !this.portals[i].other) continue;
			// TODO: also skip this for unlinked portals
			// set it to the stencil value for the body of the portal in the next recursion
			var target = i + 1 + recursionOffs - this.portals.length;
			// set the stencil mask; only bits which are 1 in the mask may be modified in the stencil buffer
			gl.stencilMask(comparator ^ target);
			renderer.render(this.portals[i].sceneInner, camera);
		}
		// return to normal stencil mask
		gl.stencilMask(0xff);

		// do not modify the stencil buffer
		gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
		// render only to pixels in the body of the current portal
		gl.stencilFunc(gl.EQUAL, comparator, 0xff);
		for(i = 0; i < this.portals.length; i++) {
			if(i == linked) continue;
			// draw the colored part of the portal
			renderer.render(this.portals[i].sceneOuter, camera);
		}

		// reset depth so that all items viewed through a portal get drawn
		gl.clear(gl.DEPTH_BUFFER_BIT);
		for(i = 0; i < this.portals.length; i++) {
			if(i == linked || !this.portals[i].other) continue;
			// TODO: it may be wise to add some level of optimization here, such as stopping if a portal is not on-screen. This could yield MASSIVE performance boosts.
			// recursive call; apply the ith portal's transformation to the camera and go again
			var cam = this.portals[i].getCamera(camera);
			if(cam != null) this.render(renderer, cam, i, n - 1);
		}

	}

};