/**
 * Constructor for portals.
 * @param scene the scene the portal belongs to
 * @param player the player who owns the portal
 * @param position vector of the location of the center of the portal
 * @param rotation the YXZ-ordered rotation of the portal
 * @param color the color of the portal
 * @param debug whether to render in debug mode
 * @constructor
 */
var Portal = function(scene, player, position, rotation, color, debug) {

	// general portal settings
	this.radiusX = 0.5;
	this.radiusY = 1;

	this.scene = scene;
	this.position = position;
	this.rotation = rotation;
	this.color = color;
	this.debug = debug;
	this.other = null;

	// forward is normalized; the other two are intentionally not (see their usage below)
	this.forward = new THREE.Vector3(0, 0, 1);
	this.up = new THREE.Vector3(0, 1, 0).multiplyScalar(this.radiusY);
	this.left = new THREE.Vector3(1, 0, 0).multiplyScalar(this.radiusX);
	var euler = new THREE.Euler(rotation.x, rotation.y, rotation.z, "YXZ");
	this.forward.applyEuler(euler);
	this.up.applyEuler(euler);
	this.left.applyEuler(euler);

	var outerGeometry = new THREE.CircleGeometry(this.radiusX, 100);
	// manually scale into an ellipse, since the ellipse curves are so hard to use
	var scale = this.radiusY / this.radiusX;
	for(var i = 0; i < outerGeometry.vertices.length; i++)
		outerGeometry.vertices[i].y *= scale;

	outerGeometry.rotateY(rotation.y);
	outerGeometry.rotateX(rotation.x);
	outerGeometry.rotateZ(rotation.z);
	var innerGeometry = outerGeometry.clone().scale(0.9, 0.9, 0.9);
	outerGeometry.translate(position.x, position.y, position.z);
	var outerMaterial = new THREE.MeshBasicMaterial({ color: color });
	this.outer = new THREE.Mesh(outerGeometry, outerMaterial);

	innerGeometry.translate(position.x, position.y, position.z);
	var innerMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
	this.inner = new THREE.Mesh(innerGeometry, innerMaterial);

	// each stage is rendered separately with the stencil buffer, so it gets its own scene
	this.sceneOuter = new THREE.Scene();
	this.sceneOuter.add(this.outer);
	this.sceneInner = new THREE.Scene();
	this.sceneInner.add(this.inner);

	// mostly just so we can store the FOV setting
	this.camera = player.camera.clone();

	// the camera helper was broken when portal recursion was added :(
	/*if(this.debug) {
		this.helper = new THREE.CameraHelper(this.camera);
		scene.add(this.helper);
	}*/
};

Portal.prototype = {

	constructor: Portal,

	/**
	 * Link this portal to another.
	 * @param other the other portal
	 */
	link: function(other) {
		this.other = other;
	},

	/**
	 * Returns a camera used for viewing the contents of this portal.
	 * Must not be called for unlinked portals; be sure to check that a portal is linked first.
	 * @param camera the camera viewing the portal
	 */
	getCamera: function(camera) {

		// in case there was a window resize
		this.camera.aspect = camera.aspect;

		// TODO: consider compiling the below transformation into a matrix so it's fast to reuse when recursing
		// TODO: it would just need to be updated whenever the player's position changes
		// TODO: actually, 2 matrices: one for position, one for rotation.

		// get the position
		this.camera.position.copy(camera.position);
		this.camera.position.sub(this.position);
		this.camera.position.applyEuler(new THREE.Euler(-this.rotation.x, -this.rotation.y, -this.rotation.z, "ZXY"));
		this.camera.position.negate();
		// TODO: I have no idea why this needs to be inverted, but I experimentally determined that it did
		// TODO: I'll need to make sure this works for all situations (I think it might actually need refactored by -portal.up)
		this.camera.position.y *= -1;
		this.camera.position.applyEuler(new THREE.Euler(this.other.rotation.x, this.other.rotation.y, this.other.rotation.z, "YXZ"));
		this.camera.position.add(this.other.position);

		// get the rotation
		this.camera.rotation.copy(camera.rotation);
		this.camera.rotation.x += this.other.rotation.x - this.rotation.x;
		this.camera.rotation.y += this.other.rotation.y - this.rotation.y + Math.PI;
		this.camera.rotation.z += this.other.rotation.z - this.rotation.z;

		// set the near so that objects behind the portal don't get shown
		// the near value is set to be as far as possible without its plane intersecting the portal
		// TODO: this may need revamped when portals are placed on walls
		this.camera.near = Math.min(
			this.other.forward.dot(this.other.position.clone().sub(this.camera.position).add(this.left).add(this.up)),
			this.other.forward.dot(this.other.position.clone().sub(this.camera.position).add(this.left).sub(this.up)),
			this.other.forward.dot(this.other.position.clone().sub(this.camera.position).sub(this.left).add(this.up)),
			this.other.forward.dot(this.other.position.clone().sub(this.camera.position).sub(this.left).sub(this.up))
		);
		// TODO: instead, return null and use this as an indication that the portal doesn't need to be rendered
		if(this.camera.near < 0.1) this.camera.near = 0.1;
		this.camera.updateProjectionMatrix();
		return this.camera;
	}

};