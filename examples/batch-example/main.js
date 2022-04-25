import createRegl from "regl";
import Trackball from "trackball-controller";
import { mat4, vec3 } from "gl-matrix";

const count = 20000;
const radius = 1;
const size = 0.03;

async function main() {
    const positions = [];
    const colors = [];
    const bary = [];

    let total = 0;
    while (total < count) {
        const p0 = [
            Math.random() * 2 * radius - radius,
            Math.random() * 2 * radius - radius,
            Math.random() * 2 * radius - radius,
        ];
        if (vec3.length(p0) > radius) {
            continue;
        }
        const p1 = vec3.add([], p0, vec3.random([], size));
        const p2 = vec3.add([], p0, vec3.random([], size));
        const p3 = vec3.add([], p0, vec3.random([], size));
        const red = Math.random();
        const green = Math.random();
        const blue = Math.random() * 0.5 + 0.5;
        positions.push(p1, p2, p3);
        colors.push([red, green, blue], [red, green, blue], [red, green, blue]);
        bary.push([0, 0, 1], [0, 1, 0], [1, 0, 0]);
        total++;
    }

    const regl = createRegl({
        extensions: ["OES_element_index_uint"],
    });

    const render = regl({
        vert: `
      precision highp float;
      attribute vec3 position, color, bary;
      uniform mat4 model, view, projection;
      varying vec3 vColor, vBary, vPos;
  
      void main() {
        gl_Position = projection * view * model * vec4(position, 1);
        vColor = color;
        vBary = bary;
        vPos = gl_Position.xyz;
      }
    `,
        frag: `
      precision highp float;
      varying vec3 vNormal, vColor, vBary, vPos;
  
      void main() {
        float b = pow(1.0 - min(vBary.x, min(vBary.y, vBary.z)), 4.0);
        gl_FragColor = vec4(0.5 * b * vColor, b);
      }
    `,
        attributes: {
            position: positions,
            color: colors,
            bary,
        },
        uniforms: {
            model: regl.prop("model"),
            view: regl.prop("view"),
            projection: regl.prop("projection"),
        },
        viewport: regl.prop("viewport"),
        count: positions.length,
        blend: {
            enable: true,
            func: {
                src: "one",
                dst: "one",
            },
        },
        depth: {
            enable: false,
        },
    });

    const canvas = document.getElementsByTagName("canvas")[0];

    var trackball = new Trackball(canvas, {
        onRotate: renderLoop,
        drag: 0.0,
    });
    trackball.spin(1.0, 0);

    let animating = false;
    let initialized = false;
    canvas.addEventListener("mouseenter", () => {
        animating = true;
    });
    canvas.addEventListener("mouseleave", () => {
        animating = false;
    });

    function renderLoop() {
        if (!animating && initialized) {
            return;
        }
        initialized = true;
        regl.clear({ color: [0, 0, 0, 1], depth: 1 });
        const view = mat4.lookAt([], [0, 0, 3], [0, 0, 0], [0, 1, 0]);
        const projection = mat4.perspective(
            [],
            Math.PI / 4,
            canvas.width / canvas.height,
            1,
            100
        );
        const viewport = {
            x: 0,
            y: 0,
            width: canvas.width,
            height: canvas.height,
        };
        render({
            model: trackball.rotation,
            view,
            projection,
            viewport,
        });
    }
    requestAnimationFrame(renderLoop);
}

main();
