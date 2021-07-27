const ndviGee = require('ndvi-gee');
const devKey = require(process.env.GEKEY);

const polygon = [
  {
    lat: 27.888807653809973,
    lng: -80.62262288406416
  },

  {
    lat: 27.866105444225745,
    lng: -80.62282725565235
  },

  {
    lat: 27.866415627190747,
    lng: -80.67262206251358
  },

  {
    lat: 27.889321367722737,
    lng: -80.67230056069523
  }
];

// ndviGee.ndviGen(devKey, polygon, 500, 1617753600000, 1620518400000).then((result) => {
//   console.log(result);
// });

ndviGee.rgbGen(devKey, polygon, 500, 1617753600000, 1620518400000).then((result) => {
  console.log(result);
});
