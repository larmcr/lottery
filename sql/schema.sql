CREATE TABLE productos (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE sorteos (
  id INTEGER PRIMARY KEY, -- Autoincrement
  productoId INTEGER NOT NULL, -- FK
  sorteo INTEGER NOT NULL,
  estado INTEGER NOT NULL,
  fecha TEXT NOT NULL,
  vigencia TEXT NOT NULL,
  FOREIGN KEY (productoId) REFERENCES productos(id)
);

CREATE TABLE premios (
  id INTEGER PRIMARY KEY, -- Autoincrement
  sorteoId INTEGER NOT NULL, -- FK
  numero INTEGER NOT NULL,
  serie INTEGER NOT NULL,
  monto INTEGER NOT NULL,
  orden INTEGER NOT NULL,
  tipo INTEGER NOT NULL,
  especial INTEGER NOT NULL,
  FOREIGN KEY (sorteoId) REFERENCES sorteos(id)
);

CREATE TABLE lottos (
  id INTEGER PRIMARY KEY, -- Autoincrement
  sorteoId INTEGER NOT NULL, -- FK
  numero INTEGER NOT NULL,
  orden INTEGER NOT NULL,
  revancha INTEGER NOT NULL, -- boolean
  FOREIGN KEY (sorteoId) REFERENCES sorteos(id)
);

INSERT INTO productos (code, name) VALUES 
  ("loterianacional", "Lotería Nacional"),
  ("chances", "Chances"),
  ("lotto", "Lotto"),
  ("nuevostiempos", "Nuevos Tiempos"),
  ("tresmonazos", "Tres Monazos");
