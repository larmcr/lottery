const fs = require('fs');
const fetch = require('node-fetch');

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
  for (let sorteo = last.numeroSorteo - 1; flag; --sorteo) {
    const json = await getJson(sorteo);
    fs.writeFileSync(`./data/${json.numeroSorteo}.json`, JSON.stringify(json));
  }
}

const processData = () => {
  const files = fs.readdirSync('./data').filter((file) => !file.includes('all'));
  let all = {};
  files.forEach((file) => {
    const { numeroSorteo, numeros, numerosRevancha} = JSON.parse(fs.readFileSync(`./data/${file}`));
    all[numeroSorteo] = { n: numeros, r: numerosRevancha };
  });
  fs.writeFileSync('./all.json', JSON.stringify(all));
}

(() => {
  getData();
  processData();
})();
