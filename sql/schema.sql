CREATE TABLE loterias (
  id INTEGER PRIMARY KEY, -- Autoincrement
  producto TEXT NOT NULL, -- "chances" o  "loterianacional"
  sorteo INTEGER NOT NULL,
  fecha TEXT NOT NULL,
  orden INTEGER NOT NULL,
  numero INTEGER NOT NULL,
  serie INTEGER NOT NULL
);
