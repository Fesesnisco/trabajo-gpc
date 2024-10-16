
  let planet = new THREE.Mesh(
    new THREE.IcosahedronGeometry(100, 10),
    new THREE.MeshBasicMaterial({
      onBeforeCompile: (shader) => {
        shader.vertexShader = `
          varying vec3 vPos;
          ${shader.vertexShader}
        `.replace(
          `#include <begin_vertex>`,
          `#include <begin_vertex>
            vPos = position;
          `
        );
        //console.log(shader.vertexShader);
        shader.fragmentShader = `
          varying vec3 vPos;
          ${noise}
          ${shader.fragmentShader}
        `.replace(
          `vec4 diffuseColor = vec4( diffuse, opacity );`,
          `
          float noise = cnoise(normalize(vPos) * vec3(1, 5., 1.) * 2.);
          vec3 color1 = vec3(0.4196078431372549, 0.5764705882352941, 0.8392156862745098);
          vec3 color2 = vec3(0.9137254901960784, 0.9372549019607843, 0.9764705882352941);
          vec3 color3 = vec3(0.6235294117647059, 0.7568627450980392, 0.39215686274509803);

          vec4 diffuseColor;
          if (noise > 0.2)
              diffuseColor = vec4( color1, opacity );
          else if (noise > -0.0)
              diffuseColor = vec4( color2, opacity );
          else
              diffuseColor = vec4( color3, opacity );`

          //float a = max(0.0, noise);
          //vec3 color1 = vec3(0, 1, 0);
          //float b = max(0.0, -noise);
          //vec3 color2 = vec3(0, 0, 1);
          //vec3 mezcla_color = (a * color1) + (b * color2);
          //
          //vec4 diffuseColor = vec4( mezcla_color, opacity );`
        );
        console.log(shader.fragmentShader);
      }
    })
  );
  scene.add(planet);
  planet.position.x += 200
