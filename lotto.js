const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const getData = async () => {
  const API = 'https://integration.jps.go.cr/api/app/lotto';
  let flag = true;
  const getJson = async (id) => {
    console.info(`Fetching '${id}'`);
    try {
      const response = await fetch(`${API}/${id}`);
      const json = await response.json();
      return json;
    }
    catch(err) {
      flag = false;
      console.info('ERROR ->', err);
    }
  }
  const last = await getJson('last');
  fs.writeFileSync(`./data/${last.numeroSorteo}.json`, JSON.stringify(last));
  const max = last.numeroSorteo - 1;
  for (let sorteo = max; flag; --sorteo) {
    const json = await getJson(sorteo);
    fs.writeFileSync(`./data/${json.numeroSorteo}.json`, JSON.stringify(json));
  }
}

const processData = () => {
  const files = fs.readdirSync('./data');
  let lottos = {};
  files.forEach((file) => {
    const { numeroSorteo, numeros, numerosRevancha} = JSON.parse(fs.readFileSync(`./data/${file}`));
    lottos[numeroSorteo] = { n: numeros, r: numerosRevancha };
  });
  fs.writeFileSync('./lotto.json', JSON.stringify(lottos));
}

(async () => {
  // await getData();
  processData();
})();
