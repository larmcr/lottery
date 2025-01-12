CREATE TABLE loterias (
  id INTEGER PRIMARY KEY, -- Autoincrement
  producto TEXT NOT NULL, -- "chances" o  "loterianacional"
  sorteo INTEGER NOT NULL,
  fecha TEXT NOT NULL,
  orden INTEGER NOT NULL,
  numero INTEGER NOT NULL,
  serie INTEGER NOT NULL
);

CREATE TABLE lottos (
  id INTEGER PRIMARY KEY, -- Autoincrement
  sorteo INTEGER NOT NULL,
  fecha TEXT NOT NULL,
  orden INTEGER NOT NULL,
  numero INTEGER NOT NULL,
  revancha INTEGER NOT NULL -- boolean
);