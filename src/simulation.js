export function setupBridgeSimulation(container, button) {
  const Engine = Matter.Engine;
  const Render = Matter.Render;
  const Runner = Matter.Runner;
  const Bodies = Matter.Bodies;
  const Composite = Matter.Composite;
  const Mouse = Matter.Mouse;
  const MouseConstraint = Matter.MouseConstraint;
  const Constraint = Matter.Constraint;
  const Vector = Matter.Vector;

  let engine, render, runner, world;
  let nodes = [];
  let edges = [];

  let leftAnchor, rightAnchor;


  let centerPoint = {
    x: 450,
    y: 250,
    radius: 12,
    color: "blue",
    isAnchor: true,
  };

  let centerBody = null;

  let buildMode = true;

  function resetScene() {
    if (render) Render.stop(render);
    if (runner) Runner.stop(runner);

    container.innerHTML = "";

    engine = Engine.create();
    world = engine.world;

    render = Render.create({
      element: container,
      engine,
      options: {
        width: 900,
        height: 500,
        wireframes: false,
        background: "#1e1616",
      },
    });

    Render.run(render);
    runner = Runner.create();
    Runner.run(runner, engine);

    world.gravity.y = 0;

    leftAnchor = Bodies.circle(100, 250, 12, {
      isStatic: true,
      render: { fillStyle: "red" },
    });

    rightAnchor = Bodies.circle(800, 250, 12, {
      isStatic: true,
      render: { fillStyle: "red" },
    });

    Composite.add(world, [leftAnchor, rightAnchor]);

    nodes = [];
    edges = [];
    centerBody = null;

    initBuildMode();


    const ctx = render.context;
    (function drawBlue() {
      ctx.beginPath();
      ctx.arc(centerPoint.x, centerPoint.y, centerPoint.radius, 0, Math.PI * 2);
      ctx.fillStyle = "blue";
      ctx.fill();
      requestAnimationFrame(drawBlue);
    })();
  }

  function initBuildMode() {
    const mouse = Mouse.create(render.canvas);
    let pendingNode = null;

    function getAnchorUnder(pos) {
      const anchors = buildMode
        ? [leftAnchor, rightAnchor]
        : [leftAnchor, rightAnchor, centerBody];

      return anchors.find((a) => {
        const dx = a.position.x - pos.x;
        const dy = a.position.y - pos.y;
        return dx * dx + dy * dy < a.circleRadius * a.circleRadius;
      });
    }

    function isInsideBlue(p) {
      const dx = centerPoint.x - p.x;
      const dy = centerPoint.y - p.y;
      return dx * dx + dy * dy < centerPoint.radius * centerPoint.radius;
    }

    render.canvas.addEventListener("mousedown", () => {
      if (!buildMode) return;

      const pos = mouse.position;


      if (isInsideBlue(pos)) {
        if (!pendingNode) {
          pendingNode = { isBlue: true, x: centerPoint.x, y: centerPoint.y };
        } else {
          createRodFromXY(pendingNode, {
            isBlue: true,
            x: centerPoint.x,
            y: centerPoint.y,
          });
          pendingNode = null;
        }
        return;
      }


      let hit = getAnchorUnder(pos);


      if (!hit) hit = getNodeUnder(pos);


      if (!hit) hit = createNode(pos.x, pos.y);

      if (!pendingNode) {
        pendingNode = hit;
        hit.render && (hit.render.fillStyle = "#fff7c4");
      } else {
        createRod(pendingNode, hit);
        pendingNode.render && (pendingNode.render.fillStyle = "#ffe28a");
        pendingNode = null;
      }
    });
  }

  function createNode(x, y) {
    const node = Bodies.circle(x, y, 6, {
      density: 0.003,
      frictionAir: 0.02,
      render: { fillStyle: "#ffe28a" },
    });
    nodes.push(node);
    Composite.add(world, node);
    return node;
  }

  function createRod(a, b) {

    if (a.isBlue) return createRodFromXY(a, b);
    if (b.isBlue) return createRodFromXY(a, b);

    const rod = Constraint.create({
      bodyA: a,
      bodyB: b,
      stiffness: 1,
      length: Vector.magnitude(Vector.sub(a.position, b.position)),
      render: { strokeStyle: "#caa474", lineWidth: 4 },
    });

    edges.push(rod);
    Composite.add(world, rod);
  }


function createRodFromXY(a, b) {
  const endA = a.isBlue
    ? { x: centerPoint.x, y: centerPoint.y }
    : a.position;

  const endB = b.isBlue
    ? { x: centerPoint.x, y: centerPoint.y }
    : b.position;

  const rod = Constraint.create({
    bodyA: a.isBlue ? null : a,
    bodyB: b.isBlue ? null : b,

    pointA: a.isBlue ? { x: 0, y: 0 } : { x: 0, y: 0 },
    pointB: b.isBlue ? { x: 0, y: 0 } : { x: 0, y: 0 },


    length: Vector.magnitude(
      Vector.sub(endA, endB)
    ),

    stiffness: 1,
    render: { strokeStyle: "#caa474", lineWidth: 4 }
  });

  edges.push(rod);
  Composite.add(world, rod);



    edges.push(rod);
    Composite.add(world, rod);
  }

  function getNodeUnder(pos) {
    return nodes.find((n) => {
      const dx = n.position.x - pos.x;
      const dy = n.position.y - pos.y;
      return dx * dx + dy * dy < 12 * 12;
    });
  }

  function simulate() {
    if (!buildMode) return;

    buildMode = false;
    button.innerText = "Construir";

    world.gravity.y = 1;


    centerBody = Bodies.circle(centerPoint.x, centerPoint.y, 12, {
      isStatic: false,
      frictionAir: 0.1,
      inertia: Infinity, // impede rotação
      render: { fillStyle: "blue" },
    });

    Composite.add(world, centerBody);


    Matter.Body.setStatic(centerBody, false);
    centerBody.ignoreGravity = true;


    Matter.Events.on(engine, "beforeUpdate", () => {
      const force = Matter.Vector.mult(
        Matter.Vector.sub(centerPoint, centerBody.position),
        0.002
      );
      Matter.Body.applyForce(centerBody, centerBody.position, force);
    });


    edges.forEach((e) => {
      if (e.pointA && e.pointA.x === centerPoint.x) {
        e.bodyA = centerBody;
        e.pointA = { x: 0, y: 0 };
      }
      if (e.pointB && e.pointB.x === centerPoint.x) {
        e.bodyB = centerBody;
        e.pointB = { x: 0, y: 0 };
      }
    });
  }

  function goToBuildMode() {
    if (buildMode) return;
    buildMode = true;
    button.innerText = "Simular";
    resetScene();
  }

  button.addEventListener("click", () => {
    if (buildMode) simulate();
    else goToBuildMode();
  });

  resetScene();

  return { world, nodes, edges };
}

