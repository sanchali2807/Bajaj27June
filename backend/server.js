const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());

const USER = {
  user_id: "sanchali_28072005",
  email_id: "sanchali1202.be23@chitkara.edu.in",
  college_roll_number: "2310991202",
};

app.get("/", (req, res) => {
  res.send("Api is working");
});

app.post("/bfhl", (req, res) => {
  const data = req.body.data || [];

  const seen = new Set();
  const edges = [];
  const invalid_entries = [];
  const duplicate_edges = [];

  for (const raw of data) {
    const s = String(raw).trim();
    const match = s.match(/^([A-Z])->([A-Z])$/);

    if (!match || match[1] === match[2]) {
      invalid_entries.push(raw);
      continue;
    }

    const from = match[1];
    const to = match[2];
    const key = `${from}->${to}`;

    if (seen.has(key)) {
      if (!duplicate_edges.includes(key)) duplicate_edges.push(key);
      continue;
    }

    seen.add(key);
    edges.push({ from, to });
  }

  const children = {};
  const parent = {};
  const allNodes = new Set();

  for (const { from, to } of edges) {
    allNodes.add(from);
    allNodes.add(to);

    if (parent[to]) continue;

    parent[to] = from;
    children[from] = children[from] || [];
    children[from].push(to);
  }

  for (const n of allNodes) {
    children[n] = children[n] || [];
  }

  const visited = new Set();
  const groups = [];

  function collectGroup(startNode) {
    const group = new Set();
    const queue = [startNode];
    while (queue.length) {
      const node = queue.pop();
      if (group.has(node)) continue;
      group.add(node);
      for (const child of children[node]) queue.push(child);
      if (parent[node]) queue.push(parent[node]);
    }
    return group;
  }

  for (const node of allNodes) {
    if (!visited.has(node)) {
      const group = collectGroup(node);
      groups.push(group);
      for (const n of group) visited.add(n);
    }
  }

  const hierarchies = [];
  let total_trees = 0;
  let total_cycles = 0;

  for (const group of groups) {
    const sortedNodes = [...group].sort();
    const root = sortedNodes.find(n => !parent[n]) || sortedNodes[0];

    function hasCycle() {
      const state = {};
      function dfs(node) {
        state[node] = "visiting";
        for (const child of children[node]) {
          if (!group.has(child)) continue;
          if (state[child] === "visiting") return true;
          if (!state[child] && dfs(child)) return true;
        }
        state[node] = "done";
        return false;
      }
      for (const node of group) {
        if (!state[node] && dfs(node)) return true;
      }
      return false;
    }

    function buildTree(node) {
      const obj = {};
      for (const child of children[node]) {
        obj[child] = buildTree(child);
      }
      return obj;
    }

    function getDepth(node) {
      if (children[node].length === 0) return 1;
      return 1 + Math.max(...children[node].map(getDepth));
    }

    if (hasCycle()) {
      total_cycles++;
      hierarchies.push({ root, tree: {}, has_cycle: true });
    } else {
      total_trees++;
      hierarchies.push({
        root,
        tree: { [root]: buildTree(root) },
        depth: getDepth(root),
      });
    }
  }

  hierarchies.sort((a, b) => {
    if (!!a.has_cycle !== !!b.has_cycle) return a.has_cycle ? 1 : -1;
    return a.root.localeCompare(b.root);
  });

  const trees = hierarchies.filter(h => !h.has_cycle);
  const largest = trees.reduce((best, cur) => {
    if (!best) return cur;
    if (cur.depth > best.depth) return cur;
    if (cur.depth === best.depth && cur.root < best.root) return cur;
    return best;
  }, null);

  res.json({
    ...USER,
    hierarchies,
    invalid_entries,
    duplicate_edges,
    summary: {
      total_trees,
      total_cycles,
      largest_tree_root: largest?.root || "",
    },
  });
});

app.listen(3001, () => console.log("API running on :3001"));