// Require client library and private key.
import ee = require('@google/earthengine');
import devKey = require('./ndvi-316313-00d8329df0f9.json');

let ndviGen = (
  devKey: any,
  polygon: any,
  pixels: number,
  date1: number,
  date2: number
) => {
  // -----------------------------------------------------------------------------------------------------
  // ---------------------------- Inicializa o client library e o run analysis ---------------------------
  // -----------------------------------------------------------------------------------------------------
  let runAnalysis = () => {
    ee.initialize(
      null,
      null,
      function () {},
      function (e: any) {
        console.error('Initialization error: ' + e);
      }
    );

    // -----------------------------------------------------------------------------------------------------
    // --------------------------- Cálculo do centróide de um polígono qualquer ----------------------------
    // -----------------------------------------------------------------------------------------------------
    let get_polygon_centroid = (pts: any) => {
      let first = pts[0],
        last = pts[pts.length - 1];
      if (first.lng != last.lng || first.lat != last.lat) pts.push(first);
      let area: number = 0,
        lng = 0,
        lat = 0,
        nPts = pts.length,
        p1: { lat: number; lng: number },
        p2: { lng: number; lat: number },
        f: number;
      for (let i = 0, j = nPts - 1; i < nPts; j = i++) {
        p1 = pts[i];
        p2 = pts[j];
        f =
          (p1.lat - first.lat) * (p2.lng - first.lng) -
          (p2.lat - first.lat) * (p1.lng - first.lng);
        area += f;
        lng += (p1.lng + p2.lng - 2 * first.lng) * f;
        lat += (p1.lat + p2.lat - 2 * first.lat) * f;
      }
      f = area * 3;
      return { lng: lng / f + first.lng, lat: lat / f + first.lat };
    };

    // -----------------------------------------------------------------------------------------------------
    // ----- Cálculo das proporções para corrigir a imagem de acordo com suas coordenadas de lng e lat -----
    // -----------------------------------------------------------------------------------------------------

    let coord: any = polygon.map((a: any) => [a.lng, a.lat]);
    let coordLng: any = polygon.map((a: any) => [a.lng]).flat();
    let coordLat: any = polygon.map((a: any) => [a.lat]).flat();

    var maxLng: number = coordLng.reduce(function (a, b) {
      return Math.max(a, b);
    });
    var minLng: number = coordLng.reduce(function (a, b) {
      return Math.min(a, b);
    });
    var maxLat: number = coordLat.reduce(function (a, b) {
      return Math.max(a, b);
    });
    var minLat: number = coordLat.reduce(function (a, b) {
      return Math.min(a, b);
    });

    let deltaLng: number = maxLng - minLng;
    let deltaLat: number = maxLat - minLat;

    console.log('[pixels]... ', pixels);

    let dimensionLng: number = Math.round(pixels);
    let dimensionLat: number = Math.round((pixels * deltaLat) / deltaLng);

    console.log('[lng]... ', dimensionLng);
    console.log('[lat]... ', dimensionLat);

    console.log('[deltaLng, deltaLat]... ', deltaLng, deltaLat);

    let centroidLng: number = get_polygon_centroid(polygon).lng;
    let centroidLat: number = get_polygon_centroid(polygon).lat;

    // -----------------------------------------------------------------------------------------------------
    // ---- Com base nos pontos das coordenadas do talhão, declara o ponto central na lng e lat da foto ----
    // -----------------------------------------------------------------------------------------------------
    let point: any = ee.Geometry.Point([centroidLng, centroidLat]);

    // -----------------------------------------------------------------------------------------------------
    // ------------------------ Importa o Landsat 8 T1_32DAY_NDVI image collection -------------------------
    // -----------------------------------------------------------------------------------------------------
    let l8: any = ee.ImageCollection('LANDSAT/LC08/C01/T1_32DAY_NDVI');

    // -----------------------------------------------------------------------------------------------------
    // ----------------------------------- Definição de paletas de cores -----------------------------------
    // -----------------------------------------------------------------------------------------------------
    const palette: any = {
      default: ['blue', 'white', 'green'],
      green: [
        'FFFFFF',
        'CE7E45',
        'DF923D',
        'F1B555',
        'FCD163',
        '99B718',
        '74A901',
        '66A000',
        '529400',
        '3E8601',
        '207401',
        '056201',
        '004C00',
        '023B01',
        '012E01',
        '011D01',
        '011301'
      ],
      redToGreen: ['ff0000', 'ffff00', '00ff00'],
      mosaic: ['00FFFF', '0000FF']
    };

    // -----------------------------------------------------------------------------------------------------
    // ------------------------------- Converte timestamp em formato de data -------------------------------
    // -----------------------------------------------------------------------------------------------------
    let formattedTime: any = (timeRange: any) => {
      let range: any = [];
      for (let i = 0; i < timeRange.length; i++) {
        let unix_timestamp: any = timeRange[i];
        let year = new Date(unix_timestamp).getFullYear();
        let month = new Date(unix_timestamp).getMonth() + 1;
        let day = new Date(unix_timestamp).getDate();
        let formattedTime =
          year + '/' + ('0' + month).slice(-2) + '/' + ('0' + day).slice(-2);
        range.push(formattedTime);
      }
      return range;
    };

    // -----------------------------------------------------------------------------------------------------
    // ---------------------------------------- Cria uma imagem RGB ----------------------------------------
    // -----------------------------------------------------------------------------------------------------
    let rangeDate: any = [date1, date2];
    let startDate: string = formattedTime(rangeDate)[0];
    let endDate: string = formattedTime(rangeDate)[1];

    console.log('[date1, date2]... ', date1, ',', date2);
    console.log('[startDate, endDate]... ', startDate, ',', endDate);

    let image: any = ee.Image(
      l8
        // .filterBounds(point)
        .filterDate(date1, date2)
        .sort('CLOUD_COVER')
        .first()
    );

    let vis: any = image
      .visualize({
        bands: ['NDVI'],
        min: 0.5,
        max: 1,
        opacity: 1, // The opacity of the layer (0.0 is fully transparent and 1.0 is fully opaque)
        palette: palette.green
      })
      .clip(ee.Geometry.Polygon(coord));

    console.log('[centroids -> Lng, Lat]... ', centroidLng, centroidLat);

    console.log(
      '[system:time_start]... ',
      image.getInfo().properties['system:time_start']
    );
    console.log(
      '[system:time_end]... ',
      image.getInfo().properties['system:time_end']
    );

    // -----------------------------------------------------------------------------------------------------
    // -------- Adquire o range de data da foto com menos nuvens que será retornada posteriormente ---------
    // -----------------------------------------------------------------------------------------------------
    let timeRange: any = [
      image.getInfo().properties['system:time_start'],
      image.getInfo().properties['system:time_end']
    ]; // timeRange has the following format [timeStart, timeEnd]

    console.log(image.getInfo().properties);

    console.log(formattedTime(timeRange));

    // -----------------------------------------------------------------------------------------------------
    // ----------------------------------------- Gera link da foto -----------------------------------------
    // -----------------------------------------------------------------------------------------------------
    console.log(
      vis.getThumbURL({
        dimensions: [dimensionLng, dimensionLat],
        region: ee.Geometry.Polygon(coord)
      })
    );
  };

  // -----------------------------------------------------------------------------------------------------
  // ------------------------------- Autenticação usando o service account -------------------------------
  // -----------------------------------------------------------------------------------------------------
  ee.data.authenticateViaPrivateKey(devKey, runAnalysis, function (e: any) {
    console.error('Authentication error: ' + e);
  });
};

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

ndviGen(devKey, polygon, 500, 1617753600000, 1620518400000);
