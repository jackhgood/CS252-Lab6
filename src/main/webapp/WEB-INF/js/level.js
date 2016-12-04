
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
};

//This is the node structure for the octree.
//Our world is 2048x2048x2048 "blocks" in size.
//This is a nice number since we can just divide
//the world in halves until we reach a size of 1.


var Node = function(centerx, centery, centerz, radius, parent) {
	this.centerX = (typeof centerx == "undefined") ? 0 : centerx;
	this.centerY = (typeof centery == "undefined") ? 0 : centery;
	this.centerZ = (typeof centerz == "undefined") ? 0 : centerz;
	this.radius = (typeof radius == "undefined") ? 1024 : radius;
	this.parent = (parent == null || typeof parent == "undefined") ? null : parent;
	this.octants = [];
	this.block = BLOCK_ENUM.AIR | BLOCK_ENUM.NO_SURFACE | 0;
	this.physiBlock = null;
};

Node.prototype =
{
	constructor: Node,

	//For now, always set size to 0. The size thing is unimportant for now.
	insertBlock: function(x, y, z, size, surfaceType, blockType, orientation, phyBlock)
	{
		var octant = this.getOctant(x,y,z);
		if(this.radius == 0)
		{
			this.block = surfaceType | blockType | orientation;
			this.physiBlock = phyBlock;
			return;
		}
		if(typeof this.octants[octant] == 'undefined')
		{
			var halfRadius = this.radius / 2;
			var newX, newY, newZ;
			switch(octant)
			{
				case 0:
					newX = this.centerX + halfRadius;
					newY = this.centerY + halfRadius;
					newZ = this.centerZ + halfRadius;
					break;
				case 1:
					newX = this.centerX + halfRadius;
					newY = this.centerY + halfRadius;
					newZ = this.centerZ - halfRadius;
					break;
				case 2:
					newX = this.centerX + halfRadius;
					newY = this.centerY - halfRadius;
					newZ = this.centerZ + halfRadius;
					break;
				case 3:
					newX = this.centerX + halfRadius;
					newY = this.centerY - halfRadius;
					newZ = this.centerZ - halfRadius;
					break;
				case 4:
					newX = this.centerX - halfRadius;
					newY = this.centerY + halfRadius;
					newZ = this.centerZ + halfRadius;
					break;
				case 5:
					newX = this.centerX - halfRadius;
					newY = this.centerY + halfRadius;
					newZ = this.centerZ - halfRadius;
					break;
				case 6:
					newX = this.centerX - halfRadius;
					newY = this.centerY - halfRadius;
					newZ = this.centerZ + halfRadius;
					break;
				case 7:
					newX = this.centerX - halfRadius;
					newY = this.centerY - halfRadius;
					newZ = this.centerZ - halfRadius;
					break;
			}
			this.octants[octant] = new Node(newX, newY, newZ, halfRadius, this);
		}

		this.octants[octant].insertBlock(x, y, z, size, surfaceType, blockType, orientation, phyBlock);
	},

	insertBlocks: function(x1, y1, z1, x2, y2, z2, surfaceType, blockType, orientation, phyBlock)
	{
		for(var x = Math.min(x1, x2); x <= Math.max(x1, x2); x++)
		{
			for(var y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
			{
				for(var z = Math.min(z1, z2); z <= Math.max(z1, z2); z++)
				{
					this.insertBlock(x, y, z, surfaceType, blockType, orientation,  phyBlock);
				}
			}
		}
	},

	getBlock: function(x, y, z)
	{
		var octant = this.getOctant(x,y,z);
		if(this.octants[octant] == 'undefined' || this.radius == 0)
		{
			return {
				surfaceType: (this.block & SURFACEMASK),
				blockType: (this.block & BLOCKMASK),
				orientation: (this.block & ORIENTMASK)
			};
		}

		return this.octants[octant].getBlock(x,y,z);
	},

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
 * @param settings the gameplay settings
 * @constructor
 */
var Level = function(data, timestep, settings) {
	this.data = (typeof data == 'undefined') ? this.getDefaultLevelData() : data;
	this.timestep = (typeof timestep == "undefined") ? 1 / 60: timestep;
	this.settings = settings;
	this.portals = [];
	// used for detecting passing through a portal
	this.playerPortalValues = [];
	// used for checking if portals are valid
	this.raycaster = new THREE.Raycaster();
	this.raycaster.near = -1;
	this.raycaster.far = 1;
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
			playerRotation: new THREE.Euler(0, 0, 0, "YXZ"),
			levelTree: new Node(0,0,0,1024,null)
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
		this.player = new Player(this, this.timestep, this.settings);
		this.player.set(this.data.playerPosition, this.data.playerRotation);

		// sky
		var sky = new THREE.Sky();
		// scale it down so our camera's far doesn't have to be so extreme
		sky.mesh.geometry.scale(0.00001,0.00001,0.00001);
		this.skyScene = new THREE.Scene();
		this.skyScene.add(sky.mesh);
		this.skyCamera = this.player.camera.clone();

		// now that the camera is cloned, move it to the boy
		this.player.prepCamera();

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
		this.light = new THREE.DirectionalLight(0xffffff);
		this.light.position.copy(sky.uniforms.sunPosition.value).multiplyScalar(50);
		this.light.target.position.copy(this.scene.position);
		this.light.intensity = 1;
		// TODO: these settings will depend on level size
		// TODO: maybe make shadow cam follow player?
		this.light.shadow.camera.left = -60;
		this.light.shadow.camera.top = -60;
		this.light.shadow.camera.right = 60;
		this.light.shadow.camera.bottom = 60;
		this.light.shadow.camera.near = 20;
		this.light.shadow.camera.far = 200;
		this.shadowHelper = new THREE.CameraHelper(this.light.shadow.camera);
		this.scene.add(this.shadowHelper);

		this.scene.add(this.light);

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

		this.createBlocks(-30, 1, -30, 30, 1, 30, BLOCK_ENUM.PORTAL_SURFACE, BLOCK_ENUM.CUBE, 0);
		this.createBlocks(-5, 2, -5, 5, 2, 2, BLOCK_ENUM.BLACK_SURFACE, BLOCK_ENUM.CUBE, 0);
		// var item_material = Physijs.createMaterial(
		// 	new THREE.MeshLambertMaterial({ color: 0x8888ff }),
		// 	.8, .4
		// );
		// var box = new Physijs.BoxMesh(
		// 	new THREE.CubeGeometry(1, 1, 1),
		// 	item_material, 3
		// );
		// box.position.set(-3, 6, 0);
		// box.castShadow = box.receiveShadow = true;
		// this.scene.add(box);
        //
		// //region Code I don't need
		// // to test slopes
		// var cone = new Physijs.ConeMesh(
		// 	new THREE.ConeGeometry(10, 4, 40),
		// 	item_material,
		// 	0
		// );
		// cone.position.set(20, 2, 20);
		// cone.castShadow = cone.receiveShadow = true;
		// this.scene.add(cone);
		// var cone2 = new Physijs.ConeMesh(
		// 	new THREE.ConeGeometry(10, 10, 40),
		// 	item_material,
		// 	0
		// );
		// cone2.position.set(20, 5, -20);
		// cone2.castShadow = cone2.receiveShadow = true;
		// this.scene.add(cone2);
		// var cone3 = new Physijs.ConeMesh(
		// 	new THREE.ConeGeometry(10, 30, 40),
		// 	item_material,
		// 	0
		// );
		// cone3.position.set(-20, 15, -20);
		// cone3.castShadow = cone3.receiveShadow = true;
		// this.scene.add(cone3);

		this.portals[0] = new Portal(this.scene, this.player, new THREE.Vector3(2, 0.5, 0), new THREE.Euler(-Math.PI / 2, 0, 0, "YXZ"), 0x0000ff, this.settings);
		this.portals[1] = new Portal(this.scene, this.player, new THREE.Vector3(2, 4.5, 0), new THREE.Euler(Math.PI / 2, -Math.PI / 2, 0, "YXZ"), 0xffff00, this.settings);
		this.portals[0] = new Portal(this.scene, this.player, new THREE.Vector3(2, 1.5, 0), new THREE.Euler(0, Math.PI / 2, 0, "YXZ"), 0x0000ff, this.settings);
		this.portals[1] = new Portal(this.scene, this.player, new THREE.Vector3(0, 10*1.5, 2), new THREE.Euler(Math.PI / 2, 0, 0, "YXZ"), 0xffff00, this.settings);
		this.portals[0].link(this.portals[1]);
		this.portals[1].link(this.portals[0]);

		// some test surfaces
		// var shape = new THREE.Shape();
		// shape.lineTo(-2,0.5);
		// shape.lineTo(-2,2.5);
		// shape.lineTo(0,2.5);
		// shape.lineTo(0,6.5);
		// shape.lineTo(4,6.5);
		// shape.lineTo(4,0.5);
		// shape.lineTo(0,0);
        //
		// var mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: 0xdddddd }));
		// mesh.castShadow = mesh.receiveShadow = true;
		// this.scene.add(mesh.clone());
		// mesh.translateZ(10);
		// mesh.rotation.y = Math.PI;
		// this.scene.add(mesh.clone());
		// mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: 0xdddddd }));
		// mesh.translateY(8);
		// mesh.rotation.x = -Math.PI / 4;
		// this.scene.add(mesh.clone());

		this.updateSettings();

		return this.scene;
		//endregion
	},

	createBlock: function(x,y,z, surfaceType, blockType, orientation)
	{
		var surfaceMaterial;
		switch(surfaceType)
		{
			case BLOCK_ENUM.PORTAL_SURFACE:
				surfaceMaterial = Physijs.createMaterial(
					new THREE.MeshBasicMaterial( { color: 0xdddddd } ), .8, .4);
				break;
			case BLOCK_ENUM.BLACK_SURFACE:
				surfaceMaterial = Physijs.createMaterial(
					new THREE.MeshBasicMaterial( { color: 0x111111 } ), .8, .4);
				break;
			case BLOCK_ENUM.NO_SURFACE:
				//This goes with the air
				break;
		}


		var mesh;
		switch(blockType)
		{
			case BLOCK_ENUM.AIR:
				//this is the air block
				//this will never get used but we want to catch this thing.
				break;
			case BLOCK_ENUM.CUBE:
				mesh = new Physijs.BoxMesh(new THREE.CubeGeometry(1,1,1), surfaceMaterial, 0);
				break;
			case BLOCK_ENUM.HALF_SLOPE:

				break;
			case BLOCK_ENUM.CORNER_SLOPE:

				break;
			case BLOCK_ENUM.INVERSE_CORNER:

				break;
		}

		mesh.position.set(x + .5, y + .5, z + .5);
		mesh.castShadow = mesh.receiveShadow = true;
		mesh.visible = false;
		this.scene.add(mesh);
		this.data.levelTree.insertBlock(x, y, z, surfaceType, blockType, orientation, mesh);
	},

	createBlocks: function(x1, y1, z1, x2, y2, z2, surfaceType, blockType, orientation)
	{
		var surfaceMaterial;
		switch(surfaceType)
		{
			case BLOCK_ENUM.PORTAL_SURFACE:
				surfaceMaterial = Physijs.createMaterial(
					new THREE.MeshBasicMaterial( { color: 0xdddddd } ), .8, .4);
				break;
			case BLOCK_ENUM.BLACK_SURFACE:
				surfaceMaterial = Physijs.createMaterial(
					new THREE.MeshBasicMaterial( { color: 0x111111 } ), .8, .4);
				break;
			case BLOCK_ENUM.NO_SURFACE:
				//This goes with the air
				break;
		}

		var mesh;
		switch(blockType)
		{
			case BLOCK_ENUM.AIR:
				//this is the air block
				//this will never get used but we want to catch this thing.
				break;
			case BLOCK_ENUM.CUBE:
				mesh = new Physijs.BoxMesh(new THREE.CubeGeometry(x1 - x2 + 1,y1 - y2 + 1,z1 - z2 + 1), surfaceMaterial, 0);
				mesh.position.set((x1 + x2 + 1) / 2, (y1 + y2 + 1) / 2, (z1 + z2 + 1) / 2)
				break;
			case BLOCK_ENUM.HALF_SLOPE:

				break;
			case BLOCK_ENUM.CORNER_SLOPE:

				break;
			case BLOCK_ENUM.INVERSE_CORNER:

				break;
		}

		mesh.castShadow = mesh.receiveShadow = true;
		this.scene.add(mesh);

		for(var x = Math.min(x1, x2); x <= Math.max(x1, x2); x++)
		{
			for(var y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
			{
				for(var z = Math.min(z1, z2); z <= Math.max(z1, z2); z++)
				{
					this.data.levelTree.insertBlock(x, y, z, surfaceType, blockType, orientation, mesh);
				}
			}
		}
	},

	update: function(keystatus, mousestatus) {
		this.player.update(keystatus, mousestatus);
		this.player.prepCamera();
		for(var i = 0; i < this.portals.length; i++) {
			// the dot product of the portal's normal with the vector to the player's position
			var playerToPortal = this.player.camera.position.clone().sub(this.portals[i].position);
			var product = playerToPortal.dot(this.portals[i].forward);
			// when it changes sign, you have passed the portal's plane
			if(product < 0 && this.playerPortalValues[i] > 0) {
				// check to make sure we are close enough to the portal
				var x = playerToPortal.dot(this.portals[i].left) / this.portals[i].radiusX;
				var y = playerToPortal.dot(this.portals[i].up) / this.portals[i].radiusY;
				if(x*x + y*y < 1) {
					this.portals[i].transform(this.player.camera);
					this.player.setFromCamera();
					this.player.body.setLinearVelocity(this.portals[i].transform(this.player.body.getLinearVelocity()));
					this.player.foot.setLinearVelocity(this.portals[i].transform(this.player.foot.getLinearVelocity()));
					for (var j = 0; j < this.portals.length; j++) this.playerPortalValues[j] = 0;
					break;
				}
			}
			this.playerPortalValues[i] = product;
		}
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
		// use native WebGL
		var gl = renderer.context;
		if(this.settings.portalQuality == 0) {
			// render sky
			gl.disable(gl.DEPTH_TEST);
			this.skyCamera.rotation.copy(camera.rotation);
			renderer.render(this.skyScene, this.skyCamera);
			gl.enable(gl.DEPTH_TEST);

			// render world
			renderer.shadowMap.needsUpdate = true;
			renderer.render(this.scene, camera);

			// render portals
			for (i = 0; i < this.portals.length; i++) {
				// draw the colored part of the portal
				renderer.render(this.portals[i].sceneOuter, camera);
			}
		} else if(this.settings.portalQuality == 1) {
			// TODO: implement canvas texture portal rendering
		} else if(this.settings.portalQuality == 2) {
			// an offset added to the stencil buffer to indicate which "layer" of recursion this portal belongs to
			var recursionOffs = n * this.portals.length;
			// the id of the linked portal; it will be ignored during rendering
			var linked = -1;
			if (portal < 0) { // we will render to the screen
				// set to draw where the stencil buffer is zero; this should be the whole screen
				gl.stencilFunc(gl.EQUAL, 0, 0xff);
			} else { // we will render to a portal in the scene
				// set to draw only to the space marked for this portal in the stencil buffer
				gl.stencilFunc(gl.EQUAL, portal + 1 + recursionOffs, 0xff);
				// figure out which portal is linked to this one so we can skip it later
				for (var j = 0; j < this.portals.length; j++) {
					if (this.portals[j] == this.portals[portal].other) {
						linked = j;
						break;
					}
				}
			}

			// render the world
			gl.disable(gl.DEPTH_TEST);
			this.skyCamera.rotation.copy(camera.rotation);
			renderer.render(this.skyScene, this.skyCamera);
			gl.enable(gl.DEPTH_TEST);
			if (portal < 0) renderer.shadowMap.needsUpdate = true;
			renderer.render(this.scene, camera);

			// end of recursion
			if (n == 0) return;

			// below is an interesting method I devised for setting the stencil value only when a given stencil value already exists in that pixel
			// comparator is the value to be compared against (0 for the first recursion; the body of the current portal for later recursions)
			// target is the desired replacement value
			// the existing value (which must be equal to comparator) is inverted with mask (comarator ^ target), thereby setting it equal to target
			var comparator = portal < 0 ? 0 : portal + 1 + recursionOffs;
			// invert only if the pixel passes a stencil test and depth test
			gl.stencilOp(gl.KEEP, gl.KEEP, gl.INVERT);
			gl.stencilFunc(gl.EQUAL, comparator, 0xff);
			for (var i = 0; i < this.portals.length; i++) {
				if (i == linked || !this.portals[i].other) continue;
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
			gl.stencilFunc(gl.EQUAL, comparator, 0xff);
			for (i = 0; i < this.portals.length; i++) {
				if (i == linked) continue;
				// draw the colored part of the portal
				renderer.render(this.portals[i].sceneOuter, camera);
			}

			// reset depth so that all items viewed through a portal get drawn
			renderer.clearDepth();
			for (i = 0; i < this.portals.length; i++) {
				if (i == linked || !this.portals[i].other) continue;
				// TODO: it may be wise to add some level of optimization here, such as stopping if a portal is not on-screen. This could yield MASSIVE performance boosts.
				// recursive call; apply the ith portal's transformation to the camera and go again
				var cam = this.portals[i].getCamera(camera);
				if (cam != null) this.render(renderer, cam, i, n - 1);
			}
		}

	},

	/**
	 * Handles click events when controlling the player.
	 * @param button the mouse button (usually 1 for left or 2 for right)
	 */
	click: function(button) {
		if(!this.mode) {
			if(button == 1) button = 0; // LMB
			else if(button == 3) button = 1; // RMB
			else return;

			this.player.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.player.camera);
			var intersects = this.player.raycaster.intersectObjects(this.scene.children);
			if(intersects[0]) {
				var rotation = intersects[0].object.rotation.clone();
				rotation.reorder("YXZ");
				rotation.y += Math.PI; // I don't know why, but shape geometries need this
				var portal = new Portal(this.scene, this.player, intersects[0].point, rotation, this.portals[button].color, this.settings);
				// check around the location to make sure there's enough room
				this.raycaster.ray.direction = this.player.raycaster.ray.direction;
				var points = 8; // the number of points to check
				var pass = true;
				var count = [];
				for(var i = 0; i < points; i++) {
					var theta = i / points * 2 * Math.PI;
					this.raycaster.ray.origin = portal.up.clone().multiplyScalar(portal.radiusY * Math.sin(theta))
						.add(portal.left.clone().multiplyScalar(portal.radiusX * Math.cos(theta)))
						.add(intersects[0].point);
					if(this.raycaster.intersectObject(intersects[0].object).length == 0) {
						count.push(i);
						pass = false;
						break;
					}
				}

				if(pass) {
					var other = this.portals[button].other;
					portal.link(other);
					other.link(portal);
					this.portals[button] = portal;
				}

			}
		}
	},

	/**
	 * Perform actions needed to alter graphics settings.
	 */
	updateSettings: function() {
		if(this.settings.shadowQuality == 0) {
			this.light.castShadow = false;
		} else if(this.settings.shadowQuality == 1) {
			this.light.castShadow = true;
			this.light.shadow.bias = -.005;
			this.light.shadow.mapSize.height = this.light.shadow.mapSize.width = 1024;
		} else if(this.settings.shadowQuality == 2) {
			this.light.castShadow = true;
			this.light.shadow.bias = -.003;
			this.light.shadow.mapSize.height = this.light.shadow.mapSize.width = 4096;
		}
		this.shadowHelper.visible = this.settings.debug;
	}

};