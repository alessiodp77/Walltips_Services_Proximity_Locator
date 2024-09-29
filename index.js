process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const express = require('express');
const { Pool } = require('pg');
const os = require('os');

  var _user,_host,_database,_password,_port = '';
  _user = process.env.DB_USER;
  _host = process.env.DB_HOST;
  _database = process.env.DB_DATABASE;
  _password = process.env.DB_PASSWORD;
  _port = process.env.DB_PORT;
// Configura la connessione a PostgreSQL
const pool = new Pool({
    user: _user,
    host: _host,
    database: _database,
    password: _password,
    port: _port,
  });

  const app = express();
  app.use(express.json());
  
  // Funzione per ottenere le esperienze vicine
  //42.15928642997896, 12.21993182592294
  const getServices = async (latitude, longitude,max_distance,distance_unit) => {
    try {
        if (distance_unit === 'km') {
          const kmToDegreesLat = 1 / 111.32;  // 1 degree of latitude ≈ 111.32 km
          const kmToDegreesLon = 1 / (111.32 * Math.cos(latitude * (Math.PI / 180)));  // Adjust for latitude

          // Use the smaller of the latitude/longitude conversion for maxDistance
          max_distance = Math.min(max_distance * kmToDegreesLat, max_distance * kmToDegreesLon);
      }
      
          var maxDistance = max_distance; // Distanza massima (es. 0.1 gradi, circa 11 km)  
          const query = 
          
          `SELECT *, distanza_km
          FROM (
            SELECT *,
              ( 6371 * acos(
                  cos(radians(CAST($1 AS FLOAT8))) 
                  * cos(radians(CAST(latitude AS FLOAT8))) 
                  * cos(radians(CAST(longitude AS FLOAT8)) - radians(CAST($2 AS FLOAT8))) 
                  + sin(radians(CAST($1 AS FLOAT8))) 
                  * sin(radians(CAST(latitude AS FLOAT8)))
                )
              ) AS distanza_km 
              FROM "DWH"."services"
                WHERE
                CASE 
                WHEN latitude ~ '^[0-9]+(\.[0-9]+)?$' THEN CAST(latitude AS FLOAT8)
                ELSE NULL
                END BETWEEN CAST($1 AS FLOAT8) - CAST($3 AS FLOAT8) 
                AND CAST($1 AS FLOAT8) + CAST($3 AS FLOAT8)
                AND
                CASE 
                    WHEN longitude ~ '^[0-9]+(\.[0-9]+)?$' THEN CAST(longitude AS FLOAT8)
                    ELSE NULL
                END BETWEEN CAST($2 AS FLOAT8) - CAST($3 AS FLOAT8) 
                AND CAST($2 AS FLOAT8) + CAST($3 AS FLOAT8)
                
            ) AS sottoquery
           
            ORDER BY distanza_km ASC;`
          ;
          
          const result = await pool.query(query, [latitude, longitude, maxDistance]);
          return result.rows;
            console.log("result.rows -->" + result.rows);
          return result.rows;
      } catch (err) {
          console.error(err);
          throw err;
      }
  };
  
  // Route per l'API che utilizza getServices
  app.get('/api/services', async (req, res) => {
      const { lat, lon, max_distance,distance_unit } = req.query;
      if (!lat || !lon) {
          return res.status(400).json({ error: 'Latitudine e longitudine sono richieste' });
      }
  
      try {
          const services = await getServices(parseFloat(lat), parseFloat(lon), max_distance,distance_unit);
          res.json(services);
          console.log("OK");
      } catch (err) {
        console.log("errore");
          res.status(500).json({ error: 'Errore del server' });
      }
  });
  
  // Avvia il server
  const port = process.env.PORT || 3002;
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  }); 