'use strict';
import * as fs from 'fs';
import * as path from 'path';
import { Magic } from 'mmmagic';
import { ExifImage } from 'exif';
import * as _gm from 'gm';
import geolib from 'geolib';
import * as loopback from 'loopback';

const LOCAL_STORAGE_ROOT = './storage';
const LOCAL_STORAGE_PREFIX = 'F';
const LOCAL_STORAGE_CONTAINER_USER = 'F';
const gm = _gm.subClass({imageMagick: true});

var async = require ("async");

export default function (MediaFile) {
  MediaFile.beforeRemote('create', (context, user, next) => {
    context.args.data.created = Date.now();
    context.args.data.updated = context.args.data.created;
    next();
  });

  MediaFile.observe('before save', (ctx, next) => {
    if (ctx.isNewInstance) {
      ctx.instance.created = new Date();
      ctx.instance.updated = ctx.instance.created;
    } else {
      ctx.data.updated = new Date();
    }
    next();
  });

  function _onExifDone (error, exif, cb) {
    var metadata = {};
    if (!error) {
      const gps = exif.gps;
      if (gps) {
        if (gps.GPSLatitude || gps.GPSLongitude ) {
          let auxlat = ""+gps.GPSLatitude[0]+"°" + gps.GPSLatitude[1] + "'"+ gps.GPSLatitude[2] + "\"" + gps.GPSLatitudeRef;
          let auxlng = ""+gps.GPSLongitude[0]+ "°" + gps.GPSLongitude[1]+"'"+ gps.GPSLongitude[2] + "\"" + gps.GPSLongitudeRef;
          metadata.lat = geolib.sexagesimal2decimal(auxlat);
          metadata.lng = geolib.sexagesimal2decimal(auxlng);
        } 
      } else {
        // Not GPS info
        console.log("Sin GPS")

      }
      cb(null, metadata);
    } else {
      cb(null, {});
    }
  }

  function _saveMediaFile(data, cb) {
    MediaFile.create ({
      ...data, 
      name: data.name,
      type: data.type,
      format: data.format,
      mediableId: data.mediableId,
      mediableType: data.mediableType,
      //authorId: data.userId,
      authorId: data.userId,
      container: data.folder,
      targetName: data.filename,
      lat: (data.metadata.lat) ? data.metadata.lat: -1,
      lng: (data.metadata.lng) ? data.metadata.lng: -1,
      path: data.fullPath, 
      url: "/Containers/"+data.containerPath+"/download/" + data.name,
    }, (error, inst) => {
        if (!error) {
          cb(null, inst);
        } else {
          cb(error);
        }
    });
  }
  function _readAsync(data, cb) {
    const file = data.file;
    const now = Date.now();
    const newName = 'item' + now;

    //const folder = path.join (LOCAL_STORAGE_ROOT, data.containerPath, file.name);
    const folder = path.join (LOCAL_STORAGE_ROOT, data.containerPath);
    fs.rename ( path.join(folder, file.name), path.join(folder, newName), error => {
      if (!error) {
        // Checking metadata
        const fullPath = path.join (folder, newName);
        gm(fullPath).format ((error, format) => {
          if (!error) {
            // Checking Exif 
            new ExifImage ({image: fullPath }, (error, exifData) => {
              _onExifDone (error, exifData, (error, metadata) => {
                  const dataInst= {
                    format : format,
                    name: newName,
                    filename: file.name,
                    metadata: metadata,
                    fullPath: fullPath,
                    containerPath: data.containerPath,
                    folder: folder,
                    type: file.type,
                    mediableType: data.mediableType,
                    mediableId: data.mediableId
                  };
                  _saveMediaFile(dataInst, (error, instance) => {
                    if (!error) {
                      cb (null, instance);
                    } else {
                      cb (error);
                    }
                  });
              });
            });
          } else {
            // Error GM
            cb(error);
          }
        });
      } else {
        console.log("ERROR RENAMIGN")
        cb(error);
      }
    });
  }

  function _doUpload(context, options, cb) {
    const Container = MediaFile.app.models.Container;
    console.log("Trying to upload");
    Container.upload (context.req, context.res, (error, body) => {
      console.log("Hola mundo --- ");
      if (!error) {
        if (body.files.thefiles !== undefined) {
          var bodyFiles = [];
          body.files.thefiles.forEach (f=>{
            bodyFiles.push({
              containerPath: options.containerPath,
              file: f,
              mediableId: options.mediableId,
              mediableType: options.mediableType,
              userId: ""+context.req.accessToken.userId
            });
          });

          async.map (bodyFiles, _readAsync, function (error, res) {
            if (!error) {
              cb(null, res);
            } else {
              cb(error);
            }
          });
        } else {
          console.log("Not the name")
          cb(new Error("Field 'thefiles' is empty"));
        }
      } else {
        console.log(error);
        console.log("DO UPLOAD FAILED");
        cb(error, {});
      }
    });
  };

  function onDoUploadDone(error, files, cb) { 
    if (!error) {
      cb(null, files);
    } else {
      cb(error);
    }
  };

  MediaFile.upload = (ctx, options, cb) => {
    const Container = MediaFile.app.models.Container;
    var folder = LOCAL_STORAGE_CONTAINER_USER;
    
    ctx.req.params.container = folder;
    options.containerPath = folder;
    Container.getContainer (folder, (error, res) => { 
      if (!error) {
        _doUpload(ctx, options, (error, files) =>{
          onDoUploadDone(error, files, cb);
        });
      } else {
        Container.createContainer ({ name: folder }, (error, container) => {
          if (!error) {
            _doUpload(ctx, options, (error, files) =>{
              onDoUploadDone(error, files, cb);
            });
          } else {
            cb(error);
          }
        });
      }
    });
  };

  MediaFile.remoteMethod("url", {
    "description": "Get URL for a mediafile",
    accepts: [
      { arg: 'context', type: 'object', http: { source:'context' } },
      { arg: 'filename', type: 'object', http:{ source: 'query'} }
    ],
    returns: {
      arg: "url", type: "string", root: true
    },
    http: {verb: "get"}
  });

  MediaFile.download = function (id,context, cb) {
    MediaFile.findOne({where: {id: id}}, function (error, res) {
      var Container = MediaFile.app.models.Container;
      //console.log(res);
      if (!error) {
        cb(null, {download: "/Containers/"+ res.container+"/download/"+res.targetName});
      } else {
        cb(null, {download: ""});
      }
    }); 
  }
};

