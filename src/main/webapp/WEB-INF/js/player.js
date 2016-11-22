/**
 * Constructor for Player.
 * Adds the camera and player physics objects to the scene.
 * @param scene the Physijs.scene the player will belong to
 * @constructor
 */
var Player = function(scene) {
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
	this.camera.position.set(40, 10, 0);
	this.camera.lookAt(scene.position);
	scene.add(this.camera);

};