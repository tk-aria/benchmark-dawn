const ready = glslang();
ready.then(init);
const vs = `#version 450
layout(location = 0) in vec3 position;
void main() {
    gl_Position = vec4(position, 1.0);
}`;
const fs = `#version 450
layout(location = 0) out vec4 outColor;
void main() {
    outColor = vec4(0.0, 0.0, 1.0, 1.0);
}`;

async function init(glslang) {
    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();
    const c = document.getElementById('c');
    const ctx = c.getContext('gpupresent');
    const swapChainFormat = "bgra8unorm";
    const swapChain = ctx.configureSwapChain({device, format: swapChainFormat});
    const pipeline = device.createRenderPipeline({
        layout: device.createPipelineLayout({bindGroupLayouts: []}),
        vertexStage: {
            module: device.createShaderModule({
                code: glslang.compileGLSL(vs, 'vertex'),
                source: vs
            }),
            entryPoint: 'main'
        },
        fragmentStage: {
            module: device.createShaderModule({
                code: glslang.compileGLSL(fs, 'fragment'),
                source: fs
            }),
            entryPoint: 'main'
        },
        vertexState: {
            indexFormat: 'uint32',
            vertexBuffers: [{
                arrayStride: 12, // 3 * 4bytes
                attributes: [{
                    shaderLocation: 0,
                    offset: 0,
                    format: "float3"
                }]
            }]
        },
        colorStates: [{
            format: swapChainFormat,
            alphaBlend: {
                srcFactor: "src-alpha",
                dstFactor: "one-minus-src-alpha",
                operation: "add"
            }
        }],
        primitiveTopology: 'triangle-list',
    });

    const positions = [ 
         0.0, 0.5, 0.0, // v0
        -0.5,-0.5, 0.0, // v1
         0.5,-0.5, 0.0  // v2
    ];
    const data = new Float32Array(positions);
    const vertexBuffer = device.createBuffer({
        size: data.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });
    vertexBuffer.setSubData(0, data);

	const render =  function () {
        const commandEncoder = device.createCommandEncoder();
        const textureView = swapChain.getCurrentTexture().createView();
        const renderPassDescriptor = {
            colorAttachments: [{
                attachment: textureView,
                loadValue: {r: 1.0, g: 1.0, b: 1.0, a: 1.0},
            }]
        };
        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setVertexBuffer(0, vertexBuffer);
        passEncoder.setPipeline(pipeline);
        passEncoder.draw(3, 1, 0, 0);
        passEncoder.endPass();
        device.defaultQueue.submit([commandEncoder.finish()]);
    }
    requestAnimationFrame(render);
}