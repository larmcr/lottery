import fs from 'fs-extra';
import initSqlJs from 'sql.js';
import zlib from 'zlib';
import { pipeline } from 'stream/promises';

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const DATA = './data';
const DB = 'database.db';
const SCHEMA = './sql/schema.sql';
const API = 'https://integration.jps.go.cr/api/app';
const CHANCES = `${DATA}/chances`;

const getData = async (product) => {
  console.info(`\n> Product: '${product}'`);
  const api = `${API}/${product}`;
  let flag = true;
  const getJson = async (id) => {
    console.info(`\t> Fetching '${id}'`);
    try {
      const response = await fetch(`${api}/${id}`);
      const json = await response.json();
      return json;
    } catch (err) {
      flag = false;
      console.info(`\t> ERROR -> ${err}`);
    }
  };
  const saveJson = (json) => {
    const name =
      json.numeroSorteo ??
      `${json.manana?.numeroSorteo ?? '_'}-${json.mediaTarde?.numeroSorteo ?? '_'}-${json.tarde?.numeroSorteo ?? '_'}`;
    const file = `${DATA}/${product}/${name}.json`;
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(json));
      console.info(`\t\t> '${name}' saved`);
    } else {
      flag = false;
      console.info(`\t\t> '${name}' not saved (already exists)`);
    }
  };
  const last = await getJson('last');
  saveJson(last);
  const { numeroSorteo, dia } = last;
  if (numeroSorteo) {
    for (let sorteo = last.numeroSorteo - 1; flag; --sorteo) {
      const json = await getJson(sorteo);
      saveJson(json);
    }
  } else if (dia) {
    let sorteo = last.manana.numeroSorteo - 1;
    while (flag) {
      const json = await getJson(sorteo);
      saveJson(json);
      sorteo = json.manana.numeroSorteo - 1;
    }
  } else {
    console.info(`\t> No data available`);
  }
};

const processData = (product) => {
  console.info(`\t> Processing data`);
  const files = fs.readdirSync(`${DATA}/${product}`);
  const data = {};
  files.forEach((file) => {
    const { numeroSorteo, numeros, numerosRevancha, premios, tipoSorteoName } = JSON.parse(
      fs.readFileSync(`${DATA}/${product}/${file}`),
    );
    if (numerosRevancha) {
      // lotto
      data[numeroSorteo] = { n: numeros, r: numerosRevancha };
    } else if (premios && (tipoSorteoName === 'Chances' || tipoSorteoName === 'Lotería Nacional')) {
      data[numeroSorteo] = { n: premios.map((premio) => premio.numero), s: premios.map((premio) => premio.serie) };
    }
  });
  fs.writeFileSync(`./${product}.json`, JSON.stringify(data));
  console.info(`\t\t> Done!`);
};

const fetchAndProcessData = async (db) => {
  // await getData('lotto');
  // db = processData(db, 'lotto');
  // await getData('chances');
  // db = processData(db, 'chances');
  // await getData('loterianacional');
  // db = processData(db, 'loterianacional');
  // await getData('nuevostiempos');
  await getData('tresmonazos');
  return db;
};

const getDataFromDb = (db, sql) => {
  const data = [];
  const select = db.exec(sql);
  if (select.length > 1) {
    const { columns, values } = select;
    values.forEach((row) => {
      const obj = {};
      row.forEach((value, index) => {
        obj[columns[index]] = value;
      });
      data.push(obj);
    });
  }
};

const getDatabase = async (SQL) => {
  let db;
  const dbPath = `${DATA}/${DB}`;
  const dbGzPath = `${dbPath}.gz`;
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else if (fs.existsSync(dbGzPath)) {
    const gzip = zlib.createUnzip();
    const source = fs.createReadStream(dbGzPath);
    const destination = fs.createWriteStream(dbPath);
    await pipeline(source, gzip, destination);
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    const schema = fs.readFileSync(SCHEMA, { encoding: 'utf8' }).toString();
    db = new SQL.Database();
    db.run(schema);
  }
  return db;
};

const compressDatabase = async () => {
  const path = `${DATA}/${DB}`;
  const gzip = zlib.createGzip();
  const source = fs.createReadStream(path);
  const destination = fs.createWriteStream(`${path}.gz`);
  await pipeline(source, gzip, destination);
  fs.unlinkSync(path);
};

const saveDatabase = (db) => {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(`${DATA}/${DB}`, buffer, { encoding: 'utf8' });
};

const PROCESSES = {
  loterias: (db, producto) => {
    const directory = `${DATA}/${producto}`;
    const files = fs.readdirSync(`${directory}`);
    const values = [];
    const contents = [];
    files.forEach((file) => {
      const path = `${directory}/${file}`;
      const content = fs.readFileSync(path);
      contents.push(`('${producto}', '${file}', '${content}')`);
      const json = JSON.parse(content);
      const { fecha, numeroSorteo, premios } = json;
      const vals = premios.map(
        ({ orden, numero, serie }) => `('${producto}', '${fecha}', ${numeroSorteo}, ${orden}, ${numero}, ${serie})`,
      );
      values.push(...vals);
    });
    if (values.length > 0) {
      const sql = `INSERT INTO loterias (producto, fecha, sorteo, orden, numero, serie) VALUES ${values.join(',')}`;
      db.run(sql);
    }
    if (contents.length > 0) {
      const sql = `INSERT INTO archivos (producto, nombre, contenido) VALUES ${contents.join(',')}`;
      db.run(sql);
    }
    return db;
  },
  lottos: (db) => {
    const directory = `${DATA}/lotto`;
    const files = fs.readdirSync(`${directory}`);
    const values = [];
    const contents = [];
    files.forEach((file) => {
      const path = `${directory}/${file}`;
      const content = fs.readFileSync(path);
      contents.push(`('lotto', '${file}', '${content}')`);
      const json = JSON.parse(content);
      const { fecha, numeroSorteo, numeros, numerosRevancha } = json;
      const valuesNumeros = numeros.map((num, ind) => `('${fecha}', ${numeroSorteo}, ${ind + 1}, ${num}, ${false})`);
      const valuesRevancha = numerosRevancha.map(
        (num, ind) => `('${fecha}', ${numeroSorteo}, ${ind + 1}, ${num}, ${true})`,
      );
      values.push(...valuesNumeros, ...valuesRevancha);
    });
    if (values.length > 0) {
      const sql = `INSERT INTO lottos (fecha, sorteo, orden, numero, revancha) VALUES ${values.join(',')}`;
      db.run(sql);
    }
    if (contents.length > 0) {
      const sql = `INSERT INTO archivos (producto, nombre, contenido) VALUES ${contents.join(',')}`;
      db.run(sql);
    }
    return db;
  },
  tiempos: (db) => {
    const directory = `${DATA}/nuevostiempos`;
    const files = fs.readdirSync(`${directory}`);
    const values = [];
    const contents = [];
    files.forEach((file) => {
      const path = `${directory}/${file}`;
      const content = fs.readFileSync(path);
      contents.push(`('nuevostiempos', '${file}', '${content}')`);
      const json = JSON.parse(content);
      const { manana, mediaTarde, tarde } = json;
      let valuesManana = manana
        ? `('manana', '${manana.fecha}', ${manana.numeroSorteo}, ${manana.numero}, ${manana.meganNumero}, ${manana.in_reventado}, '${manana.colorBolita}')`
        : '';
      let valuesMediaTarde = mediaTarde
        ? `('mediaTarde', '${mediaTarde.fecha}', ${mediaTarde.numeroSorteo}, ${mediaTarde.numero}, ${mediaTarde.meganNumero}, ${mediaTarde.in_reventado}, '${mediaTarde.colorBolita}')`
        : '';
      let valuesTarde = tarde
        ? `('tarde', '${tarde.fecha}', ${tarde.numeroSorteo}, ${tarde.numero}, ${tarde.meganNumero}, ${tarde.in_reventado}, '${tarde.colorBolita}')`
        : '';
      values.push(...[valuesManana, valuesMediaTarde, valuesTarde].filter(Boolean).flat());
    });
    if (values.length > 0) {
      const sql = `INSERT INTO tiempos (horario, fecha, sorteo, numero, reventado, mega, color) VALUES ${values.join(',')}`;
      db.run(sql);
    }
    if (contents.length > 0) {
      const sql = `INSERT INTO archivos (producto, nombre, contenido) VALUES ${contents.join(',')}`;
      db.run(sql);
    }
    return db;
  },
  monazos: (db) => {
    const directory = `${DATA}/tresmonazos`;
    const files = fs.readdirSync(`${directory}`);
    const values = [];
    const contents = [];
    files.forEach((file) => {
      const path = `${directory}/${file}`;
      const content = fs.readFileSync(path);
      contents.push(`('tresmonazos', '${file}', '${content}')`);
      const json = JSON.parse(content);
      const { manana, mediaTarde, tarde } = json;
      let valuesManana = manana
        ? manana.numeros.map((num, ind) => `('manana', '${manana.fecha}', ${manana.numeroSorteo}, ${ind + 1}, ${num})`)
        : [];
      let valuesMediaTarde = mediaTarde
        ? mediaTarde.numeros.map(
            (num, ind) => `('mediaTarde', '${mediaTarde.fecha}', ${mediaTarde.numeroSorteo}, ${ind + 1}, ${num})`,
          )
        : [];
      let valuesTarde = tarde
        ? tarde.numeros.map((num, ind) => `('manana', '${tarde.fecha}', ${tarde.numeroSorteo}, ${ind + 1}, ${num})`)
        : [];
      values.push(...[valuesManana, valuesMediaTarde, valuesTarde].filter(Boolean).flat());
    });
    if (values.length > 0) {
      const sql = `INSERT INTO monazos (horario, fecha, sorteo, orden, numero) VALUES ${values.join(',')}`;
      db.run(sql);
    }
    if (contents.length > 0) {
      const sql = `INSERT INTO archivos (producto, nombre, contenido) VALUES ${contents.join(',')}`;
      db.run(sql);
    }
    return db;
  },
};

(async () => {
  try {
    const SQL = await initSqlJs();
    let db = await getDatabase(SQL);
    // db = await fetchAndProcessData(db);
    // await saveDatabase(db);
    // await compressDatabase();
    db = PROCESSES.loterias(db, 'chances');
    db = PROCESSES.loterias(db, 'loterianacional');
    db = PROCESSES.lottos(db);
    db = PROCESSES.tiempos(db);
    db = PROCESSES.monazos(db);
    await saveDatabase(db);
    // await compressDatabase();
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
})();
1;
