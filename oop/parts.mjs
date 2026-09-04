// worker/errors.ts
var HttpError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
  status;
};

// public/static/demo/manifest.json
var manifest_default = {
  version: "synthetic-demo-v1",
  model: {
    name: "Nut Inspect Demo \xB7 synthetic v1",
    sha256: "41741b0fd45a22336d58a26cb68f38e4a6aba7be2546a1818fad4037beb67b22",
    bytes: 2623,
    weights_url: "/static/demo/nut-chip-demo.onnx",
    classes: [
      "chip"
    ],
    defect_classes: [
      "chip"
    ],
    image_size: 320,
    format: "demo_mask",
    confidence: 0.65,
    min_region_pixels: 24,
    is_demo: true,
    runtime: "browser_onnx",
    ready: true
  },
  samples: [
    {
      id: "normal",
      title: "\u0E1E\u0E37\u0E49\u0E19\u0E1C\u0E34\u0E27\u0E1B\u0E01\u0E15\u0E34",
      description: "\u0E20\u0E32\u0E1E\u0E19\u0E47\u0E2D\u0E15\u0E2A\u0E31\u0E07\u0E40\u0E04\u0E23\u0E32\u0E30\u0E2B\u0E4C\u0E17\u0E35\u0E48\u0E44\u0E21\u0E48\u0E21\u0E35\u0E23\u0E2D\u0E22\u0E1A\u0E34\u0E48\u0E19",
      image_url: "/static/demo/normal.png",
      sha256: "f77cb43ae4d5d595d9f8cafc4d27778d4002f677a7fd53ba9fc0ce8baf517674",
      width: 320,
      height: 320
    },
    {
      id: "one-chip",
      title: "\u0E23\u0E2D\u0E22\u0E1A\u0E34\u0E48\u0E19\u0E2B\u0E19\u0E36\u0E48\u0E07\u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07",
      description: "\u0E25\u0E2D\u0E07\u0E14\u0E39\u0E01\u0E23\u0E2D\u0E1A\u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07\u0E17\u0E35\u0E48\u0E42\u0E21\u0E40\u0E14\u0E25\u0E15\u0E23\u0E27\u0E08\u0E1E\u0E1A",
      image_url: "/static/demo/one-chip.png",
      sha256: "7fd51e1983ed5d59a5116dfd418af3b8e87c5a39eceb2321473f5acfa9f48548",
      width: 320,
      height: 320
    },
    {
      id: "two-chips",
      title: "\u0E23\u0E2D\u0E22\u0E1A\u0E34\u0E48\u0E19\u0E2A\u0E2D\u0E07\u0E15\u0E33\u0E41\u0E2B\u0E19\u0E48\u0E07",
      description: "\u0E25\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E15\u0E23\u0E27\u0E08\u0E41\u0E25\u0E30\u0E19\u0E31\u0E1A\u0E15\u0E33\u0E2B\u0E19\u0E34\u0E2B\u0E25\u0E32\u0E22\u0E08\u0E38\u0E14",
      image_url: "/static/demo/two-chips.png",
      sha256: "d43d2c53613c51afcea4b430eb87ed12c3ac755f36d65de7c703830a3ca1744f",
      width: 320,
      height: 320
    }
  ]
};

// worker/demo-data.ts
var demoModel = {
  ...manifest_default.model,
  model: manifest_default.model.name,
  message: "\u0E42\u0E21\u0E40\u0E14\u0E25\u0E40\u0E14\u0E42\u0E21\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E43\u0E0A\u0E49 \xB7 \u0E20\u0E32\u0E1E\u0E2A\u0E31\u0E07\u0E40\u0E04\u0E23\u0E32\u0E30\u0E2B\u0E4C\u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19",
  iou: 0.45
};
var demoSamples = manifest_default.samples;
var demoVersion = manifest_default.version;
var demoExists = (alias, kind) => `EXISTS(SELECT 1 FROM demo_items d WHERE d.entity_id=${alias}.id AND d.kind='${kind}')`;

// worker/files.ts
var CHUNK = 256 * 1024;
var id = () => crypto.randomUUID().replaceAll("-", "");
var now = () => (/* @__PURE__ */ new Date()).toISOString();
var crcTable = Uint32Array.from({ length: 256 }, (_, i) => {
  let c = i;
  for (let n = 0; n < 8; n++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
  return c;
});

// worker/parts.ts
var Part = class _Part {
  constructor(fields) {
    this.fields = fields;
  }
  fields;
  static fromInput(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new HttpError(400, "\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
    }
    const values = input;
    const text = (name, limit, required = false) => {
      const value = values[name];
      if (value == null && !required) return "";
      if (typeof value !== "string") throw new HttpError(400, "\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
      const result = value.trim();
      if (result.length > limit || required && !result) {
        throw new HttpError(400, "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E43\u0E2B\u0E49\u0E04\u0E23\u0E1A\u0E41\u0E25\u0E30\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19\u0E08\u0E33\u0E19\u0E27\u0E19\u0E2D\u0E31\u0E01\u0E29\u0E23\u0E17\u0E35\u0E48\u0E01\u0E33\u0E2B\u0E19\u0E14");
      }
      return result;
    };
    return new _Part(Object.freeze({
      code: text("code", 60, true),
      name: text("name", 120, true),
      size: text("size", 60),
      material: text("material", 120),
      lot: text("lot", 80),
      notes: text("notes", 2e3)
    }));
  }
  /** A new array prevents callers from mutating the object's stored values. */
  values() {
    const { code, name, size, material, lot, notes } = this.fields;
    return [code, name, size, material, lot, notes];
  }
};
var SqlitePartRepository = class {
  constructor(db) {
    this.db = db;
  }
  db;
  async list(mode, key) {
    const sql = `SELECT p.*,${demoExists("p", "part")} AS is_demo,
      (SELECT COUNT(*) FROM inspections WHERE part_id=p.id) AS inspection_count,
      (SELECT original_file FROM inspections WHERE part_id=p.id ORDER BY created_at DESC,rowid DESC LIMIT 1) AS thumbnail
      FROM parts p WHERE `;
    const predicate = key ? "p.id=?" : (mode === "demo" ? "" : "NOT ") + demoExists("p", "part");
    const { results } = await this.db.prepare(sql + predicate + " ORDER BY p.created_at DESC").bind(...key ? [key] : []).all();
    return results.map((row) => ({ ...row, is_demo: !!row.is_demo, thumbnail: row.thumbnail ? "/media/" + row.thumbnail : null }));
  }
  async find(key) {
    const row = await this.db.prepare(`SELECT p.*,${demoExists("p", "part")} AS is_demo FROM parts p WHERE p.id=?`).bind(key).first();
    return row ? { ...row, is_demo: !!row.is_demo } : null;
  }
  async insert(key, part, stamp, mode) {
    await this.db.batch([
      this.db.prepare("INSERT INTO parts (id,code,name,size,material,lot,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(key, ...part.values(), stamp, stamp),
      ...mode === "demo" ? [this.db.prepare("INSERT INTO demo_items VALUES (?,'part',NULL)").bind(key)] : []
    ]);
  }
  async update(key, part, stamp) {
    await this.db.prepare("UPDATE parts SET code=?,name=?,size=?,material=?,lot=?,notes=?,updated_at=? WHERE id=?").bind(...part.values(), stamp, key).run();
  }
};
var PartService = class {
  constructor(store, newId = id, clock = now) {
    this.store = store;
    this.newId = newId;
    this.clock = clock;
  }
  store;
  newId;
  clock;
  async read(mode, key) {
    const items = await this.store.list(mode, key);
    if (key && !items.length) throw new HttpError(404, "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E19\u0E47\u0E2D\u0E15");
    return key ? items[0] : items;
  }
  async save(input, operation, mode, key) {
    const part = Part.fromInput(input), uid = key || this.newId();
    if (operation === "update" && !await this.store.find(uid)) throw new HttpError(404, "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E19\u0E47\u0E2D\u0E15");
    try {
      if (operation === "create") await this.store.insert(uid, part, this.clock(), mode);
      else await this.store.update(uid, part, this.clock());
    } catch (error) {
      if (String(error).includes("UNIQUE")) throw new HttpError(409, "\u0E23\u0E2B\u0E31\u0E2A\u0E19\u0E47\u0E2D\u0E15\u0E19\u0E35\u0E49\u0E21\u0E35\u0E2D\u0E22\u0E39\u0E48\u0E41\u0E25\u0E49\u0E27 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E43\u0E0A\u0E49\u0E23\u0E2B\u0E31\u0E2A\u0E2D\u0E37\u0E48\u0E19");
      throw error;
    }
    const saved = await this.store.find(uid);
    if (!saved) throw new Error("Part save could not be read back");
    return saved;
  }
};
export {
  Part,
  PartService,
  SqlitePartRepository
};
