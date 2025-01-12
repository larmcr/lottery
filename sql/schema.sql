CREATE TABLE loterias (
  id INTEGER PRIMARY KEY, -- Autoincrement
  producto TEXT NOT NULL, -- "chances" o  "loterianacional"
  fecha TEXT NOT NULL,
  sorteo INTEGER NOT NULL,
  orden INTEGER NOT NULL,
  numero INTEGER NOT NULL,
  serie INTEGER NOT NULL
);

CREATE TABLE lottos (
  id INTEGER PRIMARY KEY, -- Autoincrement
  fecha TEXT NOT NULL,
  sorteo INTEGER NOT NULL,
  orden INTEGER NOT NULL,
  numero INTEGER NOT NULL,
  revancha INTEGER NOT NULL -- boolean
);

CREATE TABLE tiempos (
  id INTEGER PRIMARY KEY, -- Autoincrement
  horario TEXT NOT NULL,
  fecha TEXT NOT NULL,
  sorteo INTEGER NOT NULL,
  numero INTEGER NOT NULL,
  reventado INTEGER NOT NULL,
  mega INTEGER NOT NULL,
  color TEXT NOT NULL
);