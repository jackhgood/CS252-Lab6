/**
 * Constructor for portals.
 * @param scene the scene the portal belongs to
 * @param player the player who owns the portal
 * @param position vector of the location of the center of the portal
 * @param rotation the THREE.Euler rotation
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
	if(rotation.order !== "YXZ") rotation.reorder("YXZ");
	this.rotation = rotation;
	this.antirotation = new THREE.Euler(-rotation.x, -rotation.y, -rotation.z, "ZXY");
	this.color = color;
	this.debug = debug;
	this.other = null;

	this.forward = new THREE.Vector3(0, 0, 1).applyEuler(rotation);
	this.up = new THREE.Vector3(0, 1, 0).applyEuler(rotation);
	this.left = new THREE.Vector3(1, 0, 0).applyEuler(rotation);

	// manually scale a circle into an ellipse, since the three.js ellipse curves are so hard to use
	var outerGeometry = new THREE.CircleGeometry(this.radiusX, 100);
	var scale = this.radiusY / this.radiusX;
	for(var i = 0; i < outerGeometry.vertices.length; i++) {
		outerGeometry.vertices[i].y *= scale;
		outerGeometry.vertices[i].applyEuler(rotation);
	}

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

	// mark which side is the top
	if(this.debug) {
		var debugGeometry = new THREE.CircleGeometry(this.radiusX / 10, 16);
		var debugMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff - color });
		debugGeometry.translate(0, 1.1 * this.radiusY, 0);
		for(i = 0; i < debugGeometry.vertices.length; i++) debugGeometry.vertices[i].applyEuler(rotation);
		debugGeometry.translate(position.x, position.y, position.z);
		this.sceneOuter.add(new THREE.Mesh(debugGeometry, debugMaterial));
	}

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
	 * @param source the camera viewing the portal
	 */
	getCamera: function(source) {

		var camera = source.clone();

		this.transform(camera);

		// reflect the camera's position across the portal plane
		// see http://mathworld.wolfram.com/Reflection.html
		//camera.position.sub(this.other.forward.clone().multiplyScalar(2 * (this.other.forward.dot(camera.position) - this.other.forward.dot(this.other.position))));

		camera.updateProjectionMatrix();

		// set projection matrix to use oblique near clip plane
		// projection matrix code from http://jsfiddle.net/slayvin/PT32b/
		// paper explaining this technique: http://www.terathon.com/lengyel/Lengyel-Oblique.pdf
		var clipPlane = new THREE.Plane();
		this.forward.negate();
		clipPlane.setFromNormalAndCoplanarPoint(this.forward, this.position);
		this.forward.negate();
		clipPlane.applyMatrix4(camera.matrixWorldInverse);

		clipPlane = new THREE.Vector4(clipPlane.normal.x, clipPlane.normal.y, clipPlane.normal.z, clipPlane.constant);

		var q = new THREE.Vector4();
		var projectionMatrix = camera.projectionMatrix;

		q.x = (Math.sign(clipPlane.x) + projectionMatrix.elements[8]) / projectionMatrix.elements[0];
		q.y = (Math.sign(clipPlane.y) + projectionMatrix.elements[9]) / projectionMatrix.elements[5];
		q.z = -1.0;
		q.w = (1.0 + projectionMatrix.elements[10]) / camera.projectionMatrix.elements[14];

		// Calculate the scaled plane vector
		clipPlane.multiplyScalar(2.0 / clipPlane.dot(q));

		// Replace the third row of the projection matrix
		projectionMatrix.elements[2] = clipPlane.x;
		projectionMatrix.elements[6] = clipPlane.y;
		projectionMatrix.elements[10] = clipPlane.z + 1.0;
		projectionMatrix.elements[14] = clipPlane.w;

		return camera;
	},

	/**
	 * Transform a THREE.Object3D from this space of this portal to the space of its linked portal.
	 * Must not be called for unlinked portals; be sure to check that a portal is linked first.
	 * @param object the object to transform
	 */
	transform: function(object) {
		// TODO: consider compiling the below transformation into a matrix so it's fast to reuse when recursing

		// get the position
		object.position.sub(this.position);
		object.position.applyEuler(this.antirotation);
		object.position.x = -object.position.x;
		object.position.z = -object.position.z;
		object.position.applyEuler(this.other.rotation);
		object.position.add(this.other.position);

		// get the rotation
		// TODO: this is a terrible way to do this, but I spent hours trying different ways and couldn't do better
		if(object.rotation.order !== "YXZ") object.rotation.reorder("YXZ");
		var forward = new THREE.Vector3(0, 0, -1).applyEuler(object.rotation);
		var up = new THREE.Vector3(0, 1, 0).applyEuler(object.rotation);
		forward.applyEuler(this.antirotation);
		up.applyEuler(this.antirotation);
		forward.x = -forward.x; up.x = -up.x;
		forward.z = -forward.z; up.z = -up.z;
		forward.applyEuler(this.other.rotation);
		up.applyEuler(this.other.rotation);
		forward.add(object.position);
		object.up.copy(up);
		object.lookAt(forward);

	}

};