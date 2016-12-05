<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ page language="java" pageEncoding="UTF-8" session="false"%>
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="_csrf" th:content="${_csrf.token}"/>
	<meta name="_csrf_header" th:content="${_csrf.headerName}"/>
	<title>Gateway</title>

	<link rel="stylesheet" href="<c:url value='/css/main.css' />" />
	<link rel="stylesheet" type="text/css" href="<c:url value='/css/game.css' />" />

	<script type="text/javascript" src="<c:url value='/js/threejs/three.js' />"></script>
	<script type="text/javascript" src="<c:url value='/js/physijs/stats.js' />"></script>
	<script type="text/javascript" src="<c:url value='/js/physijs/physi.js' />"></script>
	<script type="text/javascript" src="<c:url value='/js/threejs/SkyShader.js' />"></script>

	<script type="text/javascript" src="<c:url value='/js/level.js' />"></script>
	<script type="text/javascript" src="<c:url value='/js/portal.js' />"></script>
	<script type="text/javascript" src="<c:url value='/js/player.js' />"></script>

	<script type="text/javascript">
		'use strict';

		Physijs.scripts.worker = "<c:url value='/js/physijs/physijs_worker.js' />";
		Physijs.scripts.ammo = "<c:url value='/js/physijs/ammo.js' />";

		// functions
		var init, gameUpdate, debugUpdate, render, startLevel, saveLevel, updateUi;

		// visual elements
		var viewport, renderer, render_stats, physics_stats, level, pointerlockElement;

		// settings
		var settings = {
			// generally, 0 is low quality, 1 is medium, 2 is high
			debug: false, // set to true to show additional things to help with debugging physics & rendering
			shadowQuality: 2,
			portalQuality: 2,
			portalRecursions: 5
		};
		var timestep = 1/90; // object speed will necessarily be limited to 1/(2*timestep) to prevent traveling through 1-unit thick walls
		  					 // (unless we can find some way around this) (TODO)

		// other
		var mousestatus = []; // states of the mouse buttons
		var keystatus = []; // states of all the keys on the keyboard
		var keylock = []; // used to keep keys from auto-pressing when held down
		var keycontrol;
		var paused = true;

		/**
		 * First-time initialization of the scene, the world, and other elements.
		 */
		init = function() {
			viewport = document.getElementById("viewport");

			// set up the renderer and add it to the viewport
			renderer = new THREE.WebGLRenderer({ antialias: true, sortObjects: false/*, logarithmicDepthBuffer: true*/ });
			renderer.setSize(window.innerWidth, window.innerHeight);
			renderer.shadowMap.enabled = true;
			renderer.shadowMap.autoUpdate = false;
			renderer.shadowMapSoft = true;
			renderer.autoClear = false;
			viewport.appendChild(renderer.domElement);

			if(settings.debug) {
				// set up the fps counter for rendering and add it to the viewport
				render_stats = new Stats();
				render_stats.domElement.style.position = "absolute";
				render_stats.domElement.style.top = "0px";
				render_stats.domElement.style.zIndex = 999;
				viewport.appendChild(render_stats.domElement);

				// set up the tick counter for physics and add it to the viewport
				physics_stats = new Stats();
				physics_stats.domElement.style.position = "absolute";
				physics_stats.domElement.style.top = "0px";
				physics_stats.domElement.style.left = "75px";
				physics_stats.domElement.style.zIndex = 999;
				viewport.appendChild(physics_stats.domElement);
			} else document.getElementById("debug").style.display = "none";

			// pointer lock setup
			// based heavily on https://threejs.org/examples/misc_controls_pointerlock.html
			// different browsers use different naming schemes, hence the "moz" and "webkit"
			// however, all browsers conventiently seem to exit pointer lock when escape is pressed
			pointerlockElement = document.getElementById("pauseOverlay");
			if("pointerLockElement" in document || "mozPointerLockElement" in document || "webkitPointerLockElement" in document) {
				// pointer lock event handlers
				var pointerlockchange = function(event) {
					event.stopPropagation();
					if(document.pointerLockElement === pointerlockElement || document.mozPointerLockElement === pointerlockElement || document.webkitPointerLockElement === pointerlockElement){
						// unpause
						pointerlockElement.style.display = "none";
						level.player.crosshair.visible = true;
						paused = false;
						level.scene.onSimulationResume();
						level.scene.simulate();
					} else {
						// pause
						level.player.crosshair.visible = false;
						if(keystatus[69]) { // E
							pauseMenu.style.display = "none";
							editMenu.style.display = "block";
						} else { // escape
							pauseMenu.style.display = "block";
							editMenu.style.display = "none";
							graphicsMenu.style.display = "none";
						}
						graphicsMenuDropdown.innerHTML = "&#9654 Graphics Settings";
						pointerlockElement.style.display = "block";
						paused = true;
					}
				};

				var pointerlockerror = function(event) {
					// TODO: I'm not sure what would actually trigger this, but it should be figured out and handled
				};

				document.addEventListener("pointerlockchange", pointerlockchange);
				document.addEventListener("mozpointerlockchange", pointerlockchange);
				document.addEventListener("webkitpointerlockchange", pointerlockchange);
				document.addEventListener("pointerlockerror", pointerlockerror);
				document.addEventListener("mozpointerlockerror", pointerlockerror);
				document.addEventListener("webkitpointerlockerror", pointerlockerror);

				// attempt to lock the pointer when the element is clicked
				// TODO: use the viewport as the click handler for clicking while in-game
				pointerlockElement.addEventListener("click", function(event) {
					// request that the browser lock the pointer
					pointerlockElement.requestPointerLock = pointerlockElement.requestPointerLock || pointerlockElement.mozRequestPointerLock || pointerlockElement.webkitRequestPointerLock;
					document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock || document.webkitExitPointerLock;
					// TODO: support fullscreen
					/*if(/Firefox/i.test(navigator.userAgent)) { // TODO: what on earth does this mean?
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
						*/
					pointerlockElement.requestPointerLock();
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
							keycontrol = event.ctrlKey;
							switch(event.keyCode) {
								case 69: // E
									document.exitPointerLock();
									break;
								case 86: // V
									if(settings.debug) level.player.toggleThirdPerson();
									break;
								case 80: // P
									saveLevel();
									break;
							}
						}
					}
			);

			document.addEventListener(
					"keyup",
					function(event) {
						keystatus[event.keyCode] = false;
						keylock[event.keyCode] = false;
						keycontrol = event.ctrlKey;
					}
			);

			document.addEventListener(
					"mousedown",
					function(event) {
						// TODO: make sure this doesn't catch the click that unpauses the game
						mousestatus[event.which] = true;
					}
			);

			document.addEventListener(
					"mouseup",
					function(event) {
						// TODO: make sure this doesn't catch the click that unpauses the game
						mousestatus[event.which] = false;
					}
			);

			document.addEventListener(
					"mousemove",
					function(event) {
						if(!paused) {
							var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
							var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
							level.player.rotate(movementX, movementY);
						}
					}
			);

			document.addEventListener(
					"wheel",
					function(event) {
						event = window.event || event;
						if(!paused && level.player.mode) {
							level.player.diam += 0.5 * Math.sign(event.wheelDelta || -event.detail);
						}
					}
			);

			document.addEventListener(
					"click",
					function(event) {
						// TODO: make sure this doesn't catch the click that unpauses the game
						if(!paused) {
							level.click(event.which);
						}
					}
			);

			window.addEventListener(
					"resize",
					function(event) {
						if(level.player.camera) level.player.camera.aspect = window.innerWidth / window.innerHeight;
						level.player.camera.updateProjectionMatrix();
						renderer.setSize(window.innerWidth, window.innerHeight);
					}
			);

			var graphicsMenu = document.getElementById("graphicsMenu");
			var graphicsMenuDropdown = document.getElementById("graphicsMenuDropdown");
			var pauseMenu = document.getElementById("pauseMenu");
			var editMenu = document.getElementById("editMenu");

			// graphics menu event handlers
			graphicsMenuDropdown.addEventListener(
					"click",
					function(event) {
						event.stopPropagation();
						if(graphicsMenu.style.display == "none") {
							graphicsMenu.style.display = "block";
							graphicsMenuDropdown.innerHTML = "&#9660 Graphics Settings";
						} else {
							graphicsMenu.style.display = "none";
							graphicsMenuDropdown.innerHTML = "&#9654 Graphics Settings";
						}
					}
			);

			graphicsMenu.addEventListener(
					"click",
					function(event) {
						event.stopPropagation();
					}
			);

			document.getElementById("graphicsApplyButton").addEventListener(
					"click",
					function(event) {
						// read the settings from the graphics form and update them
						if(document.getElementById("shadowButton0").checked) {
							settings.shadowQuality = 0;
						} else
						if(document.getElementById("shadowButton1").checked) {
							settings.shadowQuality = 1;
						} else
						if(document.getElementById("shadowButton2").checked) {
							settings.shadowQuality = 2;
						}
						if(document.getElementById("portalButton0").checked) {
							settings.portalQuality = 0;
						} else
						if(document.getElementById("portalButton1").checked) {
							settings.portalQuality = 1;
						} else
						if(document.getElementById("portalButton2").checked) {
							settings.portalQuality = 2;
						}
						settings.portalRecursions = document.getElementById("portalRecursionsSlider").value;

						level.updateSettings();
					}
			);

			// set initial values
			document.getElementById("shadowButton" + settings.shadowQuality).checked = true;
			document.getElementById("portalButton" + settings.portalQuality).checked = true;
			document.getElementById("portalRecursionsSlider").value = settings.portalRecursions;
			document.getElementById("portalRecursionsValue").innerHTML = settings.portalRecursions.toString();

			editMenu.addEventListener(
					"click",
					function(event) {
						event.stopPropagation();
					}
			);

			updateUi(0, 0);
			updateUi(1, 0);

			// begin
			startLevel();

		};

		/**
		 * Called once per physics tick.
		 * Used to trigger player's change of position as result of controls input.
		 */
		gameUpdate = function() {
			level.update(keystatus, mousestatus);
		};

		/**
		 * Called once per physics tick, if in debug mode.
		 * Updates information displayed in debug mode.
		 */
		var lastPos = new THREE.Vector3(0, 0, 0);
		var lastRot = new THREE.Vector3(0, 0, 0);
		debugUpdate = function() {
			document.getElementById("debug_playerPosition").innerHTML = "("
					+ Number(level.player.body.position.x).toFixed(2) + ", "
					+ Number(level.player.body.position.y).toFixed(2) + ", "
					+ Number(level.player.body.position.z).toFixed(2) + ")";
			document.getElementById("debug_playerRotation").innerHTML = "("
					+ Number(level.player.camera.rotation.x).toFixed(2) + ", "
					+ Number(level.player.camera.rotation.y).toFixed(2) + ", "
					+ Number(level.player.camera.rotation.z).toFixed(2) + ")";
			var dir = new THREE.Vector3(0, 0, -1).applyEuler(level.player.camera.rotation);
			document.getElementById("debug_playerDirection").innerHTML = "("
					+ Number(dir.x).toFixed(2) + ", "
					+ Number(dir.y).toFixed(2) + ", "
					+ Number(dir.z).toFixed(2) + ")";
			lastPos.sub(level.player.body.position).divideScalar(timestep);
			document.getElementById("debug_playerVelocity").innerHTML = "("
					+ Number(-lastPos.x).toFixed(2) + ", "
					+ Number(-lastPos.y).toFixed(2) + ", "
					+ Number(-lastPos.z).toFixed(2) + ")";
			document.getElementById("debug_playerSpeed").innerHTML = lastPos.length().toFixed(2);
			document.getElementById("debug_playerOnGround").innerHTML = "" + level.player.onGround;
			lastPos.copy(level.player.body.position);
			lastRot.copy(level.player.camera.rotation);
		};

		/**
		 * Called once per frame, when the scene is ready to render.
		 */
		render = function() {
			// TODO: special portal rendering will likely go here
			renderer.clear();
			requestAnimationFrame(render);
			var gl = renderer.context;
			// TODO: have a graphics option that does not enable stencil testing, for users without a graphics card
			if(level.player.thirdPerson) level.player.prepCamera();
			if(settings.portalQuality == 0) {
				level.render(renderer, level.player.camera, -1, 0);
			} else if(settings.portalQuality == 1) {
				// TODO: implement medium portal settings with canvas texture

			} else if(settings.portalQuality == 2) {
				gl.enable(gl.STENCIL_TEST);
				level.render(renderer, level.player.camera, -1, settings.portalRecursions);
				gl.disable(gl.STENCIL_TEST);
			}

			if(settings.debug) render_stats.update();
		};

		/**
		 * Recolor the block picking gui.
		 */
		updateUi = function(col, selection) {
			var i;
			if(col == 0) {
				for(i = 0; i < 4; i++) {
					if(selection == i) document.getElementById("surface" + i).style.color = "white";
					else document.getElementById("surface" + i).style.color = "gray";
				}
			}
			if(col == 1) {
				for(i = 0; i < 4; i++) {
					if(selection == i) document.getElementById("block" + i).style.color = "white";
					else document.getElementById("block" + i).style.color = "gray";
				}
			}
		};

		/**
		 * Attempts to save the level to the database.
		 */
		saveLevel = function() {
			var request = new XMLHttpRequest();
			request.open("POST", "<c:url value="/save" />", false);
			request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
			request.send("data=" + encodeURIComponent(level.compile()));
			alert(request.responseText);
		};

		/**
		 * Load the level, initialize the scene, and start the game.
		 * May be called again to reset the level.
		 */
		startLevel = function () {
			// load the level and initialize the scene
			level = new Level(timestep, settings);
			level.constructScene(${data == null ? "level.getDefaultLevelData()" : data}).addEventListener(
					"update",
					function() {
						// if it's paused, do nothing and check again in a moment
						if(!paused) {
							gameUpdate();
							level.scene.simulate(undefined, 2);
							if(settings.debug) {
								physics_stats.update();
								debugUpdate();
							}
						}
					}
			);

			// begin simulation
			requestAnimationFrame(render);
			level.scene.simulate();
		};

		// request that init be called once the html below is fully loaded
		window.onload = init;

	</script>
</head>
<body>

<!-- TODO: add things for pause, click to begin, controls -->
<div id="viewport">
	<div id="debug">
		<table>
			<tr><td class="key">Position:</td><td id="debug_playerPosition"></td></tr>
			<tr><td class="key">Rotation:</td><td id="debug_playerRotation"></td></tr>
			<tr><td class="key">Direction:</td><td id="debug_playerDirection"></td></tr>
			<tr><td class="key">Velocity:</td><td id="debug_playerVelocity"></td></tr>
			<tr><td class="key">Speed:</td><td id="debug_playerSpeed"></td></tr>
			<tr><td class="key">onGround:</td><td id="debug_playerOnGround"></td></tr>
		</table>
	</div>
	<div id="pauseOverlay">
		<div id="pauseMenu">
			<table style="margin: auto">
				<tr><td colspan="2" style="text-align: center; font-weight: bold; font-size: 36pt">Click to Play</td></tr>
				<tr>
					<td>
						<table>
							<tr><td class="key">W</td><td>Forward</td>
							<tr><td class="key">S</td><td>Back</td>
							<tr><td class="key">A</td><td>Strafe Left</td></tr>
							<tr><td class="key">D</td><td>Strafe Right</td></tr>
						</table>
					</td>
					<td>
						<table>
							<tr><td class="key">Space</td><td>Jump</td></tr>
							<tr><td class="key">Escape</td><td>Pause</td></tr>
							<tr><td class="key"><br/></td><td></td></tr>
							<tr><td class="key"><br/></td><td></td></tr>
						</table>
					</td>
				</tr>
			</table>
			<div id="graphicsMenuDropdown">&#9654 Graphics Settings</div>
			<div id="graphicsMenu">
				Shadow Quality <br />
				<input id="shadowButton0" type="radio" name="shadow"> None <br />
				<input id="shadowButton1" type="radio" name="shadow"> Low <br />
				<input id="shadowButton2" type="radio" name="shadow"> High <br />
				Portal Quality <br />
				<input id="portalButton0" type="radio" name="portal"> Low <br />
				<input id="portalButton1" type="radio" name="portal"> Medium <br />
				<input id="portalButton2" type="radio" name="portal"> High (GPU Recommended) <br />
				Portal Visual Recursions: <span id="portalRecursionsValue"></span> <br />
				<input id="portalRecursionsSlider" type="range" min="1" max="16" step="1"
					   onchange="document.getElementById('portalRecursionsValue').innerHTML = this.value;" /> <br />
				<button id="graphicsApplyButton">Apply</button>

			</div>
		</div>
		<div id="editMenu">
			<table id="editSelect">
				<!-- TODO: this is a terrible way to handle this. If you know of a better way, please do swap it in. -->
				<tr><th>Material</th><th>Shape</th></tr>
				<tr>
					<td id="surface0" onclick="level.player.selectedSurface = BLOCK_ENUM.PORTAL_SURFACE; updateUi(0, 0);">Portal Surface</td>
					<td id="block0" onclick="level.player.selectedBlock = BLOCK_ENUM.CUBE; updateUi(1, 0);">Cube</td>
				</tr>
				<tr>
					<td id="surface1" onclick="level.player.selectedSurface = BLOCK_ENUM.BLACK_SURFACE; updateUi(0, 1);">Normal Surface</td>
					<td id="block1" onclick="level.player.selectedBlock = BLOCK_ENUM.HALF_SLOPE; updateUi(1, 1);">Slope</td>
				</tr>
				<tr>
					<td id="surface2"></td>
					<td id="block2" onclick="level.player.selectedBlock = BLOCK_ENUM.CORNER_SLOPE; updateUi(1, 2);">Tetra</td>
				</tr>
				<tr>
					<td id="surface3"></td>
					<td id="block3" onclick="level.player.selectedBlock = BLOCK_ENUM.INVERSE_CORNER; updateUi(1, 3);">Anti-tetra</td>
				</tr>
			</table>
		</div>
	</div>
</div>

</body>
</html>