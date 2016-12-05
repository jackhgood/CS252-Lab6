/**
 * Constructor for portals.
 * @param scene the scene the portal belongs to
 * @param player the player who owns the portal
 * @param object the object the portal is placed on
 * @param position vector of the location of the center of the portal
 * @param rotation the THREE.Euler rotation
 * @param color the color of the portal
 * @param settings the gameplay settings
 * @constructor
 */
var Portal = function(scene, player, object, position, rotation, color, settings) {

	// general portal settings
	this.radiusX = 0.45;
	this.radiusY = 0.9;
	this.frameThickness = 0.05;

	this.scene = scene;
	// TODO: make the portal take more than one object
	this.object = object;
	this.position = position;
	if(rotation.order !== "YXZ") rotation.reorder("YXZ");
	rotation.y += Math.PI;
	this.rotation = rotation;
	this.antirotation = new THREE.Euler(-rotation.x, -rotation.y, -rotation.z, "ZXY");
	this.color = color;
	this.offset = 2 * player.camera.near;
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
	var material = new THREE.MeshBasicMaterial({ color: color, polygonOffset: true, polygonOffsetFactor: -10, polygonOffsetUnits: -3 });

	var innerGeometry = outerGeometry.clone().scale(0.9, 0.9, 0.9);
	outerGeometry.translate(position.x, position.y, position.z);
	this.outer = new THREE.Mesh(outerGeometry, material);

	innerGeometry.translate(position.x, position.y, position.z);
	this.inner = new THREE.Mesh(innerGeometry, material);

	// each stage is rendered separately with the stencil buffer, so it gets its own scene
	this.sceneOuter = new THREE.Scene();
	this.sceneOuter.add(this.outer);
	this.sceneInner = new THREE.Scene();
	this.sceneInner.add(this.inner);

	// add a frame with collision
	var frameMaterial = Physijs.createMaterial(new THREE.MeshBasicMaterial(), 0.8, 0.4);
	this.frame1 = new Physijs.BoxMesh(new THREE.BoxGeometry(this.frameThickness, 2 * this.radiusY, this.frameThickness), frameMaterial, 0);
	this.frame1.position.copy(this.left).multiplyScalar(1.2*this.radiusX).add(this.position);
	this.frame1.rotation.copy(this.rotation);
	this.frame1._physijs.collision_type = COL.WALL;
	this.frame1._physijs.collision_masks = COL.ALL;
	this.frame1.visible = false;
	this.scene.add(this.frame1);
	this.frame2 = new Physijs.BoxMesh(new THREE.BoxGeometry(this.frameThickness, 2 * this.radiusY, this.frameThickness), frameMaterial, 0);
	this.frame2.position.copy(this.left).multiplyScalar(-1.2*this.radiusX).add(this.position);
	this.frame2.rotation.copy(this.rotation);
	this.frame2._physijs.collision_type = COL.WALL;
	this.frame2._physijs.collision_masks = COL.ALL;
	this.frame2.visible = false;
	this.scene.add(this.frame2);
	this.frame3 = new Physijs.BoxMesh(new THREE.BoxGeometry(2 * this.radiusX, this.frameThickness, this.frameThickness), frameMaterial, 0);
	this.frame3.position.copy(this.up).multiplyScalar(1.2*this.radiusY).add(this.position);
	this.frame3.rotation.copy(this.rotation);
	this.frame3._physijs.collision_type = COL.WALL;
	this.frame3._physijs.collision_masks = COL.ALL;
	this.frame3.visible = false;
	this.scene.add(this.frame3);
	this.frame4 = new Physijs.BoxMesh(new THREE.BoxGeometry(2 * this.radiusX, this.frameThickness, this.frameThickness), frameMaterial, 0);
	this.frame4.position.copy(this.up).multiplyScalar(-1.2*this.radiusY).add(this.position);
	this.frame4.rotation.copy(this.rotation);
	this.frame4._physijs.collision_type = COL.WALL;
	this.frame4._physijs.collision_masks = COL.ALL;
	this.frame4.visible = false;
	this.scene.add(this.frame4);

	// put some offset so we don't clip the portal texture
	this.position.add(this.forward.clone().multiplyScalar(this.offset));


	// mark which side is the top
	if(settings.debug) {
		var debugGeometry = new THREE.CircleGeometry(this.radiusX / 10, 16);
		var debugMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff - color, polygonOffset: true, polygonOffsetFactor: -10, polygonOffsetUnits: -3 });
		debugGeometry.translate(0, 1.1 * this.radiusY, 0);
		for(i = 0; i < debugGeometry.vertices.length; i++) debugGeometry.vertices[i].applyEuler(rotation);
		debugGeometry.translate(position.x, position.y, position.z);
		this.sceneOuter.add(new THREE.Mesh(debugGeometry, debugMaterial));
	}

	// the camera helper was broken when portal recursion was added :(
	/*if(this.settings.debug) {
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

		camera.updateProjectionMatrix();

		var clipPlane = new THREE.Plane();
		this.forward.negate();
		clipPlane.setFromNormalAndCoplanarPoint(this.forward, this.forward.clone().multiplyScalar(this.offset).add(this.position));
		this.forward.negate();
		clipPlane.applyMatrix4(camera.matrixWorldInverse);
		var dist = clipPlane.distanceToPoint(new THREE.Vector3(0, 0, 0));
		if(dist > 0) return null;
		if(dist > -0.1) {
			camera.near = this.offset / 2;
			camera.updateProjectionMatrix();
		} else {

			// set projection matrix to use oblique near clip plane
			// projection matrix code from http://jsfiddle.net/slayvin/PT32b/
			// paper explaining this technique: http://www.terathon.com/lengyel/Lengyel-Oblique.pdf
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
		}

		return camera;
	},

	/**
	 * Transform a THREE.Object3D from this space of this portal to the space of its linked portal.
	 * Must not be called for unlinked portals; be sure to check that a portal is linked first.
	 * @param object the object to transform
	 */
	transform: function(object) {
		// TODO: consider compiling the below transformation into a matrix so it's fast to reuse when recursing

		if(object instanceof THREE.Vector3) {
			// get the position
			object.applyEuler(this.antirotation);
			object.x = -object.x;
			object.z = -object.z;
			object.applyEuler(this.other.rotation);
		} else { // assumed to otherwise be an object with position and rotation
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

		return object;
	},

	/**
	 * Removes the portal's components from the scene.
	 */
	cleanup: function() {
		this.scene.remove(this.frame1);
		this.scene.remove(this.frame2);
		this.scene.remove(this.frame3);
		this.scene.remove(this.frame4);
	}

};