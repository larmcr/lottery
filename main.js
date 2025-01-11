import fs from 'fs-extra';
import initSqlJs from 'sql.js';
import zlib from 'zlib';
import { pipeline } from 'stream/promises';

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const DATA = './data';
const DB = 'database';
const SCHEMA = './sql/schema.sql';
const API = 'https://integration.jps.go.cr/api/app';

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
  // const last = await getJson('last');
  // saveJson(last);
  //const { numeroSorteo, dia } = last;
  const dia = true;
  const numeroSorteo = false;
  if (numeroSorteo) {
    for (let sorteo = last.numeroSorteo - 1; flag; --sorteo) {
      const json = await getJson(sorteo);
      saveJson(json);
    }
  } else if (dia) {
    // let sorteo = last.manana.numeroSorteo - 1;
    let sorteo = 124;
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
  const dbPath = `${DATA}/${DB}.db`;
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
  const path = `${DATA}/${DB}.db`;
  const gzip = zlib.createGzip();
  const source = fs.createReadStream(path);
  const destination = fs.createWriteStream(`${path}.gz`);
  await pipeline(source, gzip, destination);
  fs.unlinkSync(path);
};

const saveDatabase = (db) => {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(`${DATA}/${DB}.db`, buffer, { encoding: 'utf8' });
};

(async () => {
  try {
    const SQL = await initSqlJs();
    let db = await getDatabase(SQL);
    db = await fetchAndProcessData(db);
    // await saveDatabase(db);
    // await compressDatabase();
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
})();
