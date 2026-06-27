const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());

const USER = {
    "fullname_ddmmyyyy":"sanchali_28072005",
    "email_id" : "sanchali1202.be23@chitkara.edu.in",
    "college_roll_number" : "2310991202"
}

app.get("/",(req,res)=>{
    res.send("Api is working");
})


// api.post("/bfhl",(req,res)=>{
//     const data = req.body.data || [];
//     const valid_edge = 
// })

















app.post("/bfhl", (req, res) => {
  const data = req.body.data || [];
  const validEdge = /^([A-Z])->([A-Z])$/;
  const seen = new Set();
  const edges = [];
  const invalid_entries = [];
  const duplicate_edges = [];

  // Step 1: validate and deduplicate
  for (const raw of data) {
    const s = String(raw).trim();
    const m = validEdge.exec(s);
    if (!m || m[1] === m[2]) { invalid_entries.push(raw); continue; }
    const key = `${m[1]}->${m[2]}`;
    if (seen.has(key)) { if (!duplicate_edges.includes(key)) duplicate_edges.push(key); continue; }
    seen.add(key);
    edges.push({ p: m[1], c: m[2] });
  }

  // Step 2: build graph (first parent wins)
  const adj = {}, childOf = {}, nodes = new Set();
  for (const { p, c } of edges) {
    nodes.add(p); nodes.add(c);
    if (childOf[c]) continue;
    childOf[c] = p;
    adj[p] = adj[p] || [];
    adj[p].push(c);
  }
  for (const n of nodes) adj[n] = adj[n] || [];

  // Step 3: union-find to get components
  const par = {};
  for (const n of nodes) par[n] = n;
  const find = x => par[x] === x ? x : (par[x] = find(par[x]));
  const union = (a, b) => { par[find(a)] = find(b); };
  for (const n of nodes) for (const c of adj[n]) union(n, c);
  const groups = {};
  for (const n of nodes) { const r = find(n); groups[r] = groups[r] || new Set(); groups[r].add(n); }

  // Step 4: cycle detection (DFS)
  const hasCycle = group => {
    const color = {};
    for (const n of group) color[n] = 0;
    const dfs = n => {
      color[n] = 1;
      for (const c of adj[n]) {
        if (!group.has(c)) continue;
        if (color[c] === 1) return true;
        if (color[c] === 0 && dfs(c)) return true;
      }
      color[n] = 2; return false;
    };
    for (const n of group) if (color[n] === 0 && dfs(n)) return true;
    return false;
  };

  // Step 5: build tree object
  const buildTree = (n, vis = new Set()) => {
    if (vis.has(n)) return {};
    vis.add(n);
    const o = {};
    for (const c of adj[n]) o[c] = buildTree(c, new Set(vis));
    return o;
  };

  const depth = (n, memo = {}) => {
    if (memo[n] !== undefined) return memo[n];
    const ch = adj[n] || [];
    return (memo[n] = ch.length === 0 ? 1 : 1 + Math.max(...ch.map(c => depth(c, memo))));
  };

  // Step 6: build hierarchies
  const hierarchies = [];
  let total_trees = 0, total_cycles = 0;

  for (const group of Object.values(groups)) {
    const sorted = [...group].sort();
    const root = sorted.find(n => !childOf[n]) || sorted[0];
    if (hasCycle(group)) {
      total_cycles++;
      hierarchies.push({ root, tree: {}, has_cycle: true });
    } else {
      total_trees++;
      hierarchies.push({ root, tree: { [root]: buildTree(root) }, depth: depth(root) });
    }
  }

  hierarchies.sort((a, b) => !!a.has_cycle - !!b.has_cycle || a.root.localeCompare(b.root));

  const nonCyclic = hierarchies.filter(h => !h.has_cycle);
  const best = nonCyclic.reduce((a, b) => b.depth > a.depth || (b.depth === a.depth && b.root < a.root) ? b : a, nonCyclic[0]);

  res.json({
    ...USER,
    hierarchies,
    invalid_entries,
    duplicate_edges,
    summary: { total_trees, total_cycles, largest_tree_root: best?.root || "" }
  });
});

app.listen(3001, () => console.log("API running on :3001"));