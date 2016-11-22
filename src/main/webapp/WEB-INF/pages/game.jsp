<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ page language="java" pageEncoding="UTF-8" session="false"%>
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<title>The Game</title>

	<link rel="stylesheet" href="<c:url value='/css/main.css' />" />
	<link rel="stylesheet" type="text/css" href="<c:url value='/css/game.css' />" />

	<script type="text/javascript" src="<c:url value='/webjars/three.js/r77/three.min.js' />"></script>
	<script type="text/javascript" src="<c:url value='/js/physijs/stats.js' />"></script>
	<script type="text/javascript" src="<c:url value='/js/physijs/physi.js' />"></script>

	<script type="text/javascript" src="<c:url value='/js/player.js' />"></script>

	<script type="text/javascript">
		'use strict';

		Physijs.scripts.worker = "<c:url value='/js/physijs/physijs_worker.js' />";
		Physijs.scripts.ammo = "<c:url value='/js/physijs/ammo.js' />";

		// functions
		var init, gameUpdate, render;

		// visual elements
		// TODO: move lighting to the future "level" class
		var viewport, renderer, render_stats, physics_stats, scene, light, player;

		// settings
		var debug = false; // set to true to show additional things to help with debugging physics & rendering

		// other
		var keystatus = []; // ascii-indexed states of all the keys on the keyboard
		var keylock = []; // used to keep keys from auto-pressing when held down

		/**
		 * First-time initialization of the scene, the world, and other elements.
		 */
		init = function() {
			viewport = document.getElementById("viewport");

			// set up the renderer and add it to the viewport
			renderer = new THREE.WebGLRenderer({ antialias: true });
			renderer.setSize(window.innerWidth, window.innerHeight);
			renderer.shadowMap.enabled = true;
			renderer.shadowMapSoft = true;
			viewport.appendChild(renderer.domElement);

			// set up the fps counter for rendering and add it to the viewport
			render_stats = new Stats();
			render_stats.domElement.style.position = "absolute";
			render_stats.domElement.style.top = "0px";
			render_stats.domElement.style.zIndex = 100;
			viewport.appendChild(render_stats.domElement);

			// set up the fps counter for physics and add it to the viewport
			physics_stats = new Stats();
			physics_stats.domElement.style.position = "absolute";
			physics_stats.domElement.style.top = "50px";
			physics_stats.domElement.style.zIndex = 100;
			viewport.appendChild(physics_stats.domElement);

			// initialize the scene
			scene = new Physijs.Scene({ fixedTimeStep: 1/90 });
			scene.setGravity(new THREE.Vector3(0, -30, 0));
			scene.addEventListener(
					"update",
					function() {
						gameUpdate();
						scene.simulate(undefined, 2);
						physics_stats.update();
					}
			);

			// lighting
			// TODO: lighting is kind of arbitrary at the moment. Ideally it would be moved to "level" and given a saveable setting
			// TODO: add ambient light so shadows arent 100% black
			// ambient light
			scene.add(new THREE.AmbientLight(0x404040));
			// directional light
			// TODO: toy with the possibility of yellowish light to simulate sunlight
			// TODO: Godrays?!?!??!
			light = new THREE.DirectionalLight(0xFFFFFF);
			light.position.set(20, 40, -15);
			light.target.position.copy(scene.position);
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
			scene.add(light);
			if(debug) scene.add(new THREE.CameraHelper(light.shadow.camera));

			// TODO: these are placeholder testing objects that should be removed when the real world is added
			var ground_material = Physijs.createMaterial(
					new THREE.MeshLambertMaterial({ color: 0x888888 }),
					.8, // friction
					.4  // restitution
			);
			var ground = new Physijs.BoxMesh(
					new THREE.CubeGeometry(100, 0.5, 100),
					ground_material,
					0 // mass
			);
			ground.receiveShadow = true;
			ground.castShadow = false;
			scene.add(ground);

			var item_material = Physijs.createMaterial(
					new THREE.MeshLambertMaterial({ color: 0x8888ff }),
					.8, .4
			);
			var box = new Physijs.BoxMesh(
					new THREE.CubeGeometry(1, 1, 1),
					item_material, 1
			);
			box.position.set(-20, 12, 20);
			box.castShadow = box.receiveShadow = true;
			scene.add(box);

			// to test slopes
			var cone = new Physijs.ConeMesh(
					new THREE.ConeGeometry(10, 4),
					item_material,
					0
			);
			cone.position.set(20, 2, 20);
			cone.castShadow = cone.receiveShadow = true;
			scene.add(cone);
			var cone2 = new Physijs.ConeMesh(
					new THREE.ConeGeometry(10, 12),
					item_material,
					0
			);
			cone2.position.set(20, 6, -20);
			cone2.castShadow = cone2.receiveShadow = true;
			scene.add(cone2);
			var cone3 = new Physijs.ConeMesh(
					new THREE.ConeGeometry(10, 30),
					item_material,
					0
			);
			cone3.position.set(-20, 15, -20);
			cone3.castShadow = cone3.receiveShadow = true;
			scene.add(cone3);

			// TODO: end of temporary objects: insert call to build world here

			// create the player
			// TODO: it might make the most sense to let the player belong to the level and do this in level initialization
			// TODO: since then the level can dictate the player's starting position
			// TODO: and the player can hand level editor information directly to the level
			player = new Player(scene, debug);

			// pointer lock setup
			// based heavily on https://threejs.org/examples/misc_controls_pointerlock.html
			// different browsers use different naming schemes, hence the "moz" and "webkit"
			// however, all browsers conventiently seem to exit pointer lock when escape is pressed
			if("pointerLockElement" in document || "mozPointerLockElement" in document || "webkitPointerLockElement" in document) {
				// the element which governs the pointer lock
				// TODO: this might be best if changed to the viewport
				var element = document.body;

				// pointer lock event handlers
				var pointerlockchange = function(event) {
					if(document.pointerLockElement === element || document.mozPointerLockElement === element || document.webkitPointerLockElement === element){
						// TODO: events caused by locking pointer go here
					} else {
						// TODO: events caused by unlocking pointer go here
					}
				};

				var pointerlockerror = function(event) {
					// TODO: I'm not sure what would actually trigger this, but it should be figured out and handled
					alert("pointerlock error!");
				};

				document.addEventListener("pointerlockchange", pointerlockchange);
				document.addEventListener("mozpointerlockchange", pointerlockchange);
				document.addEventListener("webkitpointerlockchange", pointerlockchange);
				document.addEventListener("pointerlockerror", pointerlockerror);
				document.addEventListener("mozpointerlockerror", pointerlockerror);
				document.addEventListener("webkitpointerlockerror", pointerlockerror);

				// attempt to lock the pointer when the element is clicked
				// TODO: figure out what happens to click events while the pointer is locked
				element.addEventListener("click", function(event) {
					// request that the browser lock the pointer
					element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;
					if(/Firefox/i.test(navigator.userAgent)) { // TODO: what on earth does this mean?
						var fullscreenchange = function(event){
							if(document.fullscreenElement === element || document.mozFullscreenElement === element || document.mozFullScreenElement === element) {
								// TODO: I think we are maybe losing some functionality (like resizing the viewport) by deleting the old fullscreen handler
								document.removeEventListener("fullscreenchange", fullscreenchange);
								document.removeEventListener("mozfullscreenchange", fullscreenchange);
								element.requestPointerLock();
							}
						};
						document.addEventListener('fullscreenchange', fullscreenchange, false );
						document.addEventListener('mozfullscreenchange', fullscreenchange, false );
						element.requestFullscreen = element.requestFullscreen || element.mozRequestFullscreen || element.mozRequestFullScreen || element.webkitRequestFullscreen;
						element.requestFullscreen();
					} else {
						element.requestPointerLock();
					}
				});
			} else {
				// TODO: investigate whether any modern browsers do this
				// TODO: if so, either seek alternatives or disable the application here
				alert("Your browser doesn't support Pointer Lock API!");
			}

			// other miscellaneous initilization
			for(var i = 0; i < 128; i++) {
				keystatus[i] = false;
				keylock[i] = false;
			}

			// generic event handlers
			document.addEventListener(
					"keydown",
					function(event) {
						if(!keylock[event.keyCode]) {
							keystatus[event.keyCode] = true;
							keylock[event.keyCode] = true;
						}
					}
			);

			document.addEventListener(
					"keyup",
					function(event) {
						keystatus[event.keyCode] = false;
						keylock[event.keyCode] = false;
					}
			);

			document.addEventListener(
					"mousemove",
					function(event) {
						var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
						var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
						player.rotate(movementX, movementY);
					}
			);

			// begin
			requestAnimationFrame(render);
			scene.simulate();

		};

		/**
		 * Called once per physics tick.
		 * Used to trigger player's change of position as result of controls input.
		 */
		gameUpdate = function() {
			player.update(keystatus);
		};

		/**
		 * Called once per frame, when the scene is ready to render.
		 */
		render = function() {
			// TODO: special portal rendering will likely go herew
			player.prepCamera();
			requestAnimationFrame(render);
			renderer.render(scene, player.camera);
			render_stats.update();
		};

		// request that init be called once the html below is fully loaded
		window.onload = init;

	</script>
</head>
<body>

<!-- TODO: add things for pause, click to begin, controls -->
<div id="viewport"></div>

</body>
</html>