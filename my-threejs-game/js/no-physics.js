import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";


// Set up Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Set up Scene
const timeStep = 1 / 60;
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
//camera.lookAt(-36,0,-24)

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
const groundMaterial = new THREE.MeshStandardMaterial({
  color: 0x808080,
});
const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
//groundMesh.rotation.x = -Math.PI / 2; // Rotate to lie flat
groundMesh.position.y = 0;
scene.add(groundMesh);

const dummyGeo = new THREE.BoxGeometry(1, 0.8, 2.2);
const dummyMat = new THREE.MeshBasicMaterial({
  color: 0xff0000,
  wireframe: true,
});
const dummyMesh = new THREE.Mesh(dummyGeo, dummyMat);
dummyMesh.position.x = 10;
dummyMesh.position.y = 10;
dummyMesh.position.z = 10;
scene.add(dummyMesh);

// Load the Car Model
const loader = new GLTFLoader();

var track;
var track_body;
loader.load(
  "assets/models/race_track1/scene.gltf",
  (gltf) => {
    track = gltf.scene;
    track.scale.set(0.5, 0.5, 0.5);
    track.position.y = -10;
    //track.rotation.z = -Math.PI / 2;
    scene.add(track);
    
  },
  (xhr) => {
    console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
  },
  (error) => {
    console.error("An error occurred while loading the model:", error);
  }
);

let porsche;
loader.load(
  "assets/models/porsche/scene.gltf",
  (gltf) => {
    porsche = gltf.scene;
    porsche.scale.set(0.5, 0.5, 0.5);
    porsche.position.x = 36;
    porsche.position.y = 0;
    porsche.position.z = 24;
    //new CANNON.Vec3(36,0,24)
    scene.add(porsche);

    // Initialize Car Controls
    carControls = new CarControls(porsche);
  },
  (xhr) => {
    console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
  },
  (error) => {
    console.error("An error occurred while loading the model:", error);
  }
);

// Car Controls Class
var camera_toggle = false;
class CarControls {
  constructor(car) {
      this.car = car;
      this.velocity = new THREE.Vector3();
      this.acceleration = 0.005; // Adjust for acceleration speed
      this.deceleration = 0.001;
      this.maxSpeed = 0.15; // Adjust for max speed
      this.turnSpeed = 0.03; // Turning speed
      this.forward=false;
      this.backward=false;
      this.left=false;
      this.right=false;

      // Bind Key Events
      window.addEventListener('keydown', (event) => this.onKeyDown(event));
      window.addEventListener('keyup', (event) => this.onKeyUp(event));
  }

  onKeyDown(event) {
      
      if (event.key === 'ArrowUp') {
          //console.log("up pressed");
          this.forward=true;
          this.backward=false;
      } 
      else if (event.key === 'ArrowDown') {
          //console.log("down pressed");
          this.backward=true;
          this.forward=false;
      }
      else if (event.key === 'ArrowLeft') {
          //console.log("left pressed");
          this.left=true; // Turn left
          this.right=false;
      } 
      else if (event.key === 'ArrowRight') {
          //console.log("right pressed");
          this.right=true; // Turn right
          this.left=false;
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
          this.forward=false;
          
      } 
      if (event.key === 'ArrowDown') {
          this.backward=false;
      }
      if (event.key==="ArrowLeft"||event.key==="ArrowRight"){
          //this.car.rotation.set(0, 0, 0);
          this.left=false;
          this.right=false;
      }
  }

  update() {
      if (this.car) {
          // Move car based on velocity
          if (this.forward){
              //this.velocity.z = Math.min(this.velocity.z + this.acceleration, this.maxSpeed);
              this.velocity.z = this.velocity.z + this.acceleration;
              if (this.left){
                  this.car.rotation.y += this.turnSpeed;
                  //camera.rotation.y+=this.turnSpeed;
              }
              if(this.right){
                  this.car.rotation.y -= this.turnSpeed;
                  //camera.rotation.y-=this.turnSpeed;
              }
          }
          if (this.backward){
              //this.velocity.z = Math.max(this.velocity.z - this.acceleration, -this.maxSpeed);
              this.velocity.z = this.velocity.z - this.acceleration;
              if (this.left){
                  this.car.rotation.y -= this.turnSpeed;
                  //camera.rotation.y-=this.turnSpeed;
              }
              if(this.right){
                  this.car.rotation.y += this.turnSpeed;
                  //camera.rotation.y+=this.turnSpeed;
              }
          }
          if (!this.forward&&!this.backward){
              //this.velocity.set(0,0,0);
              if (Math.abs(this.velocity.z) < 0.001) {
                  this.velocity.z = 0;
              }
              if(this.velocity.z>0){
                  this.velocity.z-=this.deceleration;
                  if (this.left){
                      this.car.rotation.y += this.turnSpeed;
                      //camera.rotation.y+=this.turnSpeed;
                  }
                  if(this.right){
                      this.car.rotation.y -= this.turnSpeed;
                      //camera.rotation.y-=this.turnSpeed;
                  }
              }
              if(this.velocity.z<0){
                  this.velocity.z+=this.deceleration;
                  if (this.left){
                      this.car.rotation.y -= this.turnSpeed;
                      //camera.rotation.y-=this.turnSpeed;
                  }
                  if(this.right){
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

// const carBody=new CANNON.Body({
//     mass:1500,
//     shape:new CANNON.Box(new CANNON.Vec3(1,1,2))
// });
// world.addBody(carBody);
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
  if (camera_toggle) {
    updateCameraPosition();
  } else {
    controls.update();
  }
  if (carControls) {
    //console.log(carControls.body.position);
    carControls.update();
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
