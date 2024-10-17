var loader;
var renderer, scene;
var camera, camera_global;
var nave, base;
var PLANETAS = [];
var camera_global_controls;
var angulo = -0.01;
var a = 0;

var controls = {
  gravedad: true,
  camara_global_activa: false,
  //color: "#ffffff", // valor inicial para el color
  //opcion_si_no: false, // valor booleano
};

// interface de usuario
var gui = new dat.GUI();
// Carpeta Tamaño
var gui_size = gui.addFolder('Pruebas');
gui_size.add(controls, 'gravedad').name("Gravedad");
gui_size.add(controls, 'camara_global_activa').name("Camara global");
gui_size.open();
// Carpeta Orientación

const clock = new THREE.Clock();
const debug = false;

class Nave extends THREE.Object3D {
  constructor() {
    super();

    var aspectRatio = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera( 50, aspectRatio , 1, 100000 );
    camera.initial_position = new THREE.Vector3 (0, 2, 7);
    camera.position.set(camera.initial_position.x, camera.initial_position.y, camera.initial_position.z);
    this.add(camera);
    this.camera = camera;

    this.up.set(0, 0, -1);
    this.max_velocidad = 5;
    this.min_velocidad = 0;
    this.velocidad = 0;
    this.aceleracion = 0.02;
    this.acelerando = false;
    this.frenando = false;

    this.velocidad_rotacion = 0.01;
    this.rotandoY = 0;
    this.maxY = 0.001 * window.innerHeight + camera.initial_position.y;
    this.rotandoX = 0;
    this.maxX = 0.001 * window.innerWidth + camera.initial_position.x;;

    this.masa = 2;
    this.sin_carga = true;

    this.posicion_inicial = new THREE.Vector3(0, 100, 1000);
  }

  rotarY() {
    this.rotateY(this.velocidad_rotacion * this.rotandoY);
    this.camera.position.x -= 0.1 * this.rotandoY;
    this.camera.position.x = Math.min(this.camera.position.x, this.maxX);
    this.camera.position.x = Math.max(this.camera.position.x, -this.maxX);

    if (this.rotandoY == 0 && Math.abs(this.camera.position.x - this.camera.initial_position.x) > 0.1) {
      let signo = this.camera.position.x > this.camera.initial_position.x;
      this.camera.position.x += 0.1 * (1 - (2 * signo));
    }
  }

  rotarX() {
    this.rotateX(this.velocidad_rotacion * this.rotandoX);
    this.camera.position.y += 0.1 * this.rotandoX;
    this.camera.position.y = Math.min(this.camera.position.y, this.maxY);
    this.camera.position.y = Math.max(this.camera.position.y, -this.maxY);

    if (this.rotandoX == 0 && Math.abs(this.camera.position.y - this.camera.initial_position.y) > 0.1) {
      let signo = this.camera.position.y > this.camera.initial_position.y;
      this.camera.position.y += 0.1 * (1 - (2 * signo));
    }
  }

  update() {
    this.translateOnAxis(this.up, this.velocidad);

    if (this.acelerando) {
      this.velocidad += this.aceleracion;
      this.velocidad = Math.min(this.velocidad, this.max_velocidad);
    } else if (this.frenando) {
      this.velocidad -= this.aceleracion;
      this.velocidad = Math.max(this.velocidad, this.min_velocidad);
    }

    this.rotarX();
    this.rotarY();

    this.camera.position.z = this.camera.initial_position.z + this.velocidad;

    if (controls.gravedad) {
      let fuerzas = new THREE.Vector3 (0, 0, 0);
      PLANETAS.forEach(planeta => {
        fuerzas = fuerzas.add(atraccion(planeta, this));
      });

      this.translateOnAxis(fuerzas.normalize(), -fuerzas.length());
    }

    let target = new THREE.Vector3();
    PLANETAS.forEach(planeta => {
      planeta.getWorldPosition(target)
      let distancia = this.position.distanceTo(target);
      if (distancia < planeta.radio + 20) {
        console.log('toca')
        this.position.set(this.posicion_inicial.x, this.posicion_inicial.y, this.posicion_inicial.z);
        this.velocidad = 0;
      }
    })
  }
}

class Base extends THREE.Mesh {
  constructor () {
    let geometria = new THREE.BoxGeometry(100, 50, 50);
    let material = new THREE.MeshNormalMaterial();    
    super(geometria, material);

    scene.add(this);
    this.position.set(0, 0, 350);
  }
}

class Paquete extends THREE.Mesh {
  constructor () {
    let geometria = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    let material = new THREE.MeshNormalMaterial();    
    super(geometria, material);
  }
}

class Planeta extends THREE.Object3D {
  constructor (radio, masa, radio_traslacion, velocidad_traslacion, velocidad_rotacion, base = false) {
    let geometria;

    if (base) {
      geometria = new THREE.BoxGeometry(100, 50, 50);
    } else {
      geometria = new THREE.SphereGeometry(radio, 32, 16);
    }

    //let material = new THREE.MeshStandardMaterial({'color' : new THREE.Color(0,255,0),
    //roughness: 0.5,
    //metalness: 0.5});    
    let material = new THREE.MeshNormalMaterial();    
    super();
    //super(geometria, material);

    this.masa = masa;
    this.radio = radio;
    this.centro = new THREE.Object3D();
    this.centro.add(this);
    this.velocidad_traslacion = velocidad_traslacion;
    this.velocidad_rotacion = velocidad_rotacion;
    
    scene.add(this.centro);
    this.position.set(0, 0, radio_traslacion);
  }
}

class Target extends THREE.Mesh {
  constructor() {
    let geometria = new THREE.Cylinder(50, 50, 100)
    let material = new THREE.MeshNormalMaterial();    
    super(geometria, material);
  }
}

init();
render();


function init()
{
  renderer = new THREE.WebGLRenderer();
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setClearColor( new THREE.Color(0xFFFFFF) );
  document.getElementById('container').appendChild( renderer.domElement );

  scene = new THREE.Scene();

  const width = window.innerWidth;
  const height = window.innerHeight;
  camera_global = new THREE.OrthographicCamera( 1 * width / - 2, 1 * width / 2, 1 * height / 2, 1 * height / - 2, 0.1, 10000000 );
  camera_global.lookAt( new THREE.Vector3( 0,0,0 ) );
  camera_global.position.set(0, 250, 250);

  camera_global_controls = new THREE.OrbitControls( camera_global, renderer.domElement );
  camera_global_controls.target.set( 0, 0, 0 );

  loadScene();

  //const light = new THREE.PointLight(0xffffff, 1, 100);
  //light.position.set(50, 50, 50);
  //scene.add(light);
  
  // O también una luz ambiental para afectar a todos los objetos de manera uniforme
  const ambientLight = new THREE.AmbientLight(0xffffff, 1);
  scene.add(ambientLight);
  
  const luz = new THREE.PointLight( 0xaaaa00, 4, 0 , 0.1);
  // const luz = new THREE.PointLight( 0xff2f00, 20, 0 , 0.1);
  luz.castShadow = true;
  luz.position.y = 100;
  luz.position.set( 50, 50, 50 );
  scene.add(luz);


  window.addEventListener('resize', updateAspectRatio );
}

function loadScene()
{
  let planeta = new Planeta(radio=300, masa=10**13, radio_traslacion=0, velocidad_traslacion=0, velocidad_rotacion=0.001);
  PLANETAS.push(planeta);
  let loader = new THREE.GLTFLoader();
    loader.load('models/planetas/sol.glb', function (object) {
      // Callback que se llama al finalizar la carga
      object.scene.rotateY(Math.PI);
      object.scene.scale.multiplyScalar(100);
      PLANETAS[0].add(object.scene);
      object.scene.position.set(0, 0, 0);
    }, undefined, function (error) {
      console.error(error);
    });

  PLANETAS.push(new Planeta(radio=50, masa=10**10, radio_traslacion=750, velocidad_traslacion=0.002, velocidad_rotacion=0.002));
  loader = new THREE.GLTFLoader();
    loader.load('models/planetas/lava.glb', function (object) {
      // Callback que se llama al finalizar la carga
      object.scene.rotateY(Math.PI);
      object.scene.scale.multiplyScalar(25);
      PLANETAS[1].add(object.scene);
      object.scene.position.set(0, 0, 0);
      object.scene.material = new THREE.MeshStandardMaterial ({roughness: 0.5, metalness: 0.5});
      object.scene.castShadow = true;
    }, undefined, function (error) {
      console.error(error);
    });

  PLANETAS.push(new Planeta(radio=75, masa=10**10, radio_traslacion=1000, velocidad_traslacion=0.001, velocidad_rotacion=0.006));
  loader = new THREE.GLTFLoader();
    loader.load('models/planetas/marron.glb', function (object) {
      // Callback que se llama al finalizar la carga
      object.scene.rotateY(Math.PI);
      object.scene.scale.multiplyScalar(30);
      PLANETAS[2].add(object.scene);
      object.scene.position.set(0, 0, 0);
      object.scene.castShadow = true;
    }, undefined, function (error) {
      console.error(error);
    });

  PLANETAS[0].name = '0';
  PLANETAS[1].name = '1';
  PLANETAS[2].name = '2';

  //base = new Base();
  base = new Planeta(radio=0, masa=1, radio_traslacion=350, velocidad_traslacion=-0.002, velocidad_rotacion=0, base=true);
  PLANETAS.push(base);

  nave = new Nave();
  nave.position.set(0, 100, 1000);
  loader = new THREE.GLTFLoader();
    loader.load('models/spaceship/stylised_spaceship.glb', function (object) {
      // Callback que se llama al finalizar la carga
      object.scene.rotateY(Math.PI);
      object.scene.scale.multiplyScalar(0.2);
      nave.add(object.scene);
      object.scene.position.set(0, 0, 0);
      object.scene.receiveShadow = true;
    }, undefined, function (error) {
      console.error(error);
    });

  loader = new THREE.CubeTextureLoader();
  loader.setPath( 'images/skybox/' );
  let textureCube = loader.load( [ 'right.png', 'left.png', 'top.png', 'bottom.png', 'front.png', 'back.png' ] );
  // let textureCube = loader.load( [  'left.png','right.png', 'bottom.png','top.png',  'front.png', 'back.png',] );
  // let material = new THREE.MeshBasicMaterial( { color: 0xffffff, envMap: textureCube, side: THREE.BackSide } );
  // let geometriaCielo = new THREE.BoxGeometry(2000, 2000, 2000);
  // let cielo = new THREE.Mesh(geometriaCielo, material);
  // scene.add(cielo);
  scene.background = textureCube;

  document.addEventListener('keydown', function(event) {
    switch (event.key) {
      case ' ':
        nave.acelerando = true;
        break;
      case 'Shift':
        nave.frenando = true;
        break;
      case 'w':
        nave.rotandoX = 1;
        break;
      case 's':
        nave.rotandoX = -1;
        break;
      case 'a':
        nave.rotandoY = 1;
        break;
      case 'd':
        nave.rotandoY = -1;
        break;
      default:
        break;
    };
  });

  document.addEventListener('keyup', function(event) {
    switch (event.key) {
      case ' ':
        nave.acelerando = false;
        break;
      case 'Shift':
        nave.frenando = false;
        break;
      case 'w':
        nave.rotandoX = 0;
        break;
      case 's':
        nave.rotandoX = 0;
        break;
      case 'a':
        nave.rotandoY = 0;
        break;
      case 'd':
        nave.rotandoY = 0;
        break;
      default:
        break;
    };
  });
  scene.add(nave);
}

function updateAspectRatio()
{
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

function atraccion(cuerpo1, cuerpo2)
{
  let salida = cuerpo2.position.clone();
  let G = 6.67 * (10 ** (-11));
  let distancia = salida.sub(cuerpo1.position);
  let fuerza = (G * cuerpo1.masa * cuerpo2.masa) / (distancia.length()**2);
  return distancia.normalize().multiplyScalar(fuerza);
}

function update()
{
  nave.update();

  if (nave.sin_carga && nave.position.distanceTo(base.position) < 200) {
    nave.sin_carga = false;
    let paquete = new Paquete();
    nave.add(paquete);
    paquete.position.set(0, 0, 2);
  }

  PLANETAS.forEach(planeta => {
    planeta.centro.rotateY(planeta.velocidad_traslacion);
    planeta.rotateY(planeta.velocidad_rotacion);
  });
}

function render()
{
	requestAnimationFrame( render );
	update();
  if (controls.camara_global_activa){
    renderer.render( scene, camera_global );
  } else {
    renderer.render( scene, camera );
  }
}

