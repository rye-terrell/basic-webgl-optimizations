import createRegl from "regl";
import { mat4, vec3 } from "gl-matrix";

const count = 25000;
const radius = 1;
const size = 0.01;

const instancePositions = [
    Math.cos((0 * 2 * Math.PI + 0.5 * Math.PI) / 3),
    Math.sin((0 * 2 * Math.PI + 0.5 * Math.PI) / 3),
    0,
    Math.cos((1 * 2 * Math.PI + 0.5 * Math.PI) / 3),
    Math.sin((1 * 2 * Math.PI + 0.5 * Math.PI) / 3),
    0,
    Math.cos((2 * 2 * Math.PI + 0.5 * Math.PI) / 3),
    Math.sin((2 * 2 * Math.PI + 0.5 * Math.PI) / 3),
    0,
];

async function main() {
    const target = vec3.create();
    const targetPosition = vec3.random(vec3.create());

    const offsets = [];
    const velocities = [];
    const colors = [];

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
        const red = Math.random();
        const green = Math.random();
        const blue = Math.random() * 0.5 + 0.5;
        offsets.push(p0);
        velocities.push([
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5,
        ]);
        colors.push([red, green, blue], [red, green, blue], [red, green, blue]);
        total++;
    }

    const regl = createRegl({
        extensions: ["angle_instanced_arrays"],
    });

    const positionBuffer = regl.buffer(offsets);

    const render = regl({
        vert: `
      precision highp float;
      attribute vec3 offset;
      attribute vec3 position, color;
      uniform mat4 view, projection;
      uniform vec3 target;
      uniform bool flip;
      varying vec3 vColor;
  
      void main() {
        vec3 flipper = flip ? vec3(1, -1, 1) : vec3(1, 1, 1);
        gl_Position = projection * view * vec4(position * flipper * ${size} + offset, 1);
        vColor = mix(vec3(1,0.5,0.01), vec3(0,0.25,0.5), clamp(length(offset - target) * 1.5, 0.0, 1.0));
      }
    `,
        frag: `
      precision highp float;
      varying vec3 vColor;
  
      void main() {
        gl_FragColor = vec4(vColor, 0.5);
      }
    `,
        attributes: {
            position: instancePositions,
            offset: { buffer: positionBuffer, divisor: 1 },
            color: { buffer: colors, divisor: 1 },
        },
        uniforms: {
            target: regl.prop("target"),
            flip: regl.prop("flip"),
            view: regl.prop("view"),
            projection: regl.prop("projection"),
        },
        viewport: regl.prop("viewport"),
        count: instancePositions.length,
        instances: count,
        blend: {
            enable: true,
            func: {
                src: "src alpha",
                dst: "dst alpha",
            },
        },
        depth: {
            enable: false,
        },
    });

    const canvas = document.getElementsByTagName("canvas")[0];

    let animating = false;
    let initialized = false;
    canvas.addEventListener("mouseenter", () => {
        animating = true;
    });
    canvas.addEventListener("mouseleave", () => {
        animating = false;
    });

    let lastTime = performance.now();

    const tempVec1 = vec3.create();

    let flip = false;
    function renderLoop() {
        const currentTime = performance.now();
        const dt = (currentTime - lastTime) * 0.001;
        lastTime = currentTime;
        requestAnimationFrame(renderLoop);
        if (!animating && initialized) {
            return;
        }
        initialized = true;
        flip = !flip;

        if (Math.random() < 1 / 600) {
            target[0] = Math.random() * 2 * radius - radius;
            target[1] = Math.random() * 2 * radius - radius;
            target[2] = Math.random() * 2 * radius - radius;
        }

        vec3.scaleAndAdd(
            targetPosition,
            targetPosition,
            vec3.sub([], target, targetPosition),
            0.05
        );

        for (let i = 0; i < count; i++) {
            const offset = offsets[i];
            const velocity = velocities[i];
            const delta = vec3.sub(tempVec1, targetPosition, offset);
            vec3.normalize(delta, delta);
            vec3.scaleAndAdd(velocity, velocity, delta, dt);
            if (vec3.length(velocity) > 1) {
                vec3.normalize(velocity, velocity);
                vec3.scale(velocity, velocity, 1);
            }
            vec3.scaleAndAdd(offset, offset, velocity, dt);
        }

        positionBuffer(offsets);

        regl.clear({ color: [0, 0, 0, 1], depth: 1 });
        const view = mat4.lookAt([], [0, 0, 3], [0, 0, 0], [0, 1, 0]);
        const projection = mat4.perspective(
            [],
            Math.PI / 3,
            canvas.width / canvas.height,
            0.1,
            100
        );
        const viewport = {
            x: 0,
            y: 0,
            width: canvas.width,
            height: canvas.height,
        };
        render({
            target: targetPosition,
            flip,
            view,
            projection,
            viewport,
        });
    }

    renderLoop();
}

main();
