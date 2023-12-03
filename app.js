#!/usr/bin/env nodejs
/*
 * Geronimo API
 * Copyright 2023 Victor C. Salas (aka nmag) <nmagko@gmail.com>
 *  
 *  This program is distributed WITHOUT ANY WARRANTY; without even the
 *  implied warranty of  MERCHANTABILITY  or FITNESS  FOR A PARTICULAR
 *  PURPOSE.
 *
 */

/* ifndef __API_JS */

/* define __API_JS */

/* Constantes */

/* Del sistema */
const filesys   = require ('fs');
const ifdefw    = function (debu, iout) { if (debu) stdout.write (iout + '\n') };
const EXIT_FAILURE
      = 1;

/* Configuración del sistema */
appcfg          = {};
try {
    appcfg      = JSON.parse(filesys.readFileSync(process.cwd() + '/app.json', 'ascii'));
} catch (e) {
    ifdefw(1, JSON.stringify(e));
    exit(EXIT_FAILURE);
}

/* MongoDB */
const mongocl   = require ('mongodb').MongoClient;
const conn_string
      = "mongodb://" + appcfg.database.user + ":" + appcfg.database.password + "@" +
      appcfg.database.host + ":" + appcfg.database.port + "/" + appcfg.database.name;

/* Express */
const express   = require('express');
const app       = express();
const router    = express.Router();
const port      = appcfg.express.port;

/* Recursos HTTP */
const http      = require ('http');

router.use(express.json());

router.use(function (req, res, next) {
    console.log('/' + req.method);
    next();
});

/* Método post principal solicitado por reto técnico */
router.post('/register', function(req, res){
    let body = "";
    let tipo = req.params.tipo || req.body.tipo || req.query.tipo;
    let ruc = req.params.ruc || req.body.ruc || req.query.ruc;
    let ruc_url = appcfg.getruc.url + "?tipo=" + tipo +
	"&ruc=" + ruc + "&token=" + appcfg.getruc.token
    res.writeHead(200, {'Content-Type': 'application/json'});
    http.get(ruc_url, function (response) {
	response.on ("data", function (chunk) {
	    body += chunk;
	});
	response.on ("end", function () {
	    try {
		/* Aquí debe ir código de la BD */
		mongocl.connect(conn_string, function (db_err, db_cli) {
		    if (db_err != null) {
			body = JSON.stringify({ "error": "Database connection error" });
			res.write(body);
			res.end("\n");
		    } else {
			let db = db_cli.db(appcfg.database.name);
			/* Convirtiendo data recibida en objeto JSON */
			let data_recibida = JSON.parse(body);
			let query = { ruc: data_recibida.ruc };
			let update = { $set: data_recibida };
			let options = { upsert: true };
			let collection = db.collection( appcfg.collection[0] );
			if ( data_recibida.success ) { 
			    collection.updateOne( query, update, options );
			}
			/* Monstrando resultado */
			console.log(JSON.stringify(data_recibida));
			res.write(body);
			res.end("\n");
		    }
		});
	    } catch (error) {
		body = JSON.stringify({ "error": error });
		res.write(body);
		res.end("\n");
	    }
	});
    }).on("error", function (error) {
	body = JSON.stringify({ "error": error });
	res.write(body);
	res.end("\n");
    });
});

/* Método GET que KB usará para validar disponibilidad de instancia */
router.get('/', function(req, res){
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.write(JSON.stringify({"success": true, "message": "API up and running"}));
    res.end("\n");
});

/* Binding de aplicación (running) */
app.use('/', router);
app.listen(port, function (req, res) {
    console.log('Escuchando puerto 8080')
});

/* endif __API_JS */
