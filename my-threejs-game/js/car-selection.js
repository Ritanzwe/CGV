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
var left=false;
var forward=false;
var right=false;
var backward=false;
var camera_toggle=false;
class CarControls {
    constructor(car) {
        this.car = car;
        this.velocity = new THREE.Vector3();
        this.acceleration = 0.005; // Adjust for acceleration speed
        this.deceleration = 0.001;
        this.maxSpeed = 0.15; // Adjust for max speed
        this.turnSpeed = 0.03; // Turning speed

        // Bind Key Events
        window.addEventListener('keydown', (event) => this.onKeyDown(event));
        window.addEventListener('keyup', (event) => this.onKeyUp(event));
    }

    onKeyDown(event) {
        
        if (event.key === 'ArrowUp') {
            //console.log("up pressed");
            forward=true;
            backward=false;
        } 
        else if (event.key === 'ArrowDown') {
            //console.log("down pressed");
            backward=true;
            forward=false;
        }
        else if (event.key === 'ArrowLeft') {
            //console.log("left pressed");
            left=true; // Turn left
            right=false;
        } 
        else if (event.key === 'ArrowRight') {
            //console.log("right pressed");
            right=true; // Turn right
            left=false;
        }
        else if(event.key==="c"){
            camera_toggle=!camera_toggle;
            if (!camera_toggle){
                camera.position.set(0,2,5);
            }
        }
        
    }

    onKeyUp(event) {
        if (event.key === 'ArrowUp'){
            forward=false;
            
        } 
        if (event.key === 'ArrowDown') {
            backward=false;
        }
        if (event.key==="ArrowLeft"||event.key==="ArrowRight"){
            //this.car.rotation.set(0, 0, 0);
            left=false;
            right=false;
        }
    }

    update() {
        if (this.car) {
            // Move car based on velocity
            if (forward){
                this.velocity.z = Math.min(this.velocity.z + this.acceleration, this.maxSpeed);
                if (left){
                    this.car.rotation.y += this.turnSpeed;
                    //camera.rotation.y+=this.turnSpeed;
                }
                if(right){
                    this.car.rotation.y -= this.turnSpeed;
                    //camera.rotation.y-=this.turnSpeed;
                }
            }
            if (backward){
                this.velocity.z = Math.max(this.velocity.z - this.acceleration, -this.maxSpeed);
                if (left){
                    this.car.rotation.y -= this.turnSpeed;
                    //camera.rotation.y-=this.turnSpeed;
                }
                if(right){
                    this.car.rotation.y += this.turnSpeed;
                    //camera.rotation.y+=this.turnSpeed;
                }
            }
            if (!forward&&!backward){
                //this.velocity.set(0,0,0);
                if (Math.abs(this.velocity.z) < 0.001) {
                    this.velocity.z = 0;
                }
                if(this.velocity.z>0){
                    this.velocity.z-=this.deceleration;
                    if (left){
                        this.car.rotation.y += this.turnSpeed;
                        //camera.rotation.y+=this.turnSpeed;
                    }
                    if(right){
                        this.car.rotation.y -= this.turnSpeed;
                        //camera.rotation.y-=this.turnSpeed;
                    }
                }
                if(this.velocity.z<0){
                    this.velocity.z+=this.deceleration;
                    if (left){
                        this.car.rotation.y -= this.turnSpeed;
                        //camera.rotation.y-=this.turnSpeed;
                    }
                    if(right){
                        this.car.rotation.y += this.turnSpeed;
                        //camera.rotation.y+=this.turnSpeed;
                    }
                }
            }
            this.car.position.add(this.velocity.clone().applyQuaternion(this.car.quaternion));
        }
    }
}

let carControls;

function updateCameraPosition() {
    // Define the offset from the car's local space (e.g., behind and slightly above)
    const offset = new THREE.Vector3(0, 2, -5); // Adjust to place camera behind and above car

    // Get the car's world position (including x, y, z coordinates)
    const carPosition = carControls.car.position.clone();  // Full car position

    // Apply car's rotation (quaternion) to the offset to place the camera relative to the car's orientation
    const carQuaternion = carControls.car.quaternion.clone();
    const cameraPosition = offset.applyQuaternion(carQuaternion).add(carPosition);

    // Move the camera smoothly to the new position
    camera.position.lerp(cameraPosition, 0.1);
    //console.log(carPosition);
    // Make the camera look at the exact position of the car
    camera.lookAt(carPosition);
}

// Animation Loop
function animate() {
    requestAnimationFrame(animate);

    // Update Car Controls
    if (camera_toggle){
        updateCameraPosition();
    }
    else{
        controls.update();
    }
    if (carControls) {
        carControls.update();
    }
    

    // Update Orbit Controls
    

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
