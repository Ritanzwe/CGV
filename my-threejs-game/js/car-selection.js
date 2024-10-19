import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Set up Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Set up Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Sky blue color

// Set up Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 5);

// Set up Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Smooth the control movements

// Add Lighting
const ambientLight = new THREE.AmbientLight(0x404040, 2); // Soft light
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

// Add Ground Plane
const groundGeometry = new THREE.PlaneGeometry(50, 50);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2; // Rotate to lie flat
ground.position.y = -0.5;
scene.add(ground);

// Load the Car Model
const loader = new GLTFLoader();
let porsche;

loader.load(
    'assets/models/porsche/scene.gltf',
    (gltf) => {
        porsche = gltf.scene;
        porsche.scale.set(0.5, 0.5, 0.5);
        porsche.position.y = 0; // Ensure the car rests on the ground
        scene.add(porsche);

        // Initialize Car Controls
        carControls = new CarControls(porsche);
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    (error) => {
        console.error('An error occurred while loading the model:', error);
    }
);

// Car Controls Class
class CarControls {
    constructor(car) {
        this.car = car;
        this.velocity = new THREE.Vector3();
        this.acceleration = 0.005; // Adjust for acceleration speed
        this.maxSpeed = 0.2; // Adjust for max speed
        this.turnSpeed = 0.05; // Turning speed

        // Bind Key Events
        window.addEventListener('keydown', (event) => this.onKeyDown(event));
        window.addEventListener('keyup', (event) => this.onKeyUp(event));
    }

    onKeyDown(event) {
        switch (event.key) {
            case 'ArrowUp':
                this.velocity.z = Math.max(this.velocity.z - this.acceleration, -this.maxSpeed);
                break;
            case 'ArrowDown':
                this.velocity.z = Math.min(this.velocity.z + this.acceleration, this.maxSpeed);
                break;
            case 'ArrowLeft':
                this.car.rotation.y += this.turnSpeed; // Turn left
                break;
            case 'ArrowRight':
                this.car.rotation.y -= this.turnSpeed; // Turn right
                break;
        }
    }

    onKeyUp(event) {
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            this.velocity.z = 0; // Stop car when key is released
        }
    }

    update() {
        if (this.car) {
            // Move car based on velocity
            this.car.position.add(this.velocity.clone().applyQuaternion(this.car.quaternion));
        }
    }
}

let carControls;

// Animation Loop
function animate() {
    requestAnimationFrame(animate);

    // Update Car Controls
    if (carControls) {
        carControls.update();
    }

    // Update Orbit Controls
    controls.update();

    // Render Scene
    renderer.render(scene, camera);
}

animate();

// Adjust on Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
