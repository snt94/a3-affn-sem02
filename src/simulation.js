export function setupBridgeSimulation(container, button) {
  const { Engine, Render, Runner, Bodies, Composite, Constraint, Vector } =
    Matter;

  let engine, render, runner, world;
  let nodes = [];
  let edges = [];

  let leftAnchor, rightAnchor;
  let centerStatic, centerBody;

  let buildMode = true;

  const centerPoint = { x: 450, y: 250, radius: 12 };

  function resetScene() {
    if (render) Render.stop(render);
    if (runner) Runner.stop(runner);

    container.innerHTML = "";

    engine = Engine.create();
    world = engine.world;
    world.gravity.y = 0;

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

    leftAnchor = Bodies.circle(100, 250, 12, {
      isStatic: true,
      render: { fillStyle: "red" },
    });

    rightAnchor = Bodies.circle(800, 250, 12, {
      isStatic: true,
      render: { fillStyle: "red" },
    });

    centerStatic = Bodies.circle(centerPoint.x, centerPoint.y, 12, {
      isStatic: true,
      render: { fillStyle: "blue" },
    });

    Composite.add(world, [leftAnchor, rightAnchor, centerStatic]);

    nodes = [];
    edges = [];

    initBuildMode();
  }

  function initBuildMode() {
    let pending = null;

    function pos(evt) {
      const rect = render.canvas.getBoundingClientRect();
      const scaleX = render.canvas.width / rect.width;
      const scaleY = render.canvas.height / rect.height;

      return {
        x: ((evt.touches?.[0].clientX ?? evt.clientX) - rect.left) * scaleX,
        y: ((evt.touches?.[0].clientY ?? evt.clientY) - rect.top) * scaleY,
      };
    }

    function insideBlue(p) {
      const dx = p.x - centerPoint.x;
      const dy = p.y - centerPoint.y;
      return dx * dx + dy * dy < centerPoint.radius * centerPoint.radius;
    }

    function anchorAt(p) {
      const list = buildMode
        ? [leftAnchor, rightAnchor]
        : [leftAnchor, rightAnchor, centerBody];

      return list.find((a) => {
        const dx = p.x - a.position.x;
        const dy = p.y - a.position.y;
        return dx * dx + dy * dy < a.circleRadius * a.circleRadius;
      });
    }

    function nodeAt(p) {
      return nodes.find((n) => {
        const dx = p.x - n.position.x;
        const dy = p.y - n.position.y;
        return dx * dx + dy * dy < 12 * 12;
      });
    }

    function createNode(x, y) {
      const n = Bodies.circle(x, y, 6, {
        density: 0.003,
        frictionAir: 0.02,
        render: { fillStyle: "#ffe28a" },
      });
      nodes.push(n);
      Composite.add(world, n);
      return n;
    }

    function createRod(a, b) {
      if (a.isBlue || b.isBlue) return createRodBlue(a, b);

      const rod = Constraint.create({
        bodyA: a,
        bodyB: b,
        stiffness: 1,
        length: Vector.magnitude(Vector.sub(a.position, b.position)),
        render: { strokeStyle: "#caa474", lineWidth: 4 },
      });

      rod.maxForce = 0.8;

      edges.push(rod);
      Composite.add(world, rod);
    }

    function createRodBlue(a, b) {
      const A = a.isBlue ? centerStatic : a;
      const B = b.isBlue ? centerStatic : b;

      const rod = Constraint.create({
        bodyA: A,
        bodyB: B,
        stiffness: 1,
        length: Vector.magnitude(
          Vector.sub(
            a.isBlue ? centerStatic.position : a.position,
            b.isBlue ? centerStatic.position : b.position
          )
        ),
        render: { strokeStyle: "#caa474", lineWidth: 4 },
      });

      rod.isBlueConnection = true;

      edges.push(rod);
      Composite.add(world, rod);
    }

    function click(evt) {
      if (!buildMode) return;
      evt.preventDefault();

      const p = pos(evt);

      if (insideBlue(p)) {
        if (!pending) pending = { isBlue: true };
        else {
          createRodBlue(pending, { isBlue: true });
          pending = null;
        }
        return;
      }

      let hit = anchorAt(p) || nodeAt(p) || createNode(p.x, p.y);

      if (!pending) {
        pending = hit;
        hit.render && (hit.render.fillStyle = "#fff7c4");
      } else {
        createRod(pending, hit);
        pending.render && (pending.render.fillStyle = "#ffe28a");
        pending = null;
      }
    }

    render.canvas.addEventListener("mousedown", click);
    render.canvas.addEventListener("touchstart", click, { passive: false });
  }

  function simulate() {
    buildMode = false;
    button.innerText = "Construir";

    world.gravity.y = 1;

    // Criar ponto DINÂMICO azul
    centerBody = Bodies.circle(centerPoint.x, centerPoint.y, 12, {
      isStatic: false,
      frictionAir: 0.02,
      inertia: Infinity,
      render: { fillStyle: "blue" },
    });

    Matter.Body.setMass(centerBody, 30);

    Composite.remove(world, centerStatic);

    edges.forEach((e) => {
      if (e.isBlueConnection) {
        if (e.bodyA === centerStatic) e.bodyA = centerBody;
        if (e.bodyB === centerStatic) e.bodyB = centerBody;
      }
    });

    Matter.Events.on(engine, "afterUpdate", () => {
      edges.forEach((e) => {
        if (!e.bodyA || !e.bodyB) return;

        // Força atual na barra (aproximação simples)
        const current = Vector.magnitude(
          Vector.sub(e.bodyA.position, e.bodyB.position)
        );

        const stretch = Math.abs(current - e.length);

        // Peso da barra + comportamento: alongamento indica tensão
        if (stretch > e.maxForce) {
          Composite.remove(world, e);
          e.broken = true;
        }
      });

      edges = edges.filter((e) => !e.broken);
    });

    Composite.add(world, centerBody);

    const rope = Constraint.create({
      pointA: { x: centerPoint.x, y: centerPoint.y }, // ponto fixo original
      bodyB: centerBody,
      length: 200, // tamanho da corda (ajuste)
      stiffness: 0.001,      // bem elástico
      damping: 0.01,
      render: { strokeStyle: "blue", lineWidth: 2 },
    });

    Composite.add(world, rope);
  }

  function build() {
    if (buildMode) simulate();
    else {
      buildMode = true;
      button.innerText = "Simular";
      resetScene();
    }
  }

  button.addEventListener("click", build);

  resetScene();

  return { world, nodes, edges };
}
