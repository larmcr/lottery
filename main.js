import fs from 'fs-extra';
import initSqlJs from 'sql.js';
import zlib from 'zlib';
import { pipeline } from 'stream/promises';

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const DATA = './data';
const DB = 'database.db';
const SCHEMA = './sql/schema.sql';
const API = 'https://integration.jps.go.cr/api/app';

const TABLES = {
  chances: 'loterias',
  loterianacional: 'loterias',
  lotto: 'lottos',
  nuevostiempos: 'tiempos',
  tresmonazos: 'monazos',
};

const getData = async (product, latter) => {
  console.info(`\n> Product: '${product}'`);
  console.info(`\t> Last in DB: ${latter}`);
  fs.ensureDirSync(`${DATA}/${product}`);
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
    let sorteo = json.numeroSorteo;
    const manana = json.manana?.numeroSorteo;
    const mediaTarde = json.mediaTarde?.numeroSorteo;
    const tarde = json.tarde?.numeroSorteo;
    const file = sorteo ?? `${manana ?? '_'}-${mediaTarde ?? '_'}-${tarde ?? '_'}`;
    const path = `${DATA}/${product}/${file}.json`;
    flag = !fs.existsSync(path);
    if (flag) {
      if (sorteo) {
        flag = sorteo > latter;
      } else if (manana || mediaTarde || tarde) {
        const arr = [manana, mediaTarde, tarde].filter(Boolean);
        if (arr.length > 0) {
          sorteo = Math.max(...arr);
          flag = sorteo > latter;
        }
      }
    }
    if (flag) {
      fs.writeFileSync(path, JSON.stringify(json));
    }
    console.info(`\t\t> '${file}' ${flag ? 'saved' : 'not saved (already exists)'}`);
  };
  const last = await getJson('last');
  saveJson(last);
  if (flag) {
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
    }
  } else {
    console.info(`\t> No new data available`);
  }
};

const fetchData = async (latters) => {
  await getData('chances', latters.chances);
  await getData('loterianacional', latters.loterianacional);
  await getData('lotto', latters.lotto);
  await getData('nuevostiempos', latters.nuevostiempos);
  await getData('tresmonazos', latters.tresmonazos);
};

const getDataFromDb = (db, sql) => {
  const data = [];
  const select = db.exec(sql);
  if (select.length > 0) {
    const { columns, values } = select[0];
    values.forEach((row) => {
      const obj = {};
      row.forEach((value, index) => {
        obj[columns[index]] = value;
      });
      data.push(obj);
    });
  }
  return data;
};

const getDatabase = async () => {
  let db;
  const dbPath = `${DATA}/${DB}`;
  const dbGzPath = `${dbPath}.gz`;
  const SQL = await initSqlJs();
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
    const schema = fs.readFileSync(SCHEMA).toString();
    db = new SQL.Database();
    db.run(schema);
  }
  return db;
};

const compressDatabase = async () => {
  console.info(`\n> Compressing database...`);
  const path = `${DATA}/${DB}`;
  const gzip = zlib.createGzip();
  const source = fs.createReadStream(path);
  const destination = fs.createWriteStream(`${path}.gz`);
  await pipeline(source, gzip, destination);
  fs.unlinkSync(path);
  console.info(`\t> Database compressed`);
};

const deleteDirectory = (directory) => {
  fs.rmSync(directory, { force: true, recursive: true });
};

const saveDatabase = (db) => {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(`${DATA}/${DB}`, buffer);
};

const storeContents = (db, contents) => {
  if (contents.length > 0) {
    const sql = `INSERT INTO archivos (producto, nombre, contenido) VALUES ${contents.join(',')}`;
    db.run(sql);
  }
};

const PROCESSES = {
  loterias: (db, producto, latter) => {
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
      if (numeroSorteo > latter) {
        const vals = premios.map(
          ({ orden, numero, serie, letra }) => `('${producto}', '${fecha}', ${numeroSorteo}, ${orden}, ${numero}, ${serie}, '${letra ?? ''}')`,
        );
        values.push(...vals);
      }
    });
    if (values.length > 0) {
      const sql = `INSERT INTO loterias (producto, fecha, sorteo, orden, numero, serie, letra) VALUES ${values.join(',')}`;
      db.run(sql);
    }
    storeContents(db, contents);
    deleteDirectory(directory);
    return db;
  },
  lottos: (db, latter) => {
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
      if (numeroSorteo > latter) {
        const valuesNumeros = numeros.map((num, ind) => `('${fecha}', ${numeroSorteo}, ${ind + 1}, ${num}, ${false})`);
        const valuesRevancha = numerosRevancha.map(
          (num, ind) => `('${fecha}', ${numeroSorteo}, ${ind + 1}, ${num}, ${true})`,
        );
        values.push(...valuesNumeros, ...valuesRevancha);
      }
    });
    if (values.length > 0) {
      const sql = `INSERT INTO lottos (fecha, sorteo, orden, numero, revancha) VALUES ${values.join(',')}`;
      db.run(sql);
    }
    storeContents(db, contents);
    deleteDirectory(directory);
    return db;
  },
  tiempos: (db, latter) => {
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
      const valuesManana =
        manana?.numeroSorteo > latter
          ? `('manana', '${manana.fecha}', ${manana.numeroSorteo}, ${manana.numero}, ${manana.meganNumero}, ${manana.in_reventado}, '${manana.colorBolita}')`
          : '';
      const valuesMediaTarde =
        mediaTarde?.numeroSorteo > latter
          ? `('mediaTarde', '${mediaTarde.fecha}', ${mediaTarde.numeroSorteo}, ${mediaTarde.numero}, ${mediaTarde.meganNumero}, ${mediaTarde.in_reventado}, '${mediaTarde.colorBolita}')`
          : '';
      const valuesTarde =
        tarde?.numeroSorteo > latter
          ? `('tarde', '${tarde.fecha}', ${tarde.numeroSorteo}, ${tarde.numero}, ${tarde.meganNumero}, ${tarde.in_reventado}, '${tarde.colorBolita}')`
          : '';
      values.push(...[valuesManana, valuesMediaTarde, valuesTarde].filter(Boolean).flat());
    });
    if (values.length > 0) {
      const sql = `INSERT INTO tiempos (horario, fecha, sorteo, numero, reventado, mega, color) VALUES ${values.join(',')}`;
      db.run(sql);
    }
    storeContents(db, contents);
    deleteDirectory(directory);
    return db;
  },
  monazos: (db, latter) => {
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
      const valuesManana =
        manana?.numeroSorteo > latter
          ? manana.numeros.map(
              (num, ind) => `('manana', '${manana.fecha}', ${manana.numeroSorteo}, ${ind + 1}, ${num})`,
            )
          : [];
      const valuesMediaTarde =
        mediaTarde?.numeroSorteo > latter
          ? mediaTarde.numeros.map(
              (num, ind) => `('mediaTarde', '${mediaTarde.fecha}', ${mediaTarde.numeroSorteo}, ${ind + 1}, ${num})`,
            )
          : [];
      const valuesTarde =
        tarde?.numeroSorteo > latter
          ? tarde.numeros.map((num, ind) => `('manana', '${tarde.fecha}', ${tarde.numeroSorteo}, ${ind + 1}, ${num})`)
          : [];
      values.push(...[valuesManana, valuesMediaTarde, valuesTarde].filter(Boolean).flat());
    });
    if (values.length > 0) {
      const sql = `INSERT INTO monazos (horario, fecha, sorteo, orden, numero) VALUES ${values.join(',')}`;
      db.run(sql);
    }
    storeContents(db, contents);
    deleteDirectory(directory);
    return db;
  },
};

const processFiles = (db, latters) => {
  console.info(`\n> Updating database...`);
  db = PROCESSES.loterias(db, 'chances', latters.chances);
  db = PROCESSES.loterias(db, 'loterianacional', latters.loterianacional);
  db = PROCESSES.lottos(db, latters.lotto);
  db = PROCESSES.tiempos(db, latters.nuevostiempos);
  db = PROCESSES.monazos(db, latters.tresmonazos);
  console.info(`\t> Database updated`);
  return db;
};

const getLatter = (db, product) => {
  const table = `${TABLES[product]}`;
  const where = ['chances', 'loterianacional'].includes(product) ? `WHERE producto = '${product}'` : '';
  const sql = `SELECT MAX(sorteo) AS latter FROM ${table} ${where}`;
  const latter = getDataFromDb(db, sql)[0].latter;
  return latter;
};

const getLatters = (db) => ({
  chances: getLatter(db, 'chances'),
  loterianacional: getLatter(db, 'loterianacional'),
  lotto: getLatter(db, 'lotto'),
  nuevostiempos: getLatter(db, 'nuevostiempos'),
  tresmonazos: getLatter(db, 'tresmonazos'),
});

(async () => {
  let db = await getDatabase();
  const latters = getLatters(db);
  await fetchData(latters);
  db = processFiles(db, latters);
  saveDatabase(db);
  await compressDatabase();
})();
1;
