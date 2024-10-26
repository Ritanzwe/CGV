import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as oimo from 'oimo';

// Set up Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Set up Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Sky blue color

// Set up Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(-6, 6, -6);

// Set up Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Add Lighting
const ambientLight = new THREE.AmbientLight(0x404040, 2);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

// Add Ground Plane
const groundGeometry = new THREE.PlaneGeometry(50, 50);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
groundMesh.rotation.x = -Math.PI / 2; 
groundMesh.position.y = 0;
scene.add(groundMesh);

// Physics World Setup
const world = new oimo.World({ 
  timestep: 1/60, 
  iterations: 8, 
  broadphase: 2,
  worldscale: 1,
  random: true,
  info: false 
});
const groundBody = world.add({
  type: 'box',           // Box shape
  size: [500, 1, 500],     // Dimensions of the ground (should match your visual ground size)
  pos: [0, -0.5, 0],     // Position (slightly below y=0 to align visually)
  rot: [0, 0, 0],        // Rotation
  move: false,           // Static (not movable)
  density: 1
})
let carControls;
let porsche;

// Load the Car Model
const loader = new GLTFLoader();
loader.load(
  "assets/models/porsche/scene.gltf",
  (gltf) => {
    porsche = gltf.scene;
    porsche.scale.set(0.5, 0.5, 0.5);
    porsche.position.set(0, 1, 0);
    scene.add(porsche);

    // Initialize Car Controls
    carControls = new CarControls(porsche, world);
  },
  undefined,
  (error) => console.error("An error occurred while loading the model:", error)
);
var camera_toggle = false;
// Car Controls Class
class CarControls {
  constructor(car, world) {
    this.car = car;
    this.world = world;
    this.acceleration = 0.005;
    this.brakingForce = 0.02;
    this.turnSpeed = 0.1;

    this.forward = false;
    this.backward = false;
    this.left = false;
    this.right = false;
    this.braking = false;

    // Create Oimo physics body for the car
    this.body = world.add({
      type: 'box',
      size: [1, 0.5, 2],
      pos: [car.position.x, car.position.y, car.position.z],
      rot: [0, 0, 0],
      move: true,
      density: 1
    });

    // Bind Key Events
    window.addEventListener('keydown', (event) => this.onKeyDown(event));
    window.addEventListener('keyup', (event) => this.onKeyUp(event));
  }

  onKeyDown(event) {
    switch (event.key) {
      case 'ArrowUp': this.forward = true; break;
      case 'ArrowDown': this.backward = true; break;
      case 'ArrowLeft': this.left = true; break;
      case 'ArrowRight': this.right = true; break;
      case ' ': this.braking = true; break;
      case 'c': camera_toggle=!camera_toggle;break;
    }
  }

  onKeyUp(event) {
    switch (event.key) {
      case 'ArrowUp': this.forward = false; break;
      case 'ArrowDown': this.backward = false; break;
      case 'ArrowLeft': this.left = false; break;
      case 'ArrowRight': this.right = false; break;
      case ' ': this.braking = false; break;
    }
  }

  update() {
    if (this.body) {
        const force = new oimo.Vec3(0, 0, 0);

        // Forward and backward acceleration
        if (this.forward && !this.braking) {
            force.z += this.acceleration * 50; // Forward force
            if (this.left) {
              this.body.angularVelocity.y = this.turnSpeed; // Turn left
            }
            if (this.right) {
                this.body.angularVelocity.y = -this.turnSpeed; // Turn right
            }
        }
        if (this.backward && !this.braking) {
            force.z -= this.acceleration * 50; // Backward force
            if (this.left) {
              this.body.angularVelocity.y = -this.turnSpeed; // Turn left
            }
            if (this.right) {
                this.body.angularVelocity.y = this.turnSpeed; // Turn right
            }
        }

        // Apply turning forces based on input
        // if (this.left) {
        //     this.body.angularVelocity.y += this.turnSpeed; // Turn left
        // }
        // if (this.right) {
        //     this.body.angularVelocity.y -= this.turnSpeed; // Turn right
        // }

        // Apply braking effect
        if (this.braking) {
            this.body.linearVelocity.scale(1 - this.brakingForce); // Reduce speed
            if (this.left) {
              this.body.angularVelocity.y = this.turnSpeed; // Turn left
            }
            if (this.right) {
                this.body.angularVelocity.y = -this.turnSpeed; // Turn right
            }
        }

        // Apply the force to the car based on its orientation
        const orientationQuat = this.body.getQuaternion();
        const quat = new THREE.Quaternion(orientationQuat.x, orientationQuat.y, orientationQuat.z, orientationQuat.w);
        
        // Apply quaternion to the force vector to get world force
        const vec3 = new THREE.Vector3(force.x, force.y, force.z);
        vec3.applyQuaternion(quat); // Rotate the force vector to world coordinates

        // Create a new Oimo Vec3 with the correct components
        const direction = new oimo.Vec3(vec3.x, vec3.y, vec3.z);

        // Apply the force directly to the physics body
        //this.body.applyForce(direction);
        this.body.linearVelocity.add(direction);
        // Sync model position and rotation with physics body
        const pos = this.body.getPosition();
        this.car.position.set(pos.x, pos.y, pos.z);

        const rot = this.body.getQuaternion();
        this.car.quaternion.set(rot.x, rot.y, rot.z, rot.w);
    }
}

}

function updateCameraPosition() {
  const offset = new THREE.Vector3(0, 2, -5);
  const carPosition = carControls.car.position.clone();
  const carQuaternion = carControls.car.quaternion.clone();
  const cameraPosition = offset.applyQuaternion(carQuaternion).add(carPosition);

  camera.position.lerp(cameraPosition, 1);
  //console.log(carPosition);
  camera.lookAt(carPosition);
}

// Animation Loop
function animate() {
  requestAnimationFrame(animate);

  world.step();

  if (carControls) {
    carControls.update();
  }
  if (camera_toggle) {
    updateCameraPosition();
  } else {
    controls.update();
  }
  renderer.render(scene, camera);
}

animate();

// Adjust on Window Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
