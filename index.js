const SCREEN_WIDTH = 800;
const SCREEN_HEIGHT = 600;
const canvas = document.querySelector('#canvas');
const context = canvas.getContext('2d');
let images = {};
let world = {};
let camera = {};
let keysdown = {};
let boss = false;
let balcony;

function setupCanvas() {
    // Set canvas dimensions
    canvas.width = SCREEN_WIDTH;
    canvas.height = SCREEN_HEIGHT;
    context.imageSmoothingEnabled = false
}

function loadImage(name, src) {
    return new Promise((resolve, reject) => {
        // Load image
        let image = new Image();
        image.src = src;
        images[name] = image;

        image.onload = () => {
            console.log('Loaded image')
            resolve();
        }

        image.onerror = () => {
            reject();
        }
    })
}

function drawImage(name, x, y, w, h, dir, frame, tw, th) {
    let sx = 0;
    let sy = 0;
    let sw = tw || 32;
    let sh = th || 32;
    let image = images[name];

    // Has a frame
    if (frame) {
        sy = frame * sh;
    }

    context.translate(x, y);
    context.scale(dir, 1);
    context.drawImage(image, sx, sy, sw, sh, -w / 2, -h / 2, w, h);
    context.scale(1 / dir, 1);
    context.translate(-x, -y);
}

function setupWorld() {
    // Clear world
    world.objects = [];

    // Create starting objects
    let bird = {
        x: 250,
        y: 200,
        w: 64,
        h: 64,
        dir: 1,
        vx: 0,
        vy: 0,
        animation: 0,
        frame: 0
    }
    world.player = bird;
    camera.x = bird.x - SCREEN_WIDTH / 2;
    camera.y = bird.y - SCREEN_HEIGHT / 2;

    // Add starting tree
    world.objects.push({
        name: 'tree',
        x: 200,
        y: 0,
        w: 400,
        h: 1200,
        vx: 0,
        vy: 0,
        dir: 1,
        animation: 0,
        frame: 0,
        tw: 200,
        th: 600,
        collisions: [
            {
                x: 50,
                y: 270,
                w: 100,
                h: 25
            }
        ]
    })

    // Add balcony
    balcony = {
        name: 'balcony',
        x: 5400,
        y: 300,
        w: 800,
        h: 600,
        vx: 0,
        vy: 0,
        dir: 1,
        animation: 0,
        frame: 0,
        tw: 200,
        th: 150,
        collisions: [
            {
                x: 0,
                y: 75,
                w: 800,
                h: 25
            },
            {
                x: -400,
                y: 300,
                w: 25,
                h: 450
            }
        ]
    };
    world.objects.push(balcony);

    // Lots of bees
    for (let x = SCREEN_WIDTH / 2; x < 4000; x += Math.random() * 100 + 100) {
        let random = Math.round(Math.random() * 3);
        for (let i = 0; i < random; i++) {
            world.objects.push({
                name: 'bee',
                x: x,
                y: Math.random() * -(1000 + SCREEN_HEIGHT) + SCREEN_HEIGHT,
                w: 64,
                h: 64,
                vx: 0,
                vy: 0,
                dir: -1,
                animation: 1,
                frame: 0,
                frames: 4,
                tw: 32,
                th: 32,
                collisions: [
                    {
                        x: 0,
                        y: 16,
                        w: 32,
                        h: 64
                    }
                ],
                pathX: x,
                pathWidth: Math.random() * 100 + 100 // 100 - 200
            })
        }
    }
}

function isKeyPressed(key) {
    return keysdown[key];
}

function update(dt) {

    // Update player
    let player = world.player;

    player.animation = 0;

    // Controls
    if (isKeyPressed("ArrowLeft") && balcony.frame < 9) {
        player.dir = -1;
        player.animation = 1;
        player.vx -= 20 * dt;
    }
    if (isKeyPressed("ArrowRight") && balcony.frame < 9) {
        player.dir = 1;
        player.animation = 1;
        player.vx += 20 * dt;
    }
    if ((isKeyPressed("ArrowUp") || isKeyPressed("Space")) && player.onGround && balcony.frame < 9) {
        player.vy = -5;
        player.vx = 5 * player.dir;
    }

    if (!player.onGround) {
        if (Math.abs(player.vx) > 1) {
            player.animation = 2;
        } else {
            player.animation = 0;
        }
    }

    if (player.vy > 1 && Math.abs(player.vx) > 3) {
        player.vy = -3;
    }

    // Physics
    player.vy += 9.8 * dt; // gravity

    if (player.onGround) {
        player.vx *= Math.max(0, 1 - 5 * dt); // friction (on ground)
        player.onGround = false;
    } else {
        player.vx *= Math.max(0, 1 - 2.5 * dt); // friction (in air)
    }


    // Collisions
    for (let o of world.objects) {
        for (let c of o.collisions || []) {
            let dx = player.x - (o.x + c.x);
            let dy = player.y + player.h / 2 + player.vy - (o.y + c.y);
            if (Math.abs(dx) <= c.w / 2 && Math.abs(dy) <= c.h / 2) {
                player.vy = 0;
                player.onGround = true;
                if (o.name == 'bee') {
                    player.x = 250;
                    player.y = 200;
                    player.vx = 0;
                    player.vy = 0;
                }

                if (o.name == 'balcony') {
                    boss = true;
                }
            }
        }
    }
    for (let o of world.objects) {
        for (let c of o.collisions || []) {
            let dx = player.x + player.vx - (o.x + c.x);
            let dy = player.y + player.h / 2 - (o.y + c.y);
            if (Math.abs(dx) < c.w / 2 && Math.abs(dy) < c.h / 2) {
                player.vx = 0;
                if (o.name == 'bee') {
                    player.x = 250;
                    player.y = 200;
                    player.vx = 0;
                    player.vy = 0;
                }
            }
        }
    }

    // Update world objects
    for (let o of world.objects) {
        if (o.animation && o.frames && o.animation == 1) {
            o.frame += 12 * dt;
            if (o.frame >= o.frames) {
                o.frame = 0;
            }
        }

        if (o.name == 'bee') {
            o.vx -= 10 * o.dir * dt;
            if (o.x - o.pathX > o.pathWidth / 2) {
                o.dir = 1;
            }
            if (o.x - o.pathX < -o.pathWidth / 2) {
                o.dir = -1;
            }
        }

        o.vx *= (1 - 2.5 * dt);
        o.x += o.vx;
        o.y += o.vy;
    }

    player.x += player.vx;
    player.y += player.vy;

    if (player.y > SCREEN_HEIGHT) {
        player.x = 250;
        player.y = 200;
        player.vx = 0;
        player.vy = 0;
    }

    // Update camera position
    let targetX = player.x - SCREEN_WIDTH / 2;
    let targetY = player.y - SCREEN_HEIGHT / 2;

    if (boss) {
        targetX = 5500 - SCREEN_WIDTH / 2;
        targetY = 300 - SCREEN_HEIGHT / 2;

        if (balcony.frame < 1) {
            balcony.frame += dt / 3; // Take 3 seconds to start playing
        } else {
            balcony.frame += 5 * dt;
            if (balcony.frame >= 9) {
                balcony.frame = 9;
                player.animation = 3;
            }
        }
    }

    // Animations
    if (player.animation == 0) { // Stand
        player.frame = 0;
    }
    if (player.animation == 1) { // Walk [0,1]
        player.frame += 12 * dt;
        if (player.frame >= 2) {
            player.frame = 0;
        }
    }
    if (player.animation == 2) { // Fly
        if (player.frame < 2) {
            player.frame = 2;
        }
        player.frame += 12 * dt;
        if (player.frame >= 4) {
            player.frame = 2;
        }
    }
    if (player.animation == 3) { // Dance
        if (player.frame < 4) {
            player.frame = 4;
        }
        player.frame += 12 * dt;
        if (player.frame >= 6) {
            player.frame = 4;
        }
    }

    let distX = targetX - camera.x;
    let distY = targetY - camera.y;
    let distT = Math.sqrt(distX * distX + distY * distY);
    let angle = Math.atan2(distY, distX);
    camera.x += distT * 5 * Math.cos(angle) * dt;
    camera.y += distT * 5 * Math.sin(angle) * dt;

    if (camera.x < 0) {
        camera.x = 0;
    }
    if (camera.y > 0) {
        camera.y = 0;
    }
    if (camera.x > 5000) {
        camera.x = 5000;
    }
    if (camera.y < -1000) {
        camera.y = -1000;
    }
}

function render(dt) {
    // Clear screen
    context.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // Render background
    let bottom = [50, 150, 200];
    let top = [5, 15, 100];
    let percent = camera.y / -1000;
    let curr = [Math.round(bottom[0] + (top[0] - bottom[0]) * percent),
    Math.round(bottom[1] + (top[1] - bottom[1]) * percent),
    Math.round(bottom[2] + (top[2] - bottom[2]) * percent)]
    let color = '#';
    for (let c of curr) {
        let str = c.toString(16);
        if (str.length == 1) str = '0' + str;
        color += str;
    }

    context.fillStyle = color;
    context.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // Translate by camera
    context.translate(-camera.x, -camera.y)

    // Render all objects
    for (let o of world.objects) {
        drawImage(o.name, o.x, o.y, o.w, o.h, o.dir, Math.floor(o.frame), o.tw, o.th);

        for (let c of o.collisions || []) {
            // context.fillStyle = "#FFFFFF55"
            // context.fillRect(o.x + c.x - c.w / 2, o.y + c.y - c.h / 2, c.w, c.h);
        }
    }

    // Render bird
    let player = world.player;
    drawImage('bird', player.x, player.y, player.w, player.h, player.dir, Math.floor(player.frame))

    // Translate back by camera
    context.translate(camera.x, camera.y);

    if (boss && player.animation == 3) {
        context.fillStyle = 'white';
        context.font = '70px Arial'
        let w1 = context.measureText('Happy Birthday Dad!').width;
        let w2 = context.measureText('I love you so much.').width;
        context.fillText('Happy Birthday Dad!', (SCREEN_WIDTH - w1) / 2, SCREEN_HEIGHT / 2 - 200);
        context.fillText('I love you so much.', (SCREEN_WIDTH - w2) / 2, SCREEN_HEIGHT / 2 - 100)
    }
}

// Game loop stuff
let lastLoop = new Date();
function loop() {
    let now = new Date();
    let dt = (now.getTime() - lastLoop.getTime()) / 1000.0;

    if (dt > 1 / 30) dt = 1 / 30;

    // Update
    update(dt);
    // Render
    render(dt);

    lastLoop = new Date();
    requestAnimationFrame(loop);
}

// Preload stuff
let promises = [];
promises.push(loadImage('bird', 'bird.png'));
promises.push(loadImage('tree', 'tree.png'));
promises.push(loadImage('balcony', 'balcony.png'));
promises.push(loadImage('bee', 'bee.png'));
Promise.all(promises).then(() => {
    // Setup canvas
    setupCanvas();
    // Setup world
    setupWorld();
    // Start game loop
    requestAnimationFrame(loop);
}).catch(err => {
    alert('Failed to load all assets');
})

window.onkeydown = (event) => {
    let code = event.code;
    if (code) {
        keysdown[code] = true;
        console.log(code);
    }
}

window.onkeyup = (event) => {
    let code = event.code;
    if (code) {
        keysdown[code] = false;
    }
}