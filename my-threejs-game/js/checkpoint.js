import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as CANNON from "cannon-es";

// Set up Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Set up Scene
const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.8, 0),
});
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

const groundBody = new CANNON.Body({
  shape: new CANNON.Plane(),
  quaternion: new CANNON.Quaternion().setFromEuler(-Math.PI / 2, 0, 0),
  position: new CANNON.Vec3(0, -10, 0),
});
//groundBody.quaternion.copy(groundMesh.quaternion);
world.addBody(groundBody);

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

const dummyBody = new CANNON.Body({
  mass: 1500,
  shape: new CANNON.Box(new CANNON.Vec3(1, 0.8, 2.2)),
  position: new CANNON.Vec3(
    dummyMesh.position.x,
    dummyMesh.position.y,
    dummyMesh.position.z
  ),
});
world.addBody(dummyBody);

// Load the Car Model
const loader = new GLTFLoader();
function createTrimesh(geometry) {
  const vertices = geometry.attributes.position.array;
  const indices = geometry.index
    ? geometry.index.array
    : Object.keys(vertices).map(Number);

  return new CANNON.Trimesh(vertices, indices);
}

function createVisualMeshFromBody(cannonBody) {
  let mesh;
  if (cannonBody.shapes[0] instanceof CANNON.Trimesh) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(cannonBody.shapes[0].vertices), 3));
    geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(cannonBody.shapes[0].indices), 1));
    mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x0000ff, wireframe: true }));
  }
  //mesh.quaternion.copy(cannonBody.quaternion);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y=cannonBody.position.y;
  return mesh;
}


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
    track.traverse((child) => {
      if (child.isMesh) {
        const geometry = child.geometry;
        const shape = createTrimesh(geometry);

        track_body = new CANNON.Body({
          mass: 0,
          shape: shape,
          position: new CANNON.Vec3(
            track.position.x,
            track.position.y,
            track.position.z
          ),
          quaternion: new CANNON.Quaternion().copy(track.quaternion),
          //quaternion: new CANNON.Quaternion().setFromEuler(-Math.PI / 2, 0, 0)
        });

        world.addBody(track_body);
        const visualMesh = createVisualMeshFromBody(track_body);
        if (visualMesh) {
          scene.add(visualMesh);
          track_body.visualMesh = visualMesh; // Save reference to visual mesh
        }
        
      }
    });
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
    //this.velocity = new THREE.Vector3(0,0,0);
    this.z = 0;
    this.acceleration = 20; // Adjust for acceleration speed
    this.deceleration = 0.5;
    this.maxSpeed = 60;
    this.turnSpeed = 0.6;
    this.left = false;
    this.forward = false;
    this.right = false;
    this.backward = false;
    this.decelerating_f = false;
    this.decelerating_b = false;
    this.velocity = new THREE.Vector3();
    // Bind Key Events
    window.addEventListener("keydown", (event) => this.onKeyDown(event));
    window.addEventListener("keyup", (event) => this.onKeyUp(event));
    const shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.4, 1.1));
    this.body = new CANNON.Body({
      mass: 150,
      position: new CANNON.Vec3(
        this.car.position.x,
        this.car.position.y,
        this.car.position.z
      ),
      shape: shape,
      fixedRotation: true,
      linearDamping: 0.1,
      material: new CANNON.Material({ friction: 0.6 }),
      collisionFilterGroup: 2,
      collisionFilterMask: 1 | 4,
    });
    this.body.addShape(shape);
    //this.body.position.set(0, 0, 0);
    //this.body.angularDamping = 0.5;
    world.addBody(this.body);
  }

  onKeyDown(event) {
    if (event.key === "ArrowUp") {
      //console.log("up pressed");
      this.forward = true;
      this.backward = false;
    } else if (event.key === "ArrowDown") {
      //console.log("down pressed");
      this.backward = true;
      this.forward = false;
    } else if (event.key === "ArrowLeft") {
      //console.log("left pressed");
      this.left = true;
      this.right = false;
    } else if (event.key === "ArrowRight") {
      //console.log("right pressed");
      this.right = true;
      this.left = false;
    } else if (event.key === "c") {
      camera_toggle = !camera_toggle;
      if (!camera_toggle) {
        camera.position.set(0, 2, 5);
      }
    } else if (event.key === "r") {
      this.body.position = new CANNON.Vec3(36, 0, 24);
    }
  }

  onKeyUp(event) {
    if (event.key === "ArrowUp") {
      this.forward = false;
    }
    if (event.key === "ArrowDown") {
      this.backward = false;
    }
    if (event.key === "ArrowLeft") {
      //this.car.rotation.set(0, 0, 0);
      this.left = false;
      this.body.angularVelocity.y = 0;
      //this.right=false;
    }
    if (event.key === "ArrowRight") {
      //this.car.rotation.set(0, 0, 0);
      //this.left=false;
      this.right = false;
      this.body.angularVelocity.y = 0;
    }
  }

  update() {
    if (this.body) {
      //let forwardVector=new CANNON.Vec3(0,0,1);
      const backwardVector = new CANNON.Vec3(0, 0, -1);
      //let worldForwardVector=this.body.quaternion.vmult(forwardVector);
      const forwardVector = new CANNON.Vec3(0, 0, 1);
      let worldForwardVector = this.body.quaternion.vmult(forwardVector);
      worldForwardVector=worldForwardVector.scale(this.acceleration)
      if (this.forward) {
          if (this.body.velocity.length() < 1000) {
            console.log("Force before");
              //console.log(worldForwardVector.scale(this.acceleration));
              console.log(worldForwardVector);
              console.log("Velocity before");
              console.log(this.body.velocity);
              console.log("Position before");
              console.log(this.body.position);
              //this.body.applyLocalForce(worldForwardVector.scale(this.acceleration), this.body.position);
              this.body.velocity.x=this.body.velocity.x+worldForwardVector.x;
              this.body.velocity.y=this.body.velocity.y+worldForwardVector.y;
              this.body.velocity.z=this.body.velocity.z+worldForwardVector.z;
              console.log("Force");
              //console.log(worldForwardVector.scale(this.acceleration));
              console.log(worldForwardVector);
              console.log("Velocity");
              console.log(this.body.velocity);
              console.log("Position");
              console.log(this.body.position);
          }
          this.body.angularVelocity.y = this.left ? this.turnSpeed : this.right ? -this.turnSpeed : 0;
          // console.log("Force");
          // console.log(worldForwardVector.scale(this.acceleration));
          // console.log("Velocity");
          // console.log(this.body.velocity);
          // console.log("Position");
          // console.log(this.body.position);
          
      }

      if (this.backward) {
          if (this.body.velocity.length() < this.maxSpeed) {
              this.body.applyLocalForce(worldForwardVector.negate().scale(this.acceleration), this.body.position);
          }
          this.body.angularVelocity.y = this.left ? -this.turnSpeed : this.right ? this.turnSpeed : 0;
      }
      if (!this.forward && !this.backward) {
        this.body.velocity.scale(1 - this.deceleration); // Smooth deceleration
        if (Math.abs(this.body.velocity.length()) < 0.01) {
            this.body.velocity.set(0, 0, 0); // Stop the car when it’s nearly stopped
        }
        this.body.angularVelocity.y = this.left ? this.turnSpeed : this.right ? -this.turnSpeed : 0;
    }
      // console.log("============================");
      // console.log(this.body.position);
      // console.log(this.body.velocity);
      // console.log(this.body.quaternion);
      // console.log("++++++++++++++++++++++++++++");
      //this.body.position.add(this.body.velocity.clone().applyQuaternion(this.body.quaternion));
      // this.car.position.clone(this.body.position);
      // this.car.quaternion.copy(this.body.quaternion);
    }
    //console.log("way after")
    //console.log(this.body.velocity);
    this.car.position.copy(this.body.position);
    this.car.quaternion.copy(this.body.quaternion);
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
  world.step(timeStep);
  groundMesh.position.copy(groundBody.position);
  groundMesh.quaternion.copy(groundBody.quaternion);
  dummyMesh.position.copy(dummyBody.position);
  dummyMesh.quaternion.copy(dummyBody.quaternion);
  if (track) {
    track.position.copy(track_body.position);
    track.quaternion.copy(track_body.quaternion);
  }
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
