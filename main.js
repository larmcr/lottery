const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const getData = async (product) => {
  console.info(`\n> Product: '${product}'`);

  const API = `https://integration.jps.go.cr/api/app/${product}`;

  let flag = true;

  const getJson = async (id) => {
    console.info(`\t> Fetching '${id}'`);
    try {
      const response = await fetch(`${API}/${id}`);
      const json = await response.json();
      return json;
    }
    catch (err) {
      flag = false;
      console.info(`\t> ERROR -> ${err}`);
    }
  }

  const saveJson = (json) => {
    const num = json.numeroSorteo;
    const file = `./data/${product}/${num}.json`;
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(json));
      console.info(`\t\t> '${num}' saved`);
    } else {
      flag = false;
      console.info(`\t\t> '${num}' not saved (already exists)`);
    }
  }

  const last = await getJson('last');
  saveJson(last);
  for (let sorteo = last.numeroSorteo - 1; flag; --sorteo) {
    const json = await getJson(sorteo);
    saveJson(json);
  }
}

const processData = (product) => {
  console.info(`\t> Processing data`);
  const files = fs.readdirSync(`./data/${product}`);
  const data = {};
  files.forEach((file) => {
    const { numeroSorteo, numeros, numerosRevancha, premios, tipoSorteoName } = JSON.parse(fs.readFileSync(`./data/${product}/${file}`));
    if (numerosRevancha) { // lotto
      data[numeroSorteo] = { n: numeros, r: numerosRevancha };
    } else if (premios && (tipoSorteoName === 'Chances' || tipoSorteoName === 'Lotería Nacional')) {
      data[numeroSorteo] = { n: premios.map((premio) => premio.numero), s: premios.map((premio) => premio.serie) };
    }
  });
  fs.writeFileSync(`./${product}.json`, JSON.stringify(data));
  console.info(`\t\t> Done!`);
}

(async () => {
  await getData('lotto');
  processData('lotto');
  await getData('chances');
  processData('chances');
  await getData('loterianacional');
  processData('loterianacional');
})();
