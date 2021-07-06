const ndviGee = require('ndvi-gee');
const devKey = require(process.env.GEKEY);

const polygon = [
  {
    id: 'OTyjcMeO039jfg3illSc',
    lat: -13.932756478329273,
    lng: -58.853817994159854
  },

  {
    id: 'cLewtvXoyXS0MKaLY3xj',
    lat: -13.94374420397385,
    lng: -58.85349532654964
  },

  {
    id: '0lKEThC69R1QdAU7dkFk',
    lat: -13.942169490910729,
    lng: -58.81596573691317
  },

  {
    id: 'XtxciaPwwaDvspCx0Z7W',
    lat: -13.931257152803115,
    lng: -58.8162464688904
  }
];

ndviGee.ndviGen(devKey, polygon, 500, 1617753600000, 1620518400000).then((result) => {
  console.log(result);
});
