export function setupBridgeSimulation(container, button) {
  const Engine = Matter.Engine;
  const Render = Matter.Render;
  const Runner = Matter.Runner;
  const Bodies = Matter.Bodies;
  const Composite = Matter.Composite;
  const Mouse = Matter.Mouse;
  const MouseConstraint = Matter.MouseConstraint;
  const Constraint = Matter.Constraint;

  let engine, render, runner, world;
  let nodes = [];
  let edges = [];
  let leftAnchor, rightAnchor, centerPoint;

  let buildMode = true;
  let dragStartNode = null;
  let dragGhost = null;

  // Reset Scene
  function resetScene() {
    if (render) Render.stop(render);
    if (runner) Runner.stop(runner);

    container.innerHTML = ""; // clear canvas

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

    // física desligada
    world.engine.gravity.y = 0;

    // âncoras fixas
    leftAnchor = Bodies.circle(100, 250, 10, {
      isStatic: true,
      render: { fillStyle: "red" },
    });
    rightAnchor = Bodies.circle(800, 250, 10, {
      isStatic: true,
      render: { fillStyle: "red" },
    });

    centerPoint = Bodies.circle(450, 250, 10, {
      isStatic: true,
      render: { fillStyle: "blue" },
    });

    Composite.add(world, [leftAnchor, rightAnchor, centerPoint]);

    nodes = [];
    edges = [];

    initBuildMode();
  }

  // Build Mode
  function initBuildMode() {
    const mouse = Mouse.create(render.canvas);

    render.canvas.addEventListener("mousedown", (e) => {
      if (!buildMode) return;
      const pos = mouse.position;
      const hit = getNodeUnder(pos);

      if (hit) {
        dragStartNode = hit;
      } else {
        dragStartNode = createNode(pos.x, pos.y);
      }

      dragGhost = Constraint.create({
        bodyA: dragStartNode,
        pointB: { x: pos.x, y: pos.y },
        stiffness: 0,
        render: { strokeStyle: "#ffffff80", lineWidth: 2 },
      });

      Composite.add(world, dragGhost);
    });

    render.canvas.addEventListener("mousemove", () => {
      if (!dragGhost || !buildMode) return;
      const pos = mouse.position;
      dragGhost.pointB = { x: pos.x, y: pos.y };
    });

    render.canvas.addEventListener("mouseup", () => {
      if (!dragStartNode || !buildMode) return;

      const pos = Mouse.create(render.canvas).position;
      let hit = getNodeUnder(pos);

      if (dragGhost) {
        Composite.remove(world, dragGhost);
        dragGhost = null;
      }

      if (!hit) {
        hit = createNode(pos.x, pos.y);
      }

      if (hit !== dragStartNode) {
        createRod(dragStartNode, hit);
      }

      dragStartNode = null;
    });
  }

  // ⚙️ FUNÇÕES DE CRIAÇÃO
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
    const rod = Constraint.create({
      bodyA: a,
      bodyB: b,
      stiffness: 1,
      length: Matter.Vector.magnitude(
        Matter.Vector.sub(a.position, b.position)
      ),
      render: { strokeStyle: "#caa474", lineWidth: 4 },
    });
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

  // ▶️ SIMULAÇÃO
  function simulate() {
    if (!buildMode) return;

    buildMode = false;
    button.innerText = "Construir";

    world.engine.gravity.y = 1; // ativa gravidade

    // aplicar força no ponto azul
    setTimeout(() => {
      Matter.Body.setStatic(centerPoint, false);
      Matter.Body.applyForce(centerPoint, centerPoint.position, {
        x: 0,
        y: 0.05,
      });
    }, 300);
  }

  // Switch mode (Build, Simulate)
  function goToBuildMode() {
    if (buildMode) return;

    buildMode = true;
    button.innerText = "Simular";

    resetScene();
  }

  // Button
  button.addEventListener("click", () => {
    if (buildMode) simulate();
    else goToBuildMode();
  });

  resetScene(); // initializes everything

  return {};
}
